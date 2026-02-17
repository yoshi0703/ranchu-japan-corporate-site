(() => {
  const menuBtn = document.querySelector('[data-menu-button]');
  const menu = document.querySelector('[data-site-nav]');
  const yearTargets = document.querySelectorAll('[data-current-year]');

  // --- Mobile menu ---
  if (menuBtn && menu) {
    const toggle = (open) => {
      const isOpen = typeof open === 'boolean' ? open : menu.classList.toggle('open');
      if (typeof open === 'boolean') {
        menu.classList.toggle('open', open);
      }
      menuBtn.setAttribute('aria-expanded', String(isOpen));
      document.body.style.overflow = isOpen ? 'hidden' : '';
    };

    menuBtn.addEventListener('click', () => toggle());

    menu.querySelectorAll('a').forEach((link) => {
      link.addEventListener('click', () => toggle(false));
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && menu.classList.contains('open')) {
        toggle(false);
        menuBtn.focus();
      }
    });

    menu.addEventListener('click', (e) => {
      if (e.target === menu) toggle(false);
    });
  }

  // --- Year ---
  const year = new Date().getFullYear();
  yearTargets.forEach((el) => {
    el.textContent = String(year);
  });

  // --- Carousel dot indicators ---
  document.querySelectorAll('.hp-carousel').forEach((carousel) => {
    const track = carousel.querySelector('.hp-carousel-track');
    const dotsContainer = carousel.querySelector('.hp-carousel-dots');
    if (!track || !dotsContainer) return;

    const slides = track.querySelectorAll('.hp-carousel-slide');
    slides.forEach((_, i) => {
      const dot = document.createElement('span');
      dot.className = 'hp-carousel-dot' + (i === 0 ? ' active' : '');
      dotsContainer.appendChild(dot);
    });

    const dots = dotsContainer.querySelectorAll('.hp-carousel-dot');
    let scrollTimeout;
    track.addEventListener('scroll', () => {
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        const scrollLeft = track.scrollLeft;
        const slideWidth = slides[0].offsetWidth + 16;
        const activeIndex = Math.round(scrollLeft / slideWidth);
        dots.forEach((d, i) => d.classList.toggle('active', i === activeIndex));
      }, 50);
    }, { passive: true });
  });

  // --- Smooth scroll for in-page anchors ---
  document.querySelectorAll('a[href^="#hp-"]').forEach((link) => {
    link.addEventListener('click', (e) => {
      const target = document.querySelector(link.getAttribute('href'));
      if (target) {
        e.preventDefault();
        const headerH = document.querySelector('.site-header')?.offsetHeight || 64;
        const chipsH = document.querySelector('.hp-chips')?.offsetHeight || 0;
        const offset = headerH + chipsH + 16;
        const top = target.getBoundingClientRect().top + window.pageYOffset - offset;
        window.scrollTo({ top, behavior: 'smooth' });
      }
    });
  });

  // --- Smart link prefetch ---
  const prefetched = new Set();
  const MAX_PREFETCHED_LINKS = 12;
  const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  const prefetchSupport = document.createElement('link').relList?.supports?.('prefetch') === true;
  const isSameOrigin = (href) => {
    try {
      const url = new URL(href, window.location.href);
      return url.origin === window.location.origin;
    } catch {
      return false;
    }
  };

  const canPrefetch = () => {
    if (!prefetchSupport) return false;
    if (connection?.saveData) return false;
    const type = String(connection?.effectiveType || '');
    if (type.includes('2g')) return false;
    return true;
  };

  const prefetch = (href) => {
    if (!canPrefetch()) return;
    if (!isSameOrigin(href)) return;
    const url = new URL(href, window.location.href);
    if (url.pathname === window.location.pathname || prefetched.has(url.pathname)) return;
    if (prefetched.size >= MAX_PREFETCHED_LINKS) return;
    if (document.querySelector(`link[rel="prefetch"][href="${url.pathname}"]`)) return;

    const link = document.createElement('link');
    link.rel = 'prefetch';
    link.as = 'document';
    link.setAttribute('data-auto-prefetch', 'true');
    link.href = url.pathname;
    document.head.appendChild(link);
    prefetched.add(url.pathname);
  };

  const navLinks = Array.from(document.querySelectorAll('.site-nav a[href], .header-actions a[href], .button[href]')).filter((link) => {
    const href = link.getAttribute('href') || '';
    return href.startsWith('/') && !href.startsWith('//') && !href.startsWith('/#');
  });

  navLinks.forEach((link) => {
    const href = link.href;
    link.addEventListener('pointerenter', () => prefetch(href), { passive: true });
    link.addEventListener('touchstart', () => prefetch(href), { passive: true, once: true });
    link.addEventListener('focus', () => prefetch(href), { passive: true });
  });
})();
