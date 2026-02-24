// Unified partials loader that works from any directory
document.addEventListener('DOMContentLoaded', () => {
  const includes = document.querySelectorAll('[data-include]');
  
  // Performance: Batch load all partials
  const loadPromises = Array.from(includes).map(async (el) => {
    const name = el.getAttribute('data-include');
    
    // Determine correct path based on current location
    let partialsPath = 'partials/';
    const currentPath = window.location.pathname;
    
    if (currentPath.includes('/worker/')) {
      partialsPath = '../partials/';
    } else if (currentPath.includes('/recruiter/')) {
      partialsPath = '../partials/';
    }
    
    try {
      const res = await fetch(partialsPath + name + '.html');
      if (res.ok) {
        const content = await res.text();
        el.innerHTML = content;
        console.log(`Loaded ${name} from ${partialsPath}${name}.html`);
      } else {
        console.error(`Failed to load ${name}: ${res.status}`);
      }
    } catch (err) {
      console.error(`Failed to load ${name}:`, err);
      el.innerHTML = `<!-- Failed to load ${name} -->`;
    }
  });
  
  // Performance: Wait for all partials to load
  Promise.all(loadPromises).then(() => {
    console.log('All partials loaded successfully');
    // Trigger any post-load events
    document.dispatchEvent(new CustomEvent('partialsLoaded'));
  });

  // Performance: Debounced mobile nav toggle
  let navTimeout;
  document.addEventListener('click', (e) => {
    if (e.target && e.target.id === 'navToggle') {
      clearTimeout(navTimeout);
      navTimeout = setTimeout(() => {
        const menu = document.getElementById('navMenu');
        if (menu) menu.classList.toggle('open');
      }, 100); // Debounce for 100ms
    }
  });
});

// Performance: Lazy loading helper
function lazyLoad(selector, callback) {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        callback(entry.target);
        observer.unobserve(entry.target);
      }
    });
  });
  
  document.querySelectorAll(selector).forEach(el => {
    observer.observe(el);
  });
}

// Performance: Image optimization
function optimizeImages() {
  const images = document.querySelectorAll('img[data-src]');
  images.forEach(img => {
    img.src = img.dataset.src;
    img.onload = () => img.classList.add('loaded');
  });
}
