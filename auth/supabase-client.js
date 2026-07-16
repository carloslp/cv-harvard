function readConfig(name) {
  const metaValue = document.querySelector(`meta[name="${name}"]`)?.content?.trim();
  if (metaValue) return metaValue;

  const envKey = name.toUpperCase().replace(/-/g, '_');
  const globalValue = window[envKey];
  if (typeof globalValue === 'string' && globalValue.trim()) {
    return globalValue.trim();
  }

  const storageValue = window.localStorage.getItem(envKey);
  if (storageValue && storageValue.trim()) {
    return storageValue.trim();
  }

  throw new Error(`Missing configuration for ${name}`);
}

function getSettings() {
  const url = readConfig('supabase-url').replace(/\/$/, '');
  const anonKey = readConfig('supabase-anon-key');
  const localStorageKey = `supabase.session.${url}`;

  return { url, anonKey, localStorageKey };
}

function getStorage() {
  return window.localStorage;
}

function nowInSeconds() {
  return Math.floor(Date.now() / 1000);
}

function readSession(key) {
  const raw = getStorage().getItem(key);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw);
  } catch {
    getStorage().removeItem(key);
    return null;
  }
}

function writeSession(key, value) {
  if (!value) {
    getStorage().removeItem(key);
    return;
  }

  getStorage().setItem(key, JSON.stringify(value));
}

function isExpired(session) {
  return typeof session.expires_at === 'number' && nowInSeconds() >= session.expires_at;
}

function wasRecentlyValidated(session) {
  return (
    typeof session.validated_at === 'number' &&
    nowInSeconds() - session.validated_at < 60
  );
}

function calculateExpirationTime(payload) {
  if (typeof payload.expires_at === 'number') {
    return payload.expires_at;
  }

  if (typeof payload.expires_in === 'number') {
    return nowInSeconds() + payload.expires_in;
  }

  return null;
}

function normalizeSession(payload) {
  if (!payload || typeof payload !== 'object') {
    return null;
  }

  const expiresAt = calculateExpirationTime(payload);

  if (typeof payload.access_token !== 'string' || !payload.access_token) {
    return null;
  }

  return {
    access_token: payload.access_token,
    refresh_token: payload.refresh_token || null,
    token_type: payload.token_type || null,
    expires_at: expiresAt,
    user: payload.user || null,
    validated_at: nowInSeconds(),
  };
}

async function parseJsonResponse(response) {
  try {
    return await response.json();
  } catch {
    return {
      message: 'La respuesta de Supabase Auth no se pudo interpretar.',
    };
  }
}

function createTableQuery(settings, token, table) {
  const authHeader = ['Bearer', token].join(' ');
  const baseHeaders = {
    apikey: settings.anonKey,
    Authorization: authHeader,
    'Content-Type': 'application/json',
  };
  const filters = [];

  const query = {
    eq(column, value) {
      filters.push(`${encodeURIComponent(column)}=eq.${encodeURIComponent(value)}`);
      return query;
    },

    async select(columns) {
      const cols = columns || '*';
      let url = `${settings.url}/rest/v1/${table}?select=${encodeURIComponent(cols)}`;
      if (filters.length > 0) {
        url += '&' + filters.join('&');
      }
      let response;
      try {
        response = await fetch(url, { headers: baseHeaders });
      } catch {
        return { data: null, error: { message: 'No se pudo conectar con Supabase.' } };
      }

      let body;
      try {
        body = await response.json();
      } catch {
        return { data: null, error: { message: 'Respuesta inesperada de Supabase.' } };
      }

      if (!response.ok) {
        return { data: null, error: body };
      }
      return { data: body, error: null };
    },

    async upsert(row) {
      let response;
      try {
        response = await fetch(`${settings.url}/rest/v1/${table}`, {
          method: 'POST',
          headers: {
            ...baseHeaders,
            Prefer: 'resolution=merge-duplicates,return=representation',
          },
          body: JSON.stringify(row),
        });
      } catch {
        return { data: null, error: { message: 'No se pudo conectar con Supabase.' } };
      }

      let body;
      try {
        body = await response.json();
      } catch {
        return { data: null, error: { message: 'Respuesta inesperada de Supabase.' } };
      }

      if (!response.ok) {
        return { data: null, error: body };
      }
      return { data: Array.isArray(body) ? body[0] : body, error: null };
    },
  };

  return query;
}

export function getSupabaseClient() {
  const settings = getSettings();

  return {
    from(table) {
      const session = readSession(settings.localStorageKey);
      const token = session?.access_token || settings.anonKey;
      return createTableQuery(settings, token, table);
    },

    auth: {
      async getSession() {
        const session = readSession(settings.localStorageKey);
        if (!session?.access_token) {
          return { data: { session: null } };
        }

        if (isExpired(session)) {
          writeSession(settings.localStorageKey, null);
          return { data: { session: null } };
        }

        if (wasRecentlyValidated(session)) {
          return { data: { session } };
        }

        const response = await fetch(`${settings.url}/auth/v1/user`, {
          headers: {
            apikey: settings.anonKey,
            Authorization: ['Bearer', session.access_token].join(' '),
          },
        });

        if (!response.ok) {
          writeSession(settings.localStorageKey, null);
          return { data: { session: null } };
        }

        const validatedSession = {
          ...session,
          validated_at: nowInSeconds(),
        };
        writeSession(settings.localStorageKey, validatedSession);

        return { data: { session: validatedSession } };
      },

      async signInWithPassword({ email, password }) {
        let response;
        try {
          response = await fetch(`${settings.url}/auth/v1/token?grant_type=password`, {
            method: 'POST',
            headers: {
              apikey: settings.anonKey,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, password }),
          });
        } catch {
          return {
            error: { message: 'No se pudo conectar con Supabase Auth.' },
            data: { session: null },
          };
        }

        const data = await parseJsonResponse(response);
        if (!response.ok) {
          return {
            error: {
              message:
                data.error_description ||
                data.message ||
                'No se pudo iniciar sesión.',
            },
            data: { session: null },
          };
        }

        const session = normalizeSession(data);
        if (!session) {
          return {
            error: { message: 'La sesión devuelta por Supabase Auth no es válida.' },
            data: { session: null },
          };
        }

        writeSession(settings.localStorageKey, session);
        return { data: { session }, error: null };
      },

      async signOut() {
        writeSession(settings.localStorageKey, null);
        return { error: null };
      },
    },
  };
}
