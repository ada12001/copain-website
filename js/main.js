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

  orderTriggers.forEach((trigger) => {
    trigger.addEventListener('click', (e) => {
      e.preventDefault();
      openModal();
    });
  });

  if (modalBackdrop) modalBackdrop.addEventListener('click', closeModal);
  if (modalClose) modalClose.addEventListener('click', closeModal);

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeModal();
      closeMobileNav();
    }
  });

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

  /* ── Homepage live module ─────────────────────────────── */
  const homepageLiveModule = document.querySelector('[data-homepage-live-module]');
  if (homepageLiveModule) {
    const INITIAL_LIVE_CARD_LIMIT = 6;
    const listEl = homepageLiveModule.querySelector('[data-homepage-live-list]');
    const emptyEl = homepageLiveModule.querySelector('[data-homepage-live-empty]');
    const emptyCopyEl = homepageLiveModule.querySelector('[data-homepage-live-empty-copy]');
    const actionsEl = homepageLiveModule.querySelector('[data-homepage-live-actions]');
    const toggleEl = homepageLiveModule.querySelector('[data-homepage-live-toggle]');
    const timeFormatter = new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: '2-digit'
    });
    const liveLocationPills = homepageLiveModule.querySelectorAll('[data-homepage-live-location]');
    const liveState = {
      items: [],
      location: getStoredLocationPreference(),
      expanded: false
    };

    function escapeHtml(value) {
      return String(value).replace(/[&<>"']/g, (char) => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
      }[char]));
    }

    function formatTime(value) {
      return timeFormatter.format(new Date(value));
    }

    function updateLiveLocationPills(activeLocation) {
      liveLocationPills.forEach((pill) => {
        pill.classList.toggle('is-active', pill.dataset.homepageLiveLocation === activeLocation);
      });
    }

    function renderLiveCards() {
      const items = liveState.items || [];

      if (!items.length) {
        homepageLiveModule.hidden = true;
        return;
      }

      const filteredItems = liveState.location === 'all'
        ? items
        : items.filter((item) => normalizeLocationPreference(item.location_slug) === liveState.location);

      if (!filteredItems.length) {
        listEl.innerHTML = '';
        if (emptyCopyEl) {
          emptyCopyEl.textContent = 'There is nothing live at ' +
            LOCATION_LABELS[liveState.location] +
            ' right now. Switch locations or check back soon.';
        }
        if (emptyEl) emptyEl.hidden = false;
        if (actionsEl) actionsEl.hidden = true;
        homepageLiveModule.hidden = false;
        return;
      }

      if (emptyEl) emptyEl.hidden = true;
      const visibleItems = liveState.expanded
        ? filteredItems
        : filteredItems.slice(0, INITIAL_LIVE_CARD_LIMIT);

      listEl.innerHTML = visibleItems.map((item) => [
        '<article class="live-card" data-status="' + escapeHtml(item.status) + '">',
        '<div class="live-card__top">',
        '<div>',
        '<p class="live-card__status">' + escapeHtml(item.status) + '</p>',
        '<div class="spacer spacer--sm"></div>',
        '<h3 class="live-card__name">' + escapeHtml(item.item_name) + '</h3>',
        '</div>',
        '<span class="live-card__location">' + escapeHtml(item.location_name) + '</span>',
        '</div>',
        '<div class="live-card__time">',
        '<span class="live-card__time-label">' + escapeHtml(item.display_time) + '</span>',
        '<span class="live-card__time-value">' + escapeHtml(formatTime(item.time_value)) + '</span>',
        '</div>',
        '</article>'
      ].join('')).join('');

      if (actionsEl && toggleEl) {
        const hasOverflow = filteredItems.length > INITIAL_LIVE_CARD_LIMIT;
        actionsEl.hidden = !hasOverflow;
        toggleEl.textContent = liveState.expanded ? 'Show Less' : 'Show More';
      }

      homepageLiveModule.hidden = false;
    }

    function applyHomepageLiveLocation(location, shouldPersist) {
      const normalized = shouldPersist
        ? setStoredLocationPreference(location)
        : normalizeLocationPreference(location);

      liveState.location = normalized;
      liveState.expanded = false;
      updateLiveLocationPills(normalized);
      renderLiveCards();
    }

    async function loadHomepageLive() {
      try {
        const response = await fetch('/api/homepage/live', {
          headers: { Accept: 'application/json' }
        });
        if (!response.ok) throw new Error('Live feed unavailable.');
        const payload = await response.json();
        liveState.items = payload.items || [];
        renderLiveCards();
      } catch (error) {
        homepageLiveModule.hidden = true;
      }
    }

    liveLocationPills.forEach((pill) => {
      pill.addEventListener('click', () => {
        applyHomepageLiveLocation(pill.dataset.homepageLiveLocation, true);
      });
    });
    if (toggleEl) {
      toggleEl.addEventListener('click', () => {
        liveState.expanded = !liveState.expanded;
        renderLiveCards();
      });
    }

    applyHomepageLiveLocation(liveState.location, false);
    loadHomepageLive();
    window.setInterval(loadHomepageLive, 60000);
  }

  /* ── Kitchen board prototype ───────────────────────────── */
  const kitchenBoard = document.querySelector('[data-kitchen-board]');
  if (kitchenBoard) {
    const titleTag = document.querySelector('[data-kitchen-document-title]');
    const descriptionTag = document.querySelector('[data-kitchen-meta-description]');
    const authEl = kitchenBoard.querySelector('[data-kitchen-auth]');
    const authLocationEl = kitchenBoard.querySelector('[data-kitchen-auth-location]');
    const authCopyEl = kitchenBoard.querySelector('[data-kitchen-auth-copy]');
    const authForm = kitchenBoard.querySelector('[data-kitchen-auth-form]');
    const authPasswordEl = kitchenBoard.querySelector('[data-kitchen-auth-password]');
    const authRememberEl = kitchenBoard.querySelector('[data-kitchen-auth-remember]');
    const authErrorEl = kitchenBoard.querySelector('[data-kitchen-auth-error]');
    const authSubmitEl = kitchenBoard.querySelector('[data-kitchen-auth-submit]');
    const protectedContentEl = kitchenBoard.querySelector('[data-kitchen-protected-content]');
    const pageKickerEl = kitchenBoard.querySelector('[data-kitchen-kicker]');
    const pageTitleEl = kitchenBoard.querySelector('[data-kitchen-title]');
    const introKickerEl = kitchenBoard.querySelector('[data-kitchen-intro-kicker]');
    const introHeadlineEl = kitchenBoard.querySelector('[data-kitchen-intro-headline]');
    const introBodyEl = kitchenBoard.querySelector('[data-kitchen-intro-body]');
    const summaryEl = kitchenBoard.querySelector('[data-kitchen-summary]');
    const loadingTitleEl = kitchenBoard.querySelector('[data-kitchen-loading-title]');
    const loadingCopyEl = kitchenBoard.querySelector('[data-kitchen-loading-copy]');
    const settingsIntroEl = kitchenBoard.querySelector('[data-kitchen-settings-intro]');
    const dateEl = kitchenBoard.querySelector('[data-kitchen-date]');
    const clockEl = kitchenBoard.querySelector('[data-kitchen-clock]');
    const syncEl = kitchenBoard.querySelector('[data-kitchen-sync]');
    const sectionsEl = kitchenBoard.querySelector('[data-kitchen-sections]');
    const activityEl = kitchenBoard.querySelector('[data-kitchen-activity]');
    const resetBoardBtn = kitchenBoard.querySelector('[data-reset-board]');
    const toggleSettingsBtn = kitchenBoard.querySelector('[data-toggle-settings]');
    const settingsPanel = kitchenBoard.querySelector('[data-settings-panel]');
    const settingsListEl = kitchenBoard.querySelector('[data-settings-list]');
    const saveSettingsBtn = kitchenBoard.querySelector('[data-save-settings]');
    const cancelSettingsBtn = kitchenBoard.querySelector('[data-cancel-settings]');
    const logoutBtn = kitchenBoard.querySelector('[data-kitchen-logout]');
    const locationParam = new URLSearchParams(window.location.search).get('location');
    const locationSlug = (() => {
      const normalized = normalizeLocationPreference(locationParam || kitchenBoard.dataset.location || '');
      return normalized === 'all' ? 'ballantyne' : normalized;
    })();

    const state = {
      board: null,
      pendingItemId: null,
      pendingAction: null,
      settingsOpen: false,
      settingsDraft: null,
      authenticated: false
    };

    function escapeHtml(value) {
      return String(value).replace(/[&<>"']/g, (char) => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
      }[char]));
    }

    function getFormatters(timeZone) {
      return {
        date: new Intl.DateTimeFormat('en-US', {
          weekday: 'long',
          month: 'long',
          day: 'numeric',
          timeZone
        }),
        time: new Intl.DateTimeFormat('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          timeZone
        })
      };
    }

    function getLatestEvents(board) {
      const latest = new Map();
      (board.events || []).forEach((event) => {
        const prior = latest.get(event.item_id);
        if (!prior || new Date(event.started_at).getTime() > new Date(prior.started_at).getTime()) {
          latest.set(event.item_id, event);
        }
      });
      return latest;
    }

    function getItemLookup(board) {
      return new Map(
        (board.sections || []).flatMap((section) =>
          section.items.map((item) => [item.id, item])
        )
      );
    }

    function getCurrentSettings(board) {
      return Object.fromEntries(
        (board.sections || []).flatMap((section) =>
          section.items.map((item) => [item.id, item.active_today !== false])
        )
      );
    }

    function getLocationDisplayName(slug) {
      return LOCATION_LABELS[normalizeLocationPreference(slug)] || 'Copain';
    }

    function getOpsCopy(board) {
      return board && board.ops_copy ? board.ops_copy : {};
    }

    function renderSummaryCards(cards) {
      if (!summaryEl) return;

      summaryEl.innerHTML = (Array.isArray(cards) ? cards : []).map((card) => [
        '<div class="ops-summary-card">',
        '<span class="ops-summary-card__label">' + escapeHtml(card.label || '') + '</span>',
        '<strong>' + escapeHtml(card.title || '') + '</strong>',
        '<p>' + escapeHtml(card.body || '') + '</p>',
        '</div>'
      ].join('')).join('');
    }

    function setAuthError(message) {
      if (!authErrorEl) return;
      authErrorEl.hidden = !message;
      authErrorEl.textContent = message || '';
    }

    function showProtectedContent() {
      state.authenticated = true;
      if (authEl) authEl.hidden = true;
      if (protectedContentEl) protectedContentEl.hidden = false;
      setAuthError('');
      if (authPasswordEl) authPasswordEl.value = '';
      if (authRememberEl) authRememberEl.checked = false;
    }

    function showAuthGate(message, configurationError) {
      state.authenticated = false;
      if (protectedContentEl) protectedContentEl.hidden = true;
      if (authEl) authEl.hidden = false;
      if (authLocationEl) authLocationEl.textContent = getLocationDisplayName(locationSlug) + ' Kitchen Access';
      if (authCopyEl) {
        authCopyEl.textContent = configurationError
          ? 'This kitchen page cannot be unlocked until the location password is configured on the server.'
          : 'This kitchen page is protected for staff use. Your session lasts 12 hours by default, or 30 days if you choose to remember this device.';
      }
      if (authSubmitEl) {
        authSubmitEl.disabled = !!configurationError;
        authSubmitEl.textContent = configurationError ? 'Access Unavailable' : 'Unlock Kitchen';
      }
      if (authPasswordEl) authPasswordEl.disabled = !!configurationError;
      if (authRememberEl) authRememberEl.disabled = !!configurationError;
      setAuthError(message || '');
      if (syncEl) syncEl.textContent = configurationError ? 'Unavailable' : 'Locked';
    }

    function renderFallbackBoardChrome() {
      renderBoardChrome({
        location: getLocationDisplayName(locationSlug),
        ops_copy: {
          page_title: getLocationDisplayName(locationSlug) + ' Kitchen Ops — Copain Bakery & Provisions',
          page_description: 'Private kitchen tablet board for Copain ' + getLocationDisplayName(locationSlug) + '.',
          title: getLocationDisplayName(locationSlug) + ' Bake Board',
          kicker: 'Kitchen Ops',
          intro_kicker: getLocationDisplayName(locationSlug) + ' Production',
          headline: 'Tap once when an item goes in the oven.',
          body: 'The board handles bake time, cooling, and floor timing automatically. No extra updates needed during service.',
          summary_cards: [
            {
              label: 'Today',
              title: 'Password Protected',
              body: 'Unlock this location to view the live kitchen board.'
            }
          ],
          loading_title: 'Loading Board',
          loading_copy: 'Connecting to the ' + getLocationDisplayName(locationSlug) + ' kitchen datastore',
          settings_intro: 'Choose which items should appear on today\'s ' + getLocationDisplayName(locationSlug) + ' bake board.'
        }
      });
    }

    function renderBoardChrome(board) {
      const opsCopy = getOpsCopy(board);
      const locationName = board.location || LOCATION_LABELS[locationSlug] || 'Copain';

      if (titleTag) {
        titleTag.textContent = opsCopy.page_title || (locationName + ' Kitchen Ops — Copain Bakery & Provisions');
      }
      if (descriptionTag) {
        descriptionTag.setAttribute(
          'content',
          opsCopy.page_description || ('Private kitchen tablet board for Copain ' + locationName + '.')
        );
      }
      if (pageKickerEl) pageKickerEl.textContent = opsCopy.kicker || 'Kitchen Ops';
      if (pageTitleEl) pageTitleEl.textContent = opsCopy.title || (locationName + ' Bake Board');
      if (introKickerEl) introKickerEl.textContent = opsCopy.intro_kicker || (locationName + ' Morning Production');
      if (introHeadlineEl) introHeadlineEl.textContent = opsCopy.headline || 'Tap once when an item goes in the oven.';
      if (introBodyEl) {
        introBodyEl.textContent = opsCopy.body ||
          'The board handles bake time, cooling, and floor timing automatically. No extra updates needed during service.';
      }
      if (loadingTitleEl) loadingTitleEl.textContent = opsCopy.loading_title || 'Loading Board';
      if (loadingCopyEl) loadingCopyEl.textContent = opsCopy.loading_copy || ('Connecting to the ' + locationName + ' kitchen datastore');
      if (settingsIntroEl) {
        settingsIntroEl.textContent = opsCopy.settings_intro || ('Choose which items should appear on today\'s ' + locationName + ' bake board.');
      }

      renderSummaryCards(
        opsCopy.summary_cards && opsCopy.summary_cards.length
          ? opsCopy.summary_cards
          : [
            {
              label: 'Today',
              title: 'Bake Window',
              body: 'Check each tray as it moves from oven to floor.'
            }
          ]
      );
    }

    function hasSettingsChanges() {
      if (!state.board || !state.settingsDraft) return false;
      const current = getCurrentSettings(state.board);
      return Object.keys(current).some((itemId) => current[itemId] !== state.settingsDraft[itemId]);
    }

    function renderSettingsPanel() {
      if (!settingsPanel || !toggleSettingsBtn || !settingsListEl || !saveSettingsBtn) return;

      toggleSettingsBtn.textContent = state.settingsOpen ? 'Close Settings' : 'Today Settings';
      settingsPanel.hidden = !state.settingsOpen;

      if (!state.settingsOpen || !state.board || !state.settingsDraft) return;

      settingsListEl.innerHTML = (state.board.sections || []).map((section) => [
        '<div class="ops-settings-group">',
        '<p class="ops-settings-group__title">' + escapeHtml(section.title) + '</p>',
        section.items.map((item) => {
          const checked = state.settingsDraft[item.id] !== false;
          return [
            '<label class="ops-settings-option">',
            '<input type="checkbox" data-settings-item="' + escapeHtml(item.id) + '"' + (checked ? ' checked' : '') + '>',
            '<span>',
            '<strong>' + escapeHtml(item.name) + '</strong>',
            '<span>' + escapeHtml(checked ? 'Visible on today\'s board.' : 'Hidden from today\'s board.') + '</span>',
            '</span>',
            '</label>'
          ].join('');
        }).join(''),
        '</div>'
      ].join('')).join('');

      saveSettingsBtn.disabled = !hasSettingsChanges() || !!state.pendingAction;
      saveSettingsBtn.textContent = state.pendingAction === 'settings' ? 'Saving...' : 'Save Today';

      settingsListEl.querySelectorAll('[data-settings-item]').forEach((input) => {
        input.addEventListener('change', () => {
          state.settingsDraft[input.dataset.settingsItem] = input.checked;
          renderSettingsPanel();
        });
      });
    }

    function getStage(item, latestEvent, now, formatters) {
      if (!latestEvent) {
        return {
          key: 'idle',
          status: 'Ready to Start',
          eta: 'Tap when the tray goes in.',
          badge: 'Ready',
          detail: 'Waiting for oven start',
          meta: ''
        };
      }

      const startedAt = new Date(latestEvent.started_at).getTime();
      const bakeEndsAt = startedAt + item.bake_minutes * 60 * 1000;
      const floorAt = bakeEndsAt + (item.cool_minutes + item.floor_minutes) * 60 * 1000;
      const formatTime = (ts) => formatters.time.format(new Date(ts));

      if (now < bakeEndsAt) {
        return {
          key: 'baking',
          status: 'In the Oven',
          eta: 'Cooling starts at ' + formatTime(bakeEndsAt),
          badge: 'In Oven',
          detail: 'Expected on floor ' + formatTime(floorAt),
          meta: 'Started ' + formatTime(startedAt)
        };
      }

      if (now < floorAt) {
        return {
          key: 'cooling',
          status: 'Cooling',
          eta: 'Expected on floor at ' + formatTime(floorAt),
          badge: 'Cooling',
          detail: 'Bake finished ' + formatTime(bakeEndsAt),
          meta: 'Started ' + formatTime(startedAt)
        };
      }

      return {
        key: 'floor',
        status: 'Ready',
        eta: 'Placed at ' + formatTime(floorAt),
        badge: 'Ready',
        detail: 'Began baking ' + formatTime(startedAt),
        meta: 'Placed ' + formatTime(floorAt)
      };
    }

    function renderActivities(board, latestEvents, now, formatters) {
      if (!activityEl) return;

      const itemLookup = getItemLookup(board);
      const visibleIds = new Set(
        (board.sections || []).flatMap((section) =>
          section.items.filter((item) => item.active_today !== false).map((item) => item.id)
        )
      );
      const items = Array.from(latestEvents.entries())
        .filter(([itemId]) => visibleIds.has(itemId))
        .sort((a, b) => new Date(b[1].started_at).getTime() - new Date(a[1].started_at).getTime())
        .slice(0, 8);

      if (!items.length) {
        activityEl.innerHTML = '<p class="ops-empty">No batches started yet.</p>';
        return;
      }

      activityEl.innerHTML = items.map(([itemId, event]) => {
        const item = itemLookup.get(itemId);
        const stage = getStage(item, event, now, formatters);
        const isClearing = state.pendingAction === 'clear:' + itemId;
        return [
          '<article class="ops-activity">',
          '<div class="ops-activity__top">',
          '<strong>' + escapeHtml(item.name) + '</strong>',
          '<span class="ops-activity__badge">' + escapeHtml(stage.badge) + '</span>',
          '</div>',
          '<div class="ops-activity__bottom">',
          '<span>' + escapeHtml(stage.meta) + '</span>',
          '<span>' + escapeHtml(stage.detail) + '</span>',
          '</div>',
          '<button class="ops-activity__clear" type="button" data-clear-item-id="' + escapeHtml(itemId) + '"' + (isClearing ? ' disabled' : '') + '>' + (isClearing ? 'Clearing...' : 'Clear') + '</button>',
          '</article>'
        ].join('');
      }).join('');

      activityEl.querySelectorAll('[data-clear-item-id]').forEach((button) => {
        button.addEventListener('click', () => {
          clearItem(button.dataset.clearItemId);
        });
      });
    }

    function renderSections(board) {
      if (!sectionsEl) return;

      const formatters = getFormatters(board.timezone || 'America/New_York');
      const latestEvents = getLatestEvents(board);
      const now = Date.now();

      sectionsEl.innerHTML = (board.sections || []).map((section) => {
        const activeItems = section.items.filter((item) => item.active_today !== false);
        if (!activeItems.length) return '';

        return [
          '<article class="ops-section">',
          '<div class="ops-section__head">',
          '<h3>' + escapeHtml(section.title) + '</h3>',
          '<p>' + escapeHtml(section.description) + '</p>',
          '</div>',
          '<div class="ops-item-grid">',
          activeItems.map((item) => {
            const latestEvent = latestEvents.get(item.id);
            const stage = getStage(item, latestEvent, now, formatters);
            const isPosting = state.pendingItemId === item.id || state.pendingAction === 'start:' + item.id;
            const actionLabel = isPosting ? 'Saving...' : 'Going In Oven';
            return [
              '<button class="ops-item' + (stage.key !== 'idle' ? ' is-active' : '') + (isPosting ? ' is-posting' : '') + '"',
              ' type="button"',
              ' data-item-id="' + escapeHtml(item.id) + '"',
              ' data-stage="' + escapeHtml(stage.key) + '"',
              ' aria-label="' + escapeHtml(item.name + '. ' + stage.status + '. ' + stage.eta) + '">',
              '<span class="ops-item__copy">',
              '<strong>' + escapeHtml(item.name) + '</strong>',
              '<span>' + escapeHtml(item.bake_minutes + ' min bake · ' + item.cool_minutes + ' min cooling · ' + item.floor_minutes + ' min floor setup') + '</span>',
              '</span>',
              '<span class="ops-item__state">',
              '<span class="ops-item__status">' + escapeHtml(stage.status) + '</span>',
              '<span class="ops-item__eta">' + escapeHtml(stage.eta) + '</span>',
              '</span>',
              '<span class="ops-item__action">' + escapeHtml(actionLabel) + '</span>',
              '</button>'
            ].join('');
          }).join(''),
          '</div>',
          '</article>'
        ].join('');
      }).join('');

      renderActivities(board, latestEvents, now, formatters);
      renderSettingsPanel();

      sectionsEl.querySelectorAll('[data-item-id]').forEach((button) => {
        button.addEventListener('click', () => {
          startItem(button.dataset.itemId);
        });
      });
    }

    function renderClock() {
      if (!state.board) return;
      const timeZone = state.board.timezone || 'America/New_York';
      const formatters = getFormatters(timeZone);
      const now = new Date();
      if (dateEl) dateEl.textContent = formatters.date.format(now);
      if (clockEl) clockEl.textContent = formatters.time.format(now);
    }

    function renderError(message) {
      if (authEl) authEl.hidden = true;
      if (protectedContentEl) protectedContentEl.hidden = false;
      if (syncEl) syncEl.textContent = 'Sync unavailable';
      if (sectionsEl) {
        sectionsEl.innerHTML = [
          '<section class="ops-section">',
          '<div class="ops-section__head">',
          '<h3>Board Unavailable</h3>',
          '<p>The local kitchen API could not be reached.</p>',
          '</div>',
          '<p class="ops-empty ops-error">' + escapeHtml(message) + '</p>',
          '</section>'
        ].join('');
      }
      if (activityEl) {
        activityEl.innerHTML = '<p class="ops-empty ops-error">Activity will appear here once the backend is available.</p>';
      }
    }

    async function fetchBoard() {
      const response = await fetch('/api/kitchen/' + locationSlug, {
        headers: { Accept: 'application/json' }
      });
      const payload = await response.json().catch(() => ({}));
      if (response.status === 401 || (response.status === 503 && payload.configuration_error)) {
        showAuthGate(payload.error || 'Enter the kitchen password to continue.', !!payload.configuration_error);
        return false;
      }
      if (!response.ok) {
        throw new Error('Kitchen API returned ' + response.status + '.');
      }
      state.board = payload.board;
      if (syncEl) syncEl.textContent = 'Connected';
      renderBoardChrome(state.board);
      renderClock();
      renderSections(state.board);
      showProtectedContent();
      return true;
    }

    async function mutateBoard(endpoint, body, pendingAction, failureLabel) {
      let succeeded = false;
      state.pendingAction = pendingAction;
      if (state.board) renderSections(state.board);
      if (resetBoardBtn && pendingAction === 'reset') {
        resetBoardBtn.disabled = true;
        resetBoardBtn.textContent = 'Resetting...';
      }

      try {
        const response = await fetch('/api/kitchen/' + locationSlug + endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json'
          },
          body: JSON.stringify(body || {})
        });

        const payload = await response.json().catch(() => ({}));
        if (response.status === 401 || (response.status === 503 && payload.configuration_error)) {
          showAuthGate(payload.error || 'Enter the kitchen password to continue.', !!payload.configuration_error);
          return false;
        }

        if (!response.ok) {
          throw new Error(failureLabel);
        }

        state.board = payload.board;
        succeeded = true;
        if (syncEl) syncEl.textContent = 'Connected';
        renderBoardChrome(state.board);
      } catch (error) {
        if (syncEl) syncEl.textContent = 'Sync delayed';
      } finally {
        state.pendingAction = null;
        if (resetBoardBtn) {
          resetBoardBtn.disabled = false;
          resetBoardBtn.textContent = 'Reset Board';
        }
        renderSettingsPanel();
        if (state.board) renderSections(state.board);
      }

      return succeeded;
    }

    async function startItem(itemId) {
      if (!state.board || state.pendingItemId || state.pendingAction) return;
      state.pendingItemId = itemId;
      renderSections(state.board);

      try {
        const response = await fetch('/api/kitchen/' + locationSlug + '/start', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json'
          },
          body: JSON.stringify({ itemId })
        });

        const payload = await response.json().catch(() => ({}));
        if (response.status === 401 || (response.status === 503 && payload.configuration_error)) {
          showAuthGate(payload.error || 'Enter the kitchen password to continue.', !!payload.configuration_error);
          return;
        }

        if (!response.ok) {
          throw new Error('Could not save tray start.');
        }

        state.board = payload.board;
        if (syncEl) syncEl.textContent = 'Connected';
        renderBoardChrome(state.board);
      } catch (error) {
        if (syncEl) syncEl.textContent = 'Sync delayed';
      } finally {
        state.pendingItemId = null;
        if (state.board) renderSections(state.board);
      }
    }

    function openSettings() {
      if (!state.board || state.pendingItemId || state.pendingAction) return;
      state.settingsOpen = true;
      state.settingsDraft = getCurrentSettings(state.board);
      renderSettingsPanel();
    }

    function closeSettings() {
      state.settingsOpen = false;
      state.settingsDraft = null;
      renderSettingsPanel();
    }

    async function saveSettings() {
      if (!state.board || !state.settingsDraft || state.pendingItemId || state.pendingAction) return;
      const items = Object.keys(state.settingsDraft).map((itemId) => ({
        id: itemId,
        active_today: state.settingsDraft[itemId]
      }));

      const succeeded = await mutateBoard('/settings', { items: items }, 'settings', 'Could not save settings.');
      if (succeeded) closeSettings();
    }

    function clearItem(itemId) {
      if (!state.board || state.pendingItemId || state.pendingAction) return;
      const item = getItemLookup(state.board).get(itemId);
      const confirmed = window.confirm('Clear the latest batch for ' + item.name + '?');
      if (!confirmed) return;

      mutateBoard('/clear', { itemId: itemId }, 'clear:' + itemId, 'Could not clear batch.');
    }

    function resetBoard() {
      if (!state.board || state.pendingItemId || state.pendingAction) return;
      const confirmed = window.confirm('Reset the ' + state.board.location + ' board and clear all active batches?');
      if (!confirmed) return;

      mutateBoard('/reset', {}, 'reset', 'Could not reset board.');
    }

    async function loginToKitchen(password, remember) {
      if (!authSubmitEl) return false;

      authSubmitEl.disabled = true;
      authSubmitEl.textContent = 'Unlocking...';
      setAuthError('');

      try {
        const response = await fetch('/api/kitchen/' + locationSlug + '/auth/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json'
          },
          body: JSON.stringify({
            password: password,
            remember: remember
          })
        });
        const payload = await response.json().catch(() => ({}));

        if (!response.ok) {
          showAuthGate(payload.error || 'Could not unlock this kitchen page.', !!payload.configuration_error);
          return false;
        }

        const loaded = await fetchBoard();
        return loaded !== false;
      } catch (error) {
        showAuthGate('Could not reach the kitchen access service. Please try again.', false);
        return false;
      }
    }

    async function logoutKitchen() {
      try {
        await fetch('/api/kitchen/' + locationSlug + '/auth/logout', {
          method: 'POST',
          headers: { Accept: 'application/json' }
        });
      } catch (error) {
        // Fall through and lock the page locally even if the request fails.
      }

      state.board = null;
      state.pendingItemId = null;
      state.pendingAction = null;
      state.settingsOpen = false;
      state.settingsDraft = null;
      renderFallbackBoardChrome();
      showAuthGate('Signed out. Enter the password again to continue.', false);
    }

    if (resetBoardBtn) {
      resetBoardBtn.addEventListener('click', resetBoard);
    }
    if (toggleSettingsBtn) {
      toggleSettingsBtn.addEventListener('click', () => {
        if (state.settingsOpen) closeSettings();
        else openSettings();
      });
    }
    if (cancelSettingsBtn) {
      cancelSettingsBtn.addEventListener('click', closeSettings);
    }
    if (saveSettingsBtn) {
      saveSettingsBtn.addEventListener('click', saveSettings);
    }
    if (logoutBtn) {
      logoutBtn.addEventListener('click', logoutKitchen);
    }
    if (authForm) {
      authForm.addEventListener('submit', (event) => {
        event.preventDefault();
        loginToKitchen(
          authPasswordEl ? authPasswordEl.value : '',
          authRememberEl ? authRememberEl.checked : false
        );
      });
    }

    renderFallbackBoardChrome();
    fetchBoard().catch((error) => {
      renderError(error.message);
    });

    window.setInterval(() => {
      renderClock();
      if (state.board) renderSections(state.board);
    }, 15000);

    window.setInterval(() => {
      fetchBoard().catch(() => {
        if (syncEl) syncEl.textContent = 'Sync delayed';
      });
    }, 30000);
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
