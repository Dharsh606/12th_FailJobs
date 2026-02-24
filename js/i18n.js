const LANG_KEY = "failjob_lang";
let T = {}; // translations in memory
let currentLang = 'en'; // Track current language

function getLang() {
  return localStorage.getItem(LANG_KEY) || "en";
}

function setLang(lang) {
  localStorage.setItem(LANG_KEY, lang);
  currentLang = lang;
  
  // Update all language buttons across the site
  updateLanguageButtons(lang);
  
  // Reload translations without page refresh
  loadLang().then(() => {
    applyI18n();
    // Update page title and meta
    updatePageLanguage(lang);
  });
}

function getCurrentLang() {
  return currentLang;
}

// Update language buttons to show selected language
function updateLanguageButtons(selectedLang) {
  const langSelects = document.querySelectorAll('#langSelect, .language-select');
  
  langSelects.forEach(select => {
    select.value = selectedLang;
    
    // Update visual indication
    select.style.background = selectedLang !== 'en' ? 'var(--accent-orange)' : '';
    select.style.color = selectedLang !== 'en' ? 'white' : '';
  });
}

// Update page language attributes
function updatePageLanguage(lang) {
  // Update HTML lang attribute
  document.documentElement.lang = lang;
  
  // Update RTL for languages that need it
  const rtlLanguages = ['ar', 'he', 'fa', 'ur'];
  if (rtlLanguages.includes(lang)) {
    document.documentElement.dir = 'rtl';
  } else {
    document.documentElement.dir = 'ltr';
  }
  
  // Update language-specific CSS
  updateLanguageCSS(lang);
}

// Load language-specific CSS
function updateLanguageCSS(lang) {
  // Remove existing language CSS
  const existingLangCSS = document.getElementById('lang-css');
  if (existingLangCSS) {
    existingLangCSS.remove();
  }
  
  // Add language-specific CSS if needed
  if (lang !== 'en') {
    const langCSS = document.createElement('link');
    langCSS.id = 'lang-css';
    langCSS.rel = 'stylesheet';
    langCSS.href = `styles/lang-${lang}.css`;
    document.head.appendChild(langCSS);
  }
}

async function loadLang() {
  const lang = getLang();
  try {
    const res = await fetch(`i18n/${lang}.json`);
    T = await res.json();
  } catch {
    const res = await fetch(`i18n/en.json`);
    T = await res.json();
  }
}

function t(key) {
  return T[key] || key;
}

// Apply translations to elements having data-i18n="key"
function applyI18n() {
  document.querySelectorAll("[data-i18n]").forEach(el => {
    const key = el.getAttribute("data-i18n");
    el.textContent = t(key);
  });

  // placeholders
  document.querySelectorAll("[data-i18n-placeholder]").forEach(el => {
    const key = el.getAttribute("data-i18n-placeholder");
    el.setAttribute("placeholder", t(key));
  });
}