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

async function parseJsonResponse(response) {
  try {
    return await response.json();
  } catch {
    return {
      message: 'La respuesta de Supabase Auth no se pudo interpretar.',
    };
  }
}

export function getSupabaseClient() {
  const settings = getSettings();

  return {
    auth: {
      async getSession() {
        const session = readSession(settings.localStorageKey);
        if (!session?.access_token) {
          return { data: { session: null } };
        }

        if (typeof session.expires_at === 'number' && Date.now() >= session.expires_at * 1000) {
          writeSession(settings.localStorageKey, null);
          return { data: { session: null } };
        }

        const response = await fetch(`${settings.url}/auth/v1/user`, {
          headers: {
            apikey: settings.anonKey,
            Authorization: 'Bearer ' + session.access_token,
          },
        });

        if (!response.ok) {
          writeSession(settings.localStorageKey, null);
          return { data: { session: null } };
        }

        return { data: { session } };
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
                data.msg ||
                data.message ||
                'No se pudo iniciar sesión.',
            },
            data: { session: null },
          };
        }

        writeSession(settings.localStorageKey, data);
        return { data: { session: data }, error: null };
      },

      async signOut() {
        writeSession(settings.localStorageKey, null);
        return { error: null };
      },
    },
  };
}
