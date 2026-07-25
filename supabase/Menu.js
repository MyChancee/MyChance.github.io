// Shared hamburger-menu dropdown behavior for MyChance pages.
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('[data-menu-toggle]').forEach((btn) => {
    const dropdown = document.getElementById(btn.getAttribute('data-menu-toggle'));
    if (!dropdown) return;

    const closeMenu = () => {
      dropdown.classList.remove('open');
      btn.setAttribute('aria-expanded', 'false');
    };

    const openMenu = () => {
      dropdown.classList.add('open');
      btn.setAttribute('aria-expanded', 'true');
    };

    btn.addEventListener('click', (event) => {
      event.stopPropagation();
      dropdown.classList.contains('open') ? closeMenu() : openMenu();
    });

    document.addEventListener('click', (event) => {
      if (!dropdown.contains(event.target) && !btn.contains(event.target)) {
        closeMenu();
      }
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') closeMenu();
    });
  });
});