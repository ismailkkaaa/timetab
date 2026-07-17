/* ============================================================
   install.js — PWA Install Prompt Handler (Landing Page)
   ============================================================ */

const Install = (() => {
  let _deferredPrompt = null;
  let _installBtn     = null;
  let _modal          = null;
  let _modalClose     = null;

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

  /** Update install button appearance based on state */
  function updateButtonState(state) {
    if (!_installBtn) return;
    if (state === 'installed') {
      _installBtn.textContent = '✓ App Installed!';
      _installBtn.disabled = true;
      _installBtn.style.opacity = '0.6';
    } else if (state === 'prompt') {
      _installBtn.textContent = '⬇ Install App';
      _installBtn.disabled = false;
    } else {
      _installBtn.textContent = '📖 How to Install';
      _installBtn.disabled = false;
    }
  }

  /** Initialise event listeners */
  function init() {
    _installBtn  = document.getElementById('install-btn');
    _modal       = document.getElementById('install-modal');
    _modalClose  = document.getElementById('modal-close');

    // Listen for beforeinstallprompt (Chrome/Edge/Android)
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      _deferredPrompt = e;
      updateButtonState('prompt');
    });

    // Already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      updateButtonState('installed');
    }

    // App installed event
    window.addEventListener('appinstalled', () => {
      updateButtonState('installed');
      _deferredPrompt = null;
    });

    // Install button
    if (_installBtn) {
      _installBtn.addEventListener('click', handleInstallClick);
    }

    // Modal close
    if (_modalClose) {
      _modalClose.addEventListener('click', hideModal);
    }

    // Close on backdrop click
    if (_modal) {
      _modal.addEventListener('click', (e) => {
        if (e.target === _modal) hideModal();
      });
    }

    // ESC to close modal
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') hideModal();
    });

    // Register service worker from landing page
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('./sw.js')
        .then(reg => console.log('[SW] Registered from landing:', reg.scope))
        .catch(err => console.warn('[SW] Registration failed:', err));
    }
  }

  return { init };
})();

// Auto-init on DOMContentLoaded
document.addEventListener('DOMContentLoaded', () => Install.init());
