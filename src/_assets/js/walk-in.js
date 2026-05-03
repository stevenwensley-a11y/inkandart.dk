/**
 * Walk-in client. Fetches /api/status, mutates DOM, falls back gracefully.
 *
 * Truthfulness contract:
 *   - Never invents an "open" state. If the API fails, leave the
 *     server-rendered fallback text in place.
 *   - Never shows a specific artist's availability — too risky to be wrong.
 *   - If status is stale (>5 min), append a hint so the user knows.
 */
(function () {
  'use strict';

  var lang = document.documentElement.lang || 'da';
  var statusStamp = document.querySelector('[data-status-stamp]');
  var statusText  = document.querySelector('[data-status-text]');
  var statusLive  = document.querySelector('[data-status-live]');

  var labels = {
    da: { open: 'ÅBEN NU', closed: 'LUKKET', nextSlot: 'LEDIG', stale: '(status nogle min. gammel)' },
    en: { open: 'OPEN NOW', closed: 'CLOSED', nextSlot: 'NEXT SLOT', stale: '(status a few min. old)' }
  };

  fetch('/api/status', { headers: { 'Accept': 'application/json' } })
    .then(function (r) { if (!r.ok) throw new Error('http ' + r.status); return r.json(); })
    .then(function (s) {
      var lbl = labels[lang] || labels.da;
      var line = s.open
        ? (lbl.open + (s.nextSlot ? ' · ' + lbl.nextSlot + ' ' + s.nextSlot : ''))
        : lbl.closed;
      if (s.stale) line += ' ' + lbl.stale;
      if (statusStamp) statusStamp.textContent = line;
      if (statusText)  statusText.textContent  = line;
      if (statusLive)  statusLive.textContent  = '● ' + line;
    })
    .catch(function () {
      /* Leave server-rendered fallback in place — no error UI. */
    });
})();
