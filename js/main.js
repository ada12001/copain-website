/* ============================================================
   COPAIN BAKERY & PROVISIONS
   Main JavaScript · 2025
   ============================================================ */

(function () {
  'use strict';

  const LOCATION_STORAGE_KEY = 'copainSelectedLocation';
  const LOCATION_LABELS = {
    all: 'All Locations',
    southpark: 'SouthPark',
    ballantyne: 'Ballantyne',
    winston: 'Winston-Salem'
  };

  function normalizeLocationPreference(value) {
    const normalized = String(value || '').trim().toLowerCase();

    if (normalized === 'winston-salem') return 'winston';
    if (normalized === 'south-park') return 'southpark';
    if (Object.prototype.hasOwnProperty.call(LOCATION_LABELS, normalized)) return normalized;

    return 'all';
  }

  function getStoredLocationPreference() {
    try {
      return normalizeLocationPreference(window.localStorage.getItem(LOCATION_STORAGE_KEY));
    } catch (error) {
      return 'all';
    }
  }

  function setStoredLocationPreference(value) {
    const normalized = normalizeLocationPreference(value);

    try {
      window.localStorage.setItem(LOCATION_STORAGE_KEY, normalized);
    } catch (error) {
      return normalized;
    }

    return normalized;
  }

  /* ── Smooth scroll (Lenis) ─────────────────────────────── */
  if (typeof Lenis !== 'undefined') {
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
    });
    function lenisRaf(time) {
      lenis.raf(time);
      requestAnimationFrame(lenisRaf);
    }
    requestAnimationFrame(lenisRaf);
  }

  /* ── Scroll reveal ─────────────────────────────────────── */
  const revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('in-view');
          revealObserver.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.08, rootMargin: '0px 0px -40px 0px' }
  );

  document.querySelectorAll('.reveal').forEach((el) => revealObserver.observe(el));

  /* ── Anchor deep-link scroll (e.g. menu.html#menu-cafe) ── */
  if (window.location.hash) {
    const target = document.querySelector(window.location.hash);
    if (target) {
      setTimeout(() => {
        const offset = parseInt(
          getComputedStyle(document.documentElement).getPropertyValue('--header-h')
        ) || 80;
        window.scrollTo({
          top: target.getBoundingClientRect().top + window.scrollY - offset - 24,
          behavior: 'smooth'
        });
      }, 100);
    }
  }

  /* ── Header scroll state ───────────────────────────────── */
  const header = document.querySelector('.site-header');
  if (header) {
    const handleScroll = () => {
      header.classList.toggle('is-scrolled', window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
  }

  /* ── Hero image load animation ─────────────────────────── */
  const heroBg = document.querySelector('.hero__bg');
  if (heroBg) {
    if (heroBg.complete) {
      heroBg.classList.add('loaded');
    } else {
      heroBg.addEventListener('load', () => heroBg.classList.add('loaded'));
    }
  }

  /* ── Mobile nav ────────────────────────────────────────── */
  const mobileToggle = document.querySelector('.nav__mobile-toggle');
  const mobileNav = document.querySelector('.mobile-nav');
  const mobileClose = document.querySelector('.mobile-nav__close');

  function openMobileNav() {
    mobileNav.classList.add('is-open');
    document.body.style.overflow = 'hidden';
    mobileToggle.setAttribute('aria-expanded', 'true');
  }

  function closeMobileNav() {
    mobileNav.classList.remove('is-open');
    document.body.style.overflow = '';
    mobileToggle.setAttribute('aria-expanded', 'false');
  }

  if (mobileToggle && mobileNav) {
    mobileToggle.addEventListener('click', openMobileNav);
    if (mobileClose) mobileClose.addEventListener('click', closeMobileNav);

    // Close when a link is tapped
    mobileNav.querySelectorAll('a').forEach((link) => {
      link.addEventListener('click', closeMobileNav);
    });
  }

  /* ── Location / Order modal ─────────────────────────────── */
  const modalOverlay = document.querySelector('.modal-overlay');
  const modalBackdrop = document.querySelector('.modal-overlay__backdrop');
  const modalClose = document.querySelector('.modal__close');
  const orderTriggers = document.querySelectorAll('[data-order-modal]');
  const announcementOverlay = document.querySelector('.announcement-modal-overlay');
  const announcementBackdrop = document.querySelector('.announcement-modal-overlay__backdrop');
  const announcementClose = document.querySelector('.announcement-modal__close');
  const announcementDismissers = document.querySelectorAll('[data-announcement-dismiss]');
  const ANNOUNCEMENT_DISMISS_KEY = 'copainNewLocationAnnouncementDismissedAt';
  const ANNOUNCEMENT_REOPEN_MS = 24 * 60 * 60 * 1000;

  function openModal() {
    if (!modalOverlay) return;
    modalOverlay.classList.add('is-open');
    document.body.style.overflow = 'hidden';
  }

  function closeModal() {
    if (!modalOverlay) return;
    modalOverlay.classList.remove('is-open');
    document.body.style.overflow = '';
  }

  function openAnnouncementModal() {
    if (!announcementOverlay) return;
    announcementOverlay.hidden = false;
    document.body.style.overflow = 'hidden';
  }

  function closeAnnouncementModal(shouldRemember) {
    if (!announcementOverlay) return;
    announcementOverlay.hidden = true;
    if (!modalOverlay || !modalOverlay.classList.contains('is-open')) {
      document.body.style.overflow = '';
    }

    if (shouldRemember) {
      try {
        window.localStorage.setItem(ANNOUNCEMENT_DISMISS_KEY, String(Date.now()));
      } catch (error) {
        // Ignore storage failures and allow the modal to reopen later.
      }
    }
  }

  orderTriggers.forEach((trigger) => {
    trigger.addEventListener('click', (e) => {
      e.preventDefault();
      openModal();
    });
  });

  if (modalBackdrop) modalBackdrop.addEventListener('click', closeModal);
  if (modalClose) modalClose.addEventListener('click', closeModal);
  if (announcementBackdrop) {
    announcementBackdrop.addEventListener('click', () => closeAnnouncementModal(true));
  }
  if (announcementClose) {
    announcementClose.addEventListener('click', () => closeAnnouncementModal(true));
  }
  announcementDismissers.forEach((button) => {
    button.addEventListener('click', () => closeAnnouncementModal(true));
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeModal();
      closeAnnouncementModal(true);
      closeMobileNav();
    }
  });

  const pathName = window.location.pathname || '/';
  const isHomePage = pathName === '/' || pathName.endsWith('/index.html') || pathName.endsWith('/index');
  if (announcementOverlay && isHomePage) {
    let dismissedAt = 0;
    try {
      dismissedAt = Number(window.localStorage.getItem(ANNOUNCEMENT_DISMISS_KEY) || '0');
    } catch (error) {
      dismissedAt = 0;
    }

    if (!dismissedAt || (Date.now() - dismissedAt) > ANNOUNCEMENT_REOPEN_MS) {
      window.setTimeout(openAnnouncementModal, 800);
    }
  }

  /* ── Active nav link ────────────────────────────────────── */
  const currentPath = window.location.pathname.replace(/\/$/, '') || '/index';
  document.querySelectorAll('.nav__link, .mobile-nav__link').forEach((link) => {
    const href = link.getAttribute('href') || '';
    const linkPath = href.replace(/\/$/, '') || '/index';
    if (currentPath.endsWith(linkPath) && linkPath !== '/index') {
      link.classList.add('is-active');
    }
  });

  /* ── Marquee duplication (for seamless loop) ─────────────── */
  const track = document.querySelector('.featured-strip__track');
  if (track) {
    // Clone items for infinite loop
    const items = Array.from(track.children);
    items.forEach((item) => {
      const clone = item.cloneNode(true);
      clone.setAttribute('aria-hidden', 'true');
      track.appendChild(clone);
    });
  }

  /* ── Locations page: tab / anchor scroll ─────────────────── */
  const locationAnchors = document.querySelectorAll('[data-location-anchor]');
  locationAnchors.forEach((anchor) => {
    anchor.addEventListener('click', (e) => {
      const target = document.querySelector(anchor.dataset.locationAnchor);
      if (target) {
        e.preventDefault();
        const offset = parseInt(getComputedStyle(document.documentElement)
          .getPropertyValue('--header-h')) || 80;
        const top = target.getBoundingClientRect().top + window.scrollY - offset;
        window.scrollTo({ top, behavior: 'smooth' });
      }
    });
  });

  /* ── Catering / menu page: pill filter ──────────────────── */
  const pills = document.querySelectorAll('.pill[data-filter]');
  if (pills.length) {
    pills.forEach((pill) => {
      pill.addEventListener('click', () => {
        pills.forEach((p) => p.classList.remove('is-active'));
        pill.classList.add('is-active');

        const filter = pill.dataset.filter;
        document.querySelectorAll('[data-category]').forEach((cat) => {
          if (filter === 'all' || cat.dataset.category === filter) {
            cat.style.display = '';
          } else {
            cat.style.display = 'none';
          }
        });
      });
    });
  }

  /* ── Menu page location pills ───────────────────────────── */
  const locationPills = document.querySelectorAll('.menu-hero__location-pill[data-location]');
  if (locationPills.length) {
    function updateLocationPills(activeLocation) {
      locationPills.forEach((pill) => {
        pill.classList.toggle('is-active', pill.dataset.location === activeLocation);
      });
    }

    function applyLocationFilter(loc) {
      // Filter menu categories
      document.querySelectorAll('.menu-category[data-locations]').forEach((cat) => {
        const locs = cat.dataset.locations.split(' ');
        cat.style.display = locs.includes(loc) ? '' : 'none';
      });

      // Filter PDF cards
      document.querySelectorAll('[data-pdf-location]').forEach((card) => {
        const show = loc === 'all' || card.dataset.pdfLocation === loc;
        card.style.display = show ? '' : 'none';
      });

      // Clear any inline gridTemplateColumns so CSS auto-fit takes over
      const pdfGrid = document.getElementById('pdf-grid');
      if (pdfGrid) {
        pdfGrid.style.gridTemplateColumns = '';
      }

      // Also sync the category-filter pills to "All" when location changes
      document.querySelectorAll('.pill[data-filter]').forEach((p) => p.classList.remove('is-active'));
      const allPill = document.querySelector('.pill[data-filter="all"]');
      if (allPill) allPill.classList.add('is-active');
    }

    locationPills.forEach((pill) => {
      pill.addEventListener('click', () => {
        const location = setStoredLocationPreference(pill.dataset.location);
        updateLocationPills(location);
        applyLocationFilter(location);
      });
    });

    // Initialize
    const initialLocation = getStoredLocationPreference();
    updateLocationPills(initialLocation);
    applyLocationFilter(initialLocation);
  }


  /* ── Contact form (Web3Forms) ───────────────────────────── */
  const contactForm = document.getElementById('contact-form');
  if (contactForm) {
    contactForm.addEventListener('submit', async function (e) {
      e.preventDefault();
      const btn = contactForm.querySelector('[type="submit"]');
      const successEl = document.getElementById('form-success');
      const errorEl = document.getElementById('form-error');
      btn.disabled = true;
      btn.textContent = 'Sending…';
      errorEl.classList.remove('is-visible');
      try {
        const res = await fetch('https://api.web3forms.com/submit', {
          method: 'POST',
          body: new FormData(contactForm),
        });
        const data = await res.json();
        if (data.success) {
          contactForm.style.display = 'none';
          successEl.classList.add('is-visible');
        } else {
          throw new Error(data.message || 'Submission failed');
        }
      } catch (err) {
        errorEl.textContent = 'Something went wrong. Please try again or call us directly.';
        errorEl.classList.add('is-visible');
        btn.disabled = false;
        btn.textContent = 'Send Message';
      }
    });
  }

  /* ── Parallax ──────────────────────────────────────────── */
  (function initParallax() {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (window.innerWidth < 768) return;

    const targets = Array.from(document.querySelectorAll('[data-parallax]'));
    if (!targets.length) return;

    let ticking = false;

    function update() {
      const vh = window.innerHeight;
      targets.forEach((el) => {
        const speed = parseFloat(el.dataset.parallax) || 0.15;
        // Reference the section container for position, not the image itself
        const container = el.parentElement;
        const rect = container.getBoundingClientRect();

        // Skip elements well outside the viewport
        if (rect.bottom < -200 || rect.top > vh + 200) return;

        // Offset = how far the container's centre is from the viewport's centre
        const rawOffset = (rect.top + rect.height / 2 - vh / 2) * speed;
        const isAbs = getComputedStyle(el).position === 'absolute';
        // Clamp travel to 12% of the container height so the scale buffer never runs out
        const maxTravel = container.offsetHeight * 0.12;
        const offset = Math.max(-maxTravel, Math.min(maxTravel, rawOffset));

        // For abs-positioned images the CSS scale is overwritten by style.transform on
        // every frame, so we must include the scale here. Use larger value at narrower widths.
        const absScale = window.innerWidth <= 1024 ? 1.5 : 1.35;
        el.style.transform = isAbs
          ? `translateY(${offset}px) scale(${absScale})`
          : `translateY(${offset}px) scale(1.25)`;
      });
      ticking = false;
    }

    window.addEventListener('scroll', () => {
      if (!ticking) { requestAnimationFrame(update); ticking = true; }
    }, { passive: true });

    window.addEventListener('resize', () => {
      if (window.innerWidth < 768) {
        targets.forEach((el) => { el.style.transform = ''; });
      } else {
        requestAnimationFrame(update);
      }
    });

    requestAnimationFrame(update);
  })();

})();
