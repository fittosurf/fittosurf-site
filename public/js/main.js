(function () {
  // Nav scroll state
  const nav = document.getElementById('nav');
  const onScroll = () => {
    nav.classList.toggle('is-scrolled', window.scrollY > 24);
  };
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  // Mobile menu
  const burger = document.getElementById('navBurger');
  const mobileMenu = document.getElementById('navMobile');
  burger.addEventListener('click', () => {
    burger.classList.toggle('is-open');
    mobileMenu.classList.toggle('is-open');
  });
  mobileMenu.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => {
      burger.classList.remove('is-open');
      mobileMenu.classList.remove('is-open');
    });
  });

  const prefersReduced = window.matchMedia(
    '(prefers-reduced-motion: reduce)'
  ).matches;

  // Hero H1: reveal word by word (falls back to a block reveal without JS)
  const heroH1 = document.querySelector('.hero h1');
  if (heroH1 && !prefersReduced) {
    const words = heroH1.textContent.trim().split(/\s+/);
    heroH1.textContent = '';
    words.forEach((word, i) => {
      const span = document.createElement('span');
      span.className = 'word';
      span.textContent = word;
      span.style.animationDelay = 0.3 + i * 0.08 + 's';
      heroH1.appendChild(span);
      if (i < words.length - 1) {
        heroH1.appendChild(document.createTextNode(' '));
      }
    });
    heroH1.classList.add('is-split');
  }

  // Hero background: subtle parallax on scroll (ken burns zoom stays in CSS)
  const heroBg = document.querySelector('.hero__bg');
  if (heroBg && !prefersReduced) {
    let ticking = false;
    const applyParallax = () => {
      const y = window.scrollY;
      if (y < window.innerHeight) {
        heroBg.style.transform = 'translate3d(0,' + y * 0.07 + 'px,0)';
      }
      ticking = false;
    };
    window.addEventListener(
      'scroll',
      () => {
        if (!ticking) {
          window.requestAnimationFrame(applyParallax);
          ticking = true;
        }
      },
      { passive: true }
    );
  }

  // Stagger children within grouped sections for a smooth cascade (~110ms apart)
  document.querySelectorAll('.profiles, .pillars').forEach((group) => {
    group.querySelectorAll('.reveal').forEach((el, i) => {
      el.style.transitionDelay = i * 0.11 + 's';
    });
  });

  // Scroll reveal via IntersectionObserver
  const revealEls = document.querySelectorAll('.reveal');

  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target);
          }
        });
      },
      // No negative bottom margin: otherwise elements at the very bottom of the
      // page (e.g. the footer copyright) can never reach the threshold and stay hidden.
      { threshold: 0.15, rootMargin: '0px' }
    );
    revealEls.forEach((el) => observer.observe(el));

    // Safety net for short elements pinned to the page bottom: once the user is
    // near the end of the page, reveal anything still hidden.
    const revealBottom = () => {
      if (window.innerHeight + window.scrollY >= document.body.scrollHeight - 4) {
        revealEls.forEach((el) => el.classList.add('is-visible'));
        window.removeEventListener('scroll', revealBottom);
      }
    };
    window.addEventListener('scroll', revealBottom, { passive: true });
  } else {
    // Safety net: if IntersectionObserver is unavailable, just show everything
    revealEls.forEach((el) => el.classList.add('is-visible'));
  }

  // Lead form submission
  const form = document.getElementById('leadForm');
  const feedback = document.getElementById('leadFeedback');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    feedback.classList.remove('is-error');
    feedback.textContent = 'Envoi en cours...';

    const firstName = document.getElementById('firstName').value.trim();
    const email = document.getElementById('email').value.trim();

    try {
      const res = await fetch('/api/lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ firstName, email }),
      });
      const data = await res.json();

      if (data.ok) {
        feedback.textContent = `Merci ${firstName} ! Ton programme arrive par email.`;
        form.reset();
      } else {
        feedback.classList.add('is-error');
        feedback.textContent = data.error || 'Une erreur est survenue.';
      }
    } catch (err) {
      feedback.classList.add('is-error');
      feedback.textContent = 'Une erreur est survenue. Réessaie.';
    }
  });
})();
