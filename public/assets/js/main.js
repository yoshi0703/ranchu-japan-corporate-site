(() => {
  const menuBtn = document.querySelector('[data-menu-button]');
  const menu = document.querySelector('[data-site-nav]');
  const yearTargets = document.querySelectorAll('[data-current-year]');

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

    // Close on nav link click
    menu.querySelectorAll('a').forEach((link) => {
      link.addEventListener('click', () => toggle(false));
    });

    // Close on Escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && menu.classList.contains('open')) {
        toggle(false);
        menuBtn.focus();
      }
    });

    // Close on backdrop tap (outside nav links)
    menu.addEventListener('click', (e) => {
      if (e.target === menu) toggle(false);
    });
  }

  const year = new Date().getFullYear();
  yearTargets.forEach((el) => {
    el.textContent = String(year);
  });
})();
