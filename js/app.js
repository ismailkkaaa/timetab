/* ============================================================
   app.js — App Bootstrap + View Router (app.html)
   ============================================================ */

import Storage     from './storage.js';
import Timer       from './timer.js';
import Timetable   from './timetable.js';
import Notification from './notification.js';

const App = (() => {
  let _currentView = 'home';

  // ----------------------------------------------------------------
  // Theme
  // ----------------------------------------------------------------

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    Storage.set('theme', theme);
  }

  function toggleTheme() {
    const current = Storage.get('theme');
    applyTheme(current === 'dark' ? 'light' : 'dark');
    // Sync toggle UI
    const toggle = document.getElementById('dark-mode-toggle');
    if (toggle) toggle.checked = Storage.get('theme') === 'dark';
  }

  // ----------------------------------------------------------------
  // View Router
  // ----------------------------------------------------------------

  function showView(name) {
    // Hide all views
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    // Show target
    const target = document.getElementById(`view-${name}`);
    if (target) target.classList.add('active');

    // Update nav
    document.querySelectorAll('.nav-item').forEach(item => {
      item.classList.toggle('nav-item--active', item.dataset.view === name);
    });

    _currentView = name;

    // Lazy-load timetable view when first opened
    if (name === 'timetable') {
      loadTimetableView();
    }
  }

  // ----------------------------------------------------------------
  // Timetable View
  // ----------------------------------------------------------------

  let _timetableLoaded = false;

  async function loadTimetableView() {
    if (_timetableLoaded) return;
    const container = document.getElementById('timetable-container');
    if (!container) return;

    container.innerHTML = `<div class="empty-state"><div class="empty-state__icon">⏳</div><div class="empty-state__title">Loading…</div></div>`;
    const data = await Timetable.load();
    Timetable.render(data, container);
    _timetableLoaded = true;
  }

  // ----------------------------------------------------------------
  // Settings
  // ----------------------------------------------------------------

  function initSettings() {
    // Dark Mode toggle
    const darkToggle = document.getElementById('dark-mode-toggle');
    if (darkToggle) {
      darkToggle.checked = Storage.get('theme') === 'dark';
      darkToggle.addEventListener('change', toggleTheme);
    }

    // Bell Notification toggle
    const notifToggle = document.getElementById('notif-toggle');
    if (notifToggle) {
      notifToggle.checked = Storage.get('notifications');
      notifToggle.addEventListener('change', async (e) => {
        const ok = await Notification.setEnabled(e.target.checked);
        if (!ok) {
          notifToggle.checked = false;
          showToast('⚠ Notification permission denied');
        } else {
          showToast(e.target.checked ? '🔔 Notifications enabled' : '🔕 Notifications disabled');
        }
      });
    }

    // Notification Sound toggle
    const soundToggle = document.getElementById('sound-toggle');
    if (soundToggle) {
      soundToggle.checked = Storage.get('notificationSound');
      soundToggle.addEventListener('change', (e) => {
        Storage.set('notificationSound', e.target.checked);
        showToast(e.target.checked ? '🔊 Sound on' : '🔇 Sound off');
      });
    }
  }

  // ----------------------------------------------------------------
  // Toast
  // ----------------------------------------------------------------

  function showToast(message) {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    container.appendChild(toast);

    setTimeout(() => toast.remove(), 3200);
  }

  // Expose globally for use from inline HTML if needed
  window.AppToast = showToast;

  // ----------------------------------------------------------------
  // Service Worker Registration
  // ----------------------------------------------------------------

  function registerSW() {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('./sw.js')
        .then(reg => console.log('[SW] Registered:', reg.scope))
        .catch(err => console.warn('[SW] Failed:', err));
    }
  }

  // ----------------------------------------------------------------
  // Bootstrap
  // ----------------------------------------------------------------

  async function init() {
    Storage.init();
    Notification.init();

    // Apply persisted theme immediately to avoid flash
    applyTheme(Storage.get('theme'));

    // Nav click handlers
    document.querySelectorAll('.nav-item').forEach(item => {
      item.addEventListener('click', () => showView(item.dataset.view));
    });

    // Start on Home
    showView('home');

    // Start live timer
    await Timer.init();

    // Init settings panel
    initSettings();

    // Register service worker
    registerSW();
  }

  return { init, showView, showToast };
})();

// Bootstrap on load
document.addEventListener('DOMContentLoaded', () => App.init());
