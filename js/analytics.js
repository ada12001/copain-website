// Google Analytics 4 (gtag.js) — shared across all pages.
// Loaded high in <head> so pageviews fire on first paint.
(function () {
  'use strict';
  var GA_ID = 'G-91VQXJWXPP';

  var loader = document.createElement('script');
  loader.async = true;
  loader.src = 'https://www.googletagmanager.com/gtag/js?id=' + GA_ID;
  document.head.appendChild(loader);

  window.dataLayer = window.dataLayer || [];
  function gtag() { window.dataLayer.push(arguments); }
  window.gtag = gtag;
  gtag('js', new Date());
  gtag('config', GA_ID);
})();
