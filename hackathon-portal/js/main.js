/**
 * Genesis Hackathon — main.js
 * Handles: scroll-spy, mobile nav, track accordions, scroll animations, back-to-top
 */

(function () {
  'use strict';

  /* ── Utility: throttle ─────────────────────────────────────── */
  function throttle(fn, ms) {
    let last = 0;
    return function (...args) {
      const now = Date.now();
      if (now - last >= ms) { last = now; fn.apply(this, args); }
    };
  }

  /* ── DOM ready ─────────────────────────────────────────────── */
  document.addEventListener('DOMContentLoaded', function () {

    /* ============================================================
       NAV — scroll-spy + shrink on scroll
       ============================================================ */
    const navbar   = document.getElementById('navbar');
    const navLinks = document.querySelectorAll('.nav-links a[href^="#"], .nav-drawer a[href^="#"]');
    const sections = Array.from(document.querySelectorAll('section[id]'));

    function getActiveSection() {
      const scrollY = window.scrollY;
      const offset  = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--nav-h')) || 64;
      // Walk from bottom so last visible section wins
      for (let i = sections.length - 1; i >= 0; i--) {
        const sec = sections[i];
        if (sec.getBoundingClientRect().top <= offset + 20) {
          return sec.id;
        }
      }
      return sections[0] ? sections[0].id : '';
    }

    function updateScrollSpy() {
      const activeId = getActiveSection();
      navLinks.forEach(function (link) {
        const targetId = link.getAttribute('href').replace('#', '');
        if (targetId === activeId) {
          link.classList.add('active');
          link.setAttribute('aria-current', 'true');
        } else {
          link.classList.remove('active');
          link.removeAttribute('aria-current');
        }
      });
    }

    function updateNavbar() {
      if (window.scrollY > 20) {
        navbar.classList.add('scrolled');
      } else {
        navbar.classList.remove('scrolled');
      }
    }

    const onScroll = throttle(function () {
      updateNavbar();
      updateScrollSpy();
      updateBackToTop();
      checkAnimations();
    }, 80);

    window.addEventListener('scroll', onScroll, { passive: true });
    updateNavbar();
    updateScrollSpy();

    /* ============================================================
       MOBILE NAV — hamburger toggle
       ============================================================ */
    const hamburger = document.getElementById('nav-hamburger');
    const drawer    = document.getElementById('nav-drawer');

    if (hamburger && drawer) {
      hamburger.addEventListener('click', function () {
        const isOpen = drawer.classList.toggle('open');
        hamburger.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
        document.body.style.overflow = isOpen ? 'hidden' : '';
      });

      // Close drawer on link click
      drawer.querySelectorAll('a').forEach(function (link) {
        link.addEventListener('click', function () {
          drawer.classList.remove('open');
          hamburger.setAttribute('aria-expanded', 'false');
          document.body.style.overflow = '';
        });
      });

      // Close drawer on outside click
      document.addEventListener('click', function (e) {
        if (!navbar.contains(e.target) && !drawer.contains(e.target)) {
          drawer.classList.remove('open');
          hamburger.setAttribute('aria-expanded', 'false');
          document.body.style.overflow = '';
        }
      });

      // Close on Escape
      document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && drawer.classList.contains('open')) {
          drawer.classList.remove('open');
          hamburger.setAttribute('aria-expanded', 'false');
          document.body.style.overflow = '';
          hamburger.focus();
        }
      });
    }

    /* ============================================================
       TRACK ACCORDIONS
       ============================================================ */
    const trackHeaders = document.querySelectorAll('.track-header');

    trackHeaders.forEach(function (btn) {
      btn.addEventListener('click', function () {
        const card     = btn.closest('.track-card');
        const isOpen   = card.classList.contains('open');
        const body     = card.querySelector('.track-body');
        const bodyId   = body ? body.id : '';

        // Close all others
        document.querySelectorAll('.track-card.open').forEach(function (openCard) {
          if (openCard !== card) {
            openCard.classList.remove('open');
            const openBtn  = openCard.querySelector('.track-header');
            if (openBtn) {
              openBtn.setAttribute('aria-expanded', 'false');
              const openBodyId = openCard.querySelector('.track-body');
              if (openBodyId) openBtn.setAttribute('aria-controls', openBodyId.id || '');
            }
          }
        });

        // Toggle this card
        card.classList.toggle('open', !isOpen);
        btn.setAttribute('aria-expanded', (!isOpen).toString());

        // Scroll into view if opening
        if (!isOpen) {
          setTimeout(function () {
            const offset = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--nav-h')) || 64;
            const top = card.getBoundingClientRect().top + window.scrollY - offset - 16;
            window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
          }, 280);
        }
      });

      // Keyboard: Enter and Space already handled by button; also support arrow keys for list navigation
      btn.addEventListener('keydown', function (e) {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          const allBtns = Array.from(trackHeaders);
          const idx = allBtns.indexOf(btn);
          if (idx < allBtns.length - 1) allBtns[idx + 1].focus();
        }
        if (e.key === 'ArrowUp') {
          e.preventDefault();
          const allBtns = Array.from(trackHeaders);
          const idx = allBtns.indexOf(btn);
          if (idx > 0) allBtns[idx - 1].focus();
        }
      });
    });

    /* ============================================================
       BACK-TO-TOP button
       ============================================================ */
    const backToTop = document.getElementById('back-to-top');

    function updateBackToTop() {
      if (!backToTop) return;
      if (window.scrollY > 400) {
        backToTop.classList.add('visible');
      } else {
        backToTop.classList.remove('visible');
      }
    }

    if (backToTop) {
      backToTop.addEventListener('click', function () {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    }

    /* ============================================================
       SCROLL-IN ANIMATIONS (IntersectionObserver)
       ============================================================ */
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    function checkAnimations() { /* kept for throttle compatibility */ }

    if (!prefersReducedMotion) {
      const animEls = document.querySelectorAll('.animate-in');

      const observer = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('in-view');
            observer.unobserve(entry.target);
          }
        });
      }, { threshold: 0.12 });

      animEls.forEach(function (el) { observer.observe(el); });
    } else {
      // Just show everything immediately
      document.querySelectorAll('.animate-in').forEach(function (el) {
        el.style.opacity = '1';
        el.style.transform = 'none';
      });
    }

    /* ============================================================
       Smooth-scroll for all anchor nav links
       ============================================================ */
    document.querySelectorAll('a[href^="#"]').forEach(function (anchor) {
      anchor.addEventListener('click', function (e) {
        const targetId = anchor.getAttribute('href');
        if (targetId === '#') return;
        const target = document.querySelector(targetId);
        if (!target) return;
        e.preventDefault();
        const offset = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--nav-h')) || 64;
        const top = target.getBoundingClientRect().top + window.scrollY - offset;
        window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
      });
    });

    /* ============================================================
       Announce active section to screen readers via live region
       ============================================================ */
    let liveRegion = document.getElementById('sr-live');
    if (!liveRegion) {
      liveRegion = document.createElement('div');
      liveRegion.id = 'sr-live';
      liveRegion.setAttribute('aria-live', 'polite');
      liveRegion.setAttribute('aria-atomic', 'true');
      liveRegion.className = 'sr-only';
      document.body.appendChild(liveRegion);
    }

  }); // end DOMContentLoaded

})();
