/* ============================================================
   notification.js — Bell Notification Logic
   ============================================================ */

import Storage from './storage.js';

const Notification = (() => {
  let _permission = 'default';
  let _enabled    = false;

  // Track notified period IDs to avoid duplicate fires
  const _notifiedStart  = new Set();
  const _notifiedFive   = new Set();

  /** Initialise — read persisted state */
  function init() {
    _enabled    = Storage.get('notifications');
    _permission = getPermission(); // call local function, not self-reference
  }

  /** Get actual browser notification permission */
  function getPermission() {
    if (!('Notification' in window)) return 'denied';
    return window.Notification.permission;
  }

  /**
   * Request browser notification permission (lazy — only called when user enables toggle).
   * Returns 'granted' | 'denied' | 'default'.
   */
  async function requestPermission() {
    if (!('Notification' in window)) return 'denied';
    if (window.Notification.permission === 'granted') return 'granted';

    const result = await window.Notification.requestPermission();
    _permission = result;
    Storage.set('notifPermission', result);
    return result;
  }

  /** Show a browser notification if granted + enabled */
  function show(title, body, icon = './assets/logo.svg') {
    if (!_enabled) return;
    if (_permission !== 'granted') return;

    try {
      new window.Notification(title, {
        body,
        icon,
        badge: './assets/logo.svg',
        silent: !Storage.get('notificationSound'),
        tag:    title, // deduplication tag
      });
    } catch (e) {
      console.warn('[Notification] Could not show:', e);
    }
  }

  /** Called by timer.js when a period starts */
  function onPeriodStart(period) {
    if (_notifiedStart.has(period.id)) return;
    _notifiedStart.add(period.id);

    const isBreak = period.type === 'break';
    const isLunch = period.type === 'lunch';

    if (isBreak) {
      show('Break Time', `Break until ${period.end}`);
    } else if (isLunch) {
      show('Lunch Break', `Lunch until ${period.end}`);
    } else {
      show(`${period.subject} Started`, `With ${period.teacher} · ${period.start}–${period.end}${period.room ? ' · ' + period.room : ''}`);
    }
  }

  /** Called by timer.js 5 minutes before a period starts */
  function onFiveMinWarning(period) {
    if (_notifiedFive.has(period.id)) return;
    _notifiedFive.add(period.id);

    if (period.type) return; // Skip break/lunch warnings
    show(`${period.subject} in 5 min`, `${period.teacher} · ${period.start}${period.room ? ' · ' + period.room : ''}`);
  }

  /** Enable or disable notifications — handles permission flow */
  async function setEnabled(value) {
    if (value) {
      const perm = await requestPermission();
      if (perm !== 'granted') {
        Storage.set('notifications', false);
        _enabled = false;
        return false; // Permission denied
      }
    }
    _enabled = value;
    Storage.set('notifications', value);
    return true;
  }

  function isEnabled()    { return _enabled;    }
  function getPermState() { return _permission; }

  return {
    init,
    setEnabled,
    isEnabled,
    getPermission,
    getPermState,
    requestPermission,
    onPeriodStart,
    onFiveMinWarning,
  };
})();

export default Notification;
