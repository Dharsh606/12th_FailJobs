// Professional Global Language System

const I18N = {
    currentLang: localStorage.getItem("lang") || "en",
    translations: {},

    async init() {
        await this.loadLanguage(this.currentLang);
        this.bindLanguageSelector();
    },

    async loadLanguage(lang) {
        try {
            const response = await fetch(`/i18n/${lang}.json`);
            this.translations = await response.json();

            document.querySelectorAll("[data-i18n]").forEach(el => {
                const key = el.getAttribute("data-i18n");
                if (this.translations[key]) {
                    el.innerText = this.translations[key];
                }
            });

            localStorage.setItem("lang", lang);
            document.documentElement.lang = lang;
            this.currentLang = lang;

        } catch (error) {
            console.error("Language loading failed:", error);
        }
    },

    bindLanguageSelector() {
        document.querySelectorAll("[data-lang]").forEach(btn => {
            btn.addEventListener("click", () => {
                const lang = btn.getAttribute("data-lang");
                this.loadLanguage(lang);
            });
        });
    }
};

document.addEventListener("DOMContentLoaded", () => {
    I18N.init();
});