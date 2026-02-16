(() => {
  const menuBtn = document.querySelector('[data-menu-button]');
  const menu = document.querySelector('[data-site-nav]');
  const yearTargets = document.querySelectorAll('[data-current-year]');

  if (menuBtn && menu) {
    menuBtn.addEventListener('click', () => {
      const isOpen = menu.classList.toggle('open');
      menuBtn.setAttribute('aria-expanded', String(isOpen));
    });
  }

  const year = new Date().getFullYear();
  yearTargets.forEach((el) => {
    el.textContent = String(year);
  });
})();
