(function () {
  'use strict';

  var page = window.location.pathname.split('/').pop() || 'index.html';

  var header = '<header class="site-header is-dark" id="site-header">' +
    '<nav class="nav" aria-label="Main navigation">' +
      '<div class="nav__left">' +
        '<a href="menu.html" class="nav__link" data-nav="menu.html">Menu</a>' +
        '<a href="catering.html" class="nav__link" data-nav="catering.html">Catering</a>' +
        '<a href="wholesale.html" class="nav__link" data-nav="wholesale.html">Wholesale</a>' +
      '</div>' +
      '<div class="nav__logo">' +
        '<a href="index.html" aria-label="Copain Bakery \u2014 Home">' +
          '<img src="images/logos/logo-full-black.png" alt="Copain Bakery &amp; Provisions" id="nav-logo" width="200" height="55" />' +
        '</a>' +
      '</div>' +
      '<div class="nav__right">' +
        '<a href="locations.html" class="nav__link" data-nav="locations.html">Locations</a>' +
        '<a href="about.html" class="nav__link" data-nav="about.html">About</a>' +
        '<div class="nav__actions">' +
          '<a href="#order" class="btn btn--filled btn--sm" data-order-modal aria-haspopup="dialog">Order Now</a>' +
        '</div>' +
        '<button class="nav__mobile-toggle" aria-label="Open menu" aria-expanded="false" aria-controls="mobile-nav">' +
          '<span></span><span></span><span></span>' +
        '</button>' +
      '</div>' +
    '</nav>' +
  '</header>';

  var mobileNav = '<nav class="mobile-nav" id="mobile-nav" aria-label="Mobile navigation">' +
    '<button class="mobile-nav__close" aria-label="Close menu">Close</button>' +
    '<a href="menu.html" class="mobile-nav__link" data-nav="menu.html">Menu</a>' +
    '<a href="locations.html" class="mobile-nav__link" data-nav="locations.html">Locations</a>' +
    '<a href="catering.html" class="mobile-nav__link" data-nav="catering.html">Catering</a>' +
    '<a href="wholesale.html" class="mobile-nav__link" data-nav="wholesale.html">Wholesale</a>' +
    '<a href="about.html" class="mobile-nav__link" data-nav="about.html">About</a>' +
    '<div class="mobile-nav__actions">' +
      '<a href="#order" class="btn btn--ghost" data-order-modal>Order Now</a>' +
      '<a href="locations.html" class="btn btn--ghost">Visit Us</a>' +
    '</div>' +
  '</nav>';

  var navEl = document.getElementById('nav-placeholder');
  var mobileEl = document.getElementById('mobile-nav-placeholder');
  if (navEl) navEl.outerHTML = header;
  if (mobileEl) mobileEl.outerHTML = mobileNav;

  // Mark current page link as active
  document.querySelectorAll('[data-nav]').forEach(function (el) {
    if (el.getAttribute('data-nav') === page) el.classList.add('is-active');
  });
})();
