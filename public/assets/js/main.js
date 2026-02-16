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
    });
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
})();
