(function() {
  'use strict';
  const STORAGE_KEY = 'inkandart-consent-v1';
  const banner = document.getElementById('cookie-banner');
  const stored = localStorage.getItem(STORAGE_KEY);

  // Default-denied Consent Mode v2 — must run before any analytics loads
  window.dataLayer = window.dataLayer || [];
  function gtag() { dataLayer.push(arguments); }
  gtag('consent', 'default', {
    ad_storage: 'denied',
    analytics_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
    wait_for_update: 500
  });

  if (!stored && banner) {
    banner.hidden = false;
  }

  if (banner) {
    banner.addEventListener('click', function(e) {
      const choice = e.target && e.target.dataset && e.target.dataset.consent;
      if (!choice) return;
      localStorage.setItem(STORAGE_KEY, choice);
      banner.hidden = true;
      if (choice === 'accept') {
        gtag('consent', 'update', {
          analytics_storage: 'granted'
        });
        // Lazy-load GA4 here when measurement ID is configured (v0.2)
        // Example: const s = document.createElement('script');
        //          s.src = 'https://www.googletagmanager.com/gtag/js?id=G-XXXXXX';
        //          document.head.appendChild(s);
      }
    });
  }
})();
