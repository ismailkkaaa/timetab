/* ============================================================
   install.js — PWA Install Prompt Handler (Landing Page)
   Handles: beforeinstallprompt, appinstalled, manual instructions modal,
            SW registration, SW update detection
   ============================================================ */

const Install = (() => {
  let _deferredPrompt = null;
  let _installBtn     = null;
  let _install2Btn    = null;
  let _modal          = null;
  let _modalClose     = null;

  /* ---- Icon SVGs for button states ---- */
  const ICON_DOWNLOAD  = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>`;
  const ICON_CHECK     = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>`;
  const ICON_INFO      = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`;

  /** Detect platform for tailored install instructions */
  function detectPlatform() {
    const ua = navigator.userAgent;
    if (/iPhone|iPad|iPod/i.test(ua))  return 'ios';
    if (/android/i.test(ua))           return 'android';
    return 'desktop';
  }

  /** Build install instruction HTML based on platform */
  function buildInstructions(platform) {
    const steps = {
      ios: [
        'Open this page in <strong>Safari</strong> (required for iOS install).',
        'Tap the <strong>Share</strong> button (square with arrow up) in the toolbar.',
        'Scroll down and tap <strong>"Add to Home Screen"</strong>.',
        'Tap <strong>Add</strong> in the top right. Done!',
      ],
      android: [
        'Open this page in <strong>Chrome</strong>.',
        'Tap the <strong>three-dot menu</strong> (⋮) in the top right.',
        'Tap <strong>"Add to Home Screen"</strong> or <strong>"Install App"</strong>.',
        'Confirm by tapping <strong>Add</strong>. Done!',
      ],
      desktop: [
        'Open this page in <strong>Chrome</strong> or <strong>Edge</strong>.',
        'Look for the <strong>install icon</strong> (⊕) in the address bar.',
        'Click it and select <strong>"Install"</strong>.',
        'The app will open as a standalone window. Done!',
      ],
    };

    return (steps[platform] || steps.desktop)
      .map((text, i) => `
        <div class="install-modal__step">
          <div class="install-modal__step-num">${i + 1}</div>
          <div class="install-modal__step-text">${text}</div>
        </div>
      `).join('');
  }

  /** Show the manual install instructions modal */
  function showModal() {
    if (!_modal) return;
    const platform = detectPlatform();
    const instructions = document.getElementById('install-instructions');
    if (instructions) {
      instructions.innerHTML = buildInstructions(platform);
    }
    _modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
  }

  /** Hide the install modal */
  function hideModal() {
    if (!_modal) return;
    _modal.classList.add('hidden');
    document.body.style.overflow = '';
  }

  /** Handle install button click */
  async function handleInstallClick() {
    if (_deferredPrompt) {
      // Native PWA install prompt available
      _deferredPrompt.prompt();
      const { outcome } = await _deferredPrompt.userChoice;
      console.log('[Install] User choice:', outcome);
      _deferredPrompt = null;

      if (outcome === 'accepted') {
        updateButtonState('installed');
      }
    } else {
      // No native prompt — show manual instructions
      showModal();
    }
  }

  /** Update install button appearance based on state (no emojis) */
  function updateButtonState(state) {
    const btns = [_installBtn, _install2Btn].filter(Boolean);
    btns.forEach(btn => {
      if (state === 'installed') {
        btn.innerHTML = `${ICON_CHECK} App Installed`;
        btn.disabled = true;
        btn.style.opacity = '0.65';
        btn.style.cursor = 'default';
      } else if (state === 'prompt') {
        btn.innerHTML = `${ICON_DOWNLOAD} Install App`;
        btn.disabled = false;
        btn.style.opacity = '';
        btn.style.cursor = '';
      } else {
        // 'manual' — show info icon
        btn.innerHTML = `${ICON_INFO} How to Install`;
        btn.disabled = false;
        btn.style.opacity = '';
        btn.style.cursor = '';
      }
    });
  }

  /* ----------------------------------------------------------------
     Service Worker Registration + Update Detection
     ---------------------------------------------------------------- */
  function registerSW() {
    if (!('serviceWorker' in navigator)) return;

    navigator.serviceWorker.register('./sw.js', { scope: './' })
      .then((reg) => {
        console.log('[SW] Registered from landing:', reg.scope);

        // Detect when a new SW is waiting
        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing;
          if (!newWorker) return;
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // New content available — silently activate (no disruptive toast on landing)
              console.log('[SW] New version available — activating…');
              newWorker.postMessage('SKIP_WAITING');
            }
          });
        });
      })
      .catch((err) => console.warn('[SW] Registration failed:', err));

    // Reload page when the new SW takes control
    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!refreshing) {
        refreshing = true;
        // Don't reload landing — the user is installing/browsing
        // Only reload if they navigate into the app
      }
    });
  }

  /** Initialise event listeners */
  function init() {
    _installBtn  = document.getElementById('install-btn');
    _install2Btn = document.getElementById('install-btn-2');
    _modal       = document.getElementById('install-modal');
    _modalClose  = document.getElementById('modal-close');

    // Listen for beforeinstallprompt (Chrome/Edge/Android)
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      _deferredPrompt = e;
      updateButtonState('prompt');
      console.log('[Install] beforeinstallprompt captured');
    });

    // Already running as installed PWA
    if (window.matchMedia('(display-mode: standalone)').matches ||
        window.navigator.standalone === true) {
      updateButtonState('installed');
    }

    // App successfully installed
    window.addEventListener('appinstalled', () => {
      updateButtonState('installed');
      _deferredPrompt = null;
      console.log('[Install] App installed');
    });

    // Install buttons
    [_installBtn, _install2Btn].filter(Boolean).forEach(btn => {
      btn.addEventListener('click', handleInstallClick);
    });

    // Modal close button
    if (_modalClose) {
      _modalClose.addEventListener('click', hideModal);
    }

    // Close on backdrop click
    if (_modal) {
      _modal.addEventListener('click', (e) => {
        if (e.target === _modal) hideModal();
      });
    }

    // ESC key closes modal
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') hideModal();
    });

    // Register service worker
    registerSW();
  }

  return { init, showModal, hideModal };
})();

// Auto-init on DOMContentLoaded
document.addEventListener('DOMContentLoaded', () => Install.init());
