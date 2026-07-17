/* ============================================================
   storage.js — LocalStorage Read/Write Helpers
   ============================================================ */

const Storage = (() => {
  const PREFIX = 'timetab_';

  // Default preferences
  const DEFAULTS = {
    theme:              'light',     // 'light' | 'dark'
    notifications:      false,       // bool
    notificationSound:  false,       // bool
    notifPermission:    'default',   // 'default' | 'granted' | 'denied'
    installedAt:        null,        // ISO string
    onboardingDone:     false,       // bool
  };

  /** Read a value from LocalStorage (parses JSON) */
  function get(key) {
    try {
      const raw = localStorage.getItem(PREFIX + key);
      if (raw === null) return DEFAULTS[key] ?? null;
      return JSON.parse(raw);
    } catch {
      return DEFAULTS[key] ?? null;
    }
  }

  /** Write a value to LocalStorage (serialises to JSON) */
  function set(key, value) {
    try {
      localStorage.setItem(PREFIX + key, JSON.stringify(value));
    } catch (e) {
      console.warn('[Storage] Failed to write:', key, e);
    }
  }

  /** Remove a single key */
  function remove(key) {
    localStorage.removeItem(PREFIX + key);
  }

  /** Clear ALL TimeTab keys */
  function clear() {
    Object.keys(localStorage)
      .filter(k => k.startsWith(PREFIX))
      .forEach(k => localStorage.removeItem(k));
  }

  /** Initialise defaults for any missing keys */
  function init() {
    Object.entries(DEFAULTS).forEach(([key, defaultValue]) => {
      if (localStorage.getItem(PREFIX + key) === null) {
        set(key, defaultValue);
      }
    });
  }

  return { get, set, remove, clear, init };
})();

export default Storage;
