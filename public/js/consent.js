/* FitToSurf — gestion du consentement cookies (RGPD / CNIL), vanilla JS.
 * - Consent Mode v2 initialisé "denied" par défaut dans le <head>.
 * - GA4 n'est chargé QUE si l'utilisateur accepte.
 * - Choix stocké en localStorage, redemandé après 6 mois. */
(function () {
  'use strict';

  var GA_ID = 'G-YRS2VK0RGW';
  var STORAGE_KEY = 'fittosurf_consent';
  var SIX_MONTHS_MS = 1000 * 60 * 60 * 24 * 182; // ~6 mois
  var HIDE_DELAY_MS = 400; // doit correspondre à la transition CSS

  var gaLoaded = false;
  var banner = document.getElementById('consentBanner');

  // --- localStorage helpers ---
  function readConsent() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      var data = JSON.parse(raw);
      if (!data || !data.value || !data.date) return null;
      if (Date.now() - data.date > SIX_MONTHS_MS) return null; // expiré → redemander
      return data.value; // 'granted' | 'denied'
    } catch (e) {
      return null;
    }
  }

  function storeConsent(value) {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ value: value, date: Date.now() })
      );
    } catch (e) {
      /* localStorage indisponible — on ne bloque pas la navigation */
    }
  }

  // --- Google Analytics 4 ---
  function loadGA() {
    if (gaLoaded) return;
    gaLoaded = true;
    var s = document.createElement('script');
    s.async = true;
    s.src = 'https://www.googletagmanager.com/gtag/js?id=' + GA_ID;
    document.head.appendChild(s);
    gtag('js', new Date());
    gtag('config', GA_ID);
  }

  function grant() {
    gtag('consent', 'update', { analytics_storage: 'granted' });
    loadGA(); // envoie automatiquement le page_view
  }

  // Supprime les cookies déposés par GA (utile si l'utilisateur retire son
  // consentement après l'avoir accordé).
  function deleteGaCookies() {
    var names = document.cookie
      .split(';')
      .map(function (c) { return c.split('=')[0].trim(); })
      .filter(function (n) {
        return n === '_ga' || n.indexOf('_ga_') === 0 || n === '_gid' || n === '_gat';
      });
    var host = location.hostname;
    var domains = [host, '.' + host];
    var parts = host.split('.');
    if (parts.length > 2) domains.push('.' + parts.slice(-2).join('.')); // ex .fittosurf.fr
    names.forEach(function (name) {
      document.cookie = name + '=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
      domains.forEach(function (d) {
        document.cookie =
          name + '=; path=/; domain=' + d + '; expires=Thu, 01 Jan 1970 00:00:00 GMT';
      });
    });
  }

  function deny() {
    gtag('consent', 'update', { analytics_storage: 'denied' });
    deleteGaCookies();
  }

  // --- Bannière ---
  function showBanner() {
    if (!banner) return;
    banner.hidden = false;
    // laisser le navigateur peindre l'état initial avant de transitionner
    requestAnimationFrame(function () {
      banner.classList.add('is-visible');
    });
  }

  function hideBanner() {
    if (!banner) return;
    banner.classList.remove('is-visible');
    window.setTimeout(function () {
      banner.hidden = true;
    }, HIDE_DELAY_MS);
  }

  // --- Wiring ---
  function onAccept() {
    storeConsent('granted');
    grant();
    hideBanner();
  }

  function onRefuse() {
    storeConsent('denied');
    deny();
    hideBanner();
  }

  var acceptBtn = document.getElementById('consentAccept');
  var refuseBtn = document.getElementById('consentRefuse');
  var manageBtn = document.getElementById('manageCookies');

  if (acceptBtn) acceptBtn.addEventListener('click', onAccept);
  if (refuseBtn) refuseBtn.addEventListener('click', onRefuse);
  if (manageBtn) manageBtn.addEventListener('click', showBanner);

  // Événement de conversion, appelé par le formulaire (main.js).
  // N'envoie rien si le consentement n'a pas été accordé (GA non chargé).
  window.fittosurfTrackLead = function () {
    if (gaLoaded && typeof gtag === 'function') {
      gtag('event', 'generate_lead');
    }
  };

  // --- Décision au chargement ---
  var stored = readConsent();
  if (stored === 'granted') {
    grant(); // applique sans réafficher la bannière
  } else if (stored === 'denied') {
    /* refus déjà enregistré : on reste "denied", pas de bannière */
  } else {
    showBanner(); // aucun choix valide → demander
  }
})();
