document.addEventListener('DOMContentLoaded', () => {
  const includes = document.querySelectorAll('[data-include]');
  includes.forEach(async (el) => {
    const name = el.getAttribute('data-include');
    try {
      const res = await fetch(`partials/${name}.html`);
      if (res.ok) {
        el.innerHTML = await res.text();
        console.log(`Loaded ${name} from partials/${name}.html`);
      }
    } catch (err) {
      console.log(`Failed to load ${name}:`, err);
    }
  });

  // simple mobile nav toggle
  document.addEventListener('click', (e) => {
    if (e.target && e.target.id === 'navToggle') {
      const menu = document.getElementById('navMenu');
      if (menu) menu.classList.toggle('open');
    }
  });
});