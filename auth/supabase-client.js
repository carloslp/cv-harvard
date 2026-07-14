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
  const sessionStorageKey = `cv-harvard.supabase.session.${url}`;

  return { url, anonKey, sessionStorageKey };
}

function readSession(key) {
  const raw = window.localStorage.getItem(key);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw);
  } catch {
    window.localStorage.removeItem(key);
    return null;
  }
}

function writeSession(key, value) {
  if (!value) {
    window.localStorage.removeItem(key);
    return;
  }

  window.localStorage.setItem(key, JSON.stringify(value));
}

export function getSupabaseClient() {
  const settings = getSettings();

  return {
    auth: {
      async getSession() {
        const session = readSession(settings.sessionStorageKey);
        if (!session?.access_token) {
          return { data: { session: null } };
        }

        const response = await fetch(`${settings.url}/auth/v1/user`, {
          headers: {
            apikey: settings.anonKey,
            Authorization: 'Bearer ' + session.access_token,
          },
        });

        if (!response.ok) {
          writeSession(settings.sessionStorageKey, null);
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

        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          return {
            error: {
              message: data.error_description || data.msg || 'No se pudo iniciar sesión.',
            },
            data: { session: null },
          };
        }

        writeSession(settings.sessionStorageKey, data);
        return { data: { session: data }, error: null };
      },

      async signOut() {
        writeSession(settings.sessionStorageKey, null);
        return { error: null };
      },
    },
  };
}
