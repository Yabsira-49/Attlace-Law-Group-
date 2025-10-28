/**
 * ATTLES LAW GROUP - TRANSLATION SYSTEM
 * Multi-language support for all pages
 * Uses JSON translation files from /frontend/translations/
 */

class TranslationManager {
    constructor() {
        this.currentLang = 'en';
        this.translations = {};
        this.availableLanguages = ['en', 'am', 'fr', 'ar', 'es', 'de', 'pt', 'ht', 'lg', 'sq'];
        this.init();
    }

    async init() {
        // Get saved language from localStorage or default to English
        this.currentLang = localStorage.getItem('selectedLanguage') || 'en';
        
        // Load the current language translations
        await this.loadTranslations(this.currentLang);
        
        // Apply translations to the page
        this.applyTranslations();
        
        // Set the language selector to current language
        this.updateLanguageSelector();
        
        // Setup language switcher event
        this.setupLanguageSwitcher();
    }

    async loadTranslations(lang) {
        try {
            // Check if translations are already loaded
            if (this.translations[lang]) {
                return this.translations[lang];
            }

            // Load translation file from /frontend/translations/
            const response = await fetch(`/frontend/translations/${lang}.json`);
            
            if (!response.ok) {
                throw new Error(`Failed to load ${lang}.json`);
            }

            const data = await response.json();
            this.translations[lang] = data;
            return data;
            
        } catch (error) {
            console.error(`Error loading translations for ${lang}:`, error);
            
            // Fallback to English if translation file not found
            if (lang !== 'en') {
                console.log('Falling back to English');
                return this.loadTranslations('en');
            }
            
            return {};
        }
    }

    applyTranslations() {
        // Get all elements with data-i18n attribute
        const elements = document.querySelectorAll('[data-i18n]');
        
        elements.forEach(element => {
            const key = element.getAttribute('data-i18n');
            const translation = this.getTranslation(key);
            
            if (translation) {
                element.textContent = translation;
            }
        });

        // Apply HTML direction for RTL languages (Arabic)
        if (this.currentLang === 'ar') {
            document.documentElement.setAttribute('dir', 'rtl');
            document.body.classList.add('rtl');
        } else {
            document.documentElement.setAttribute('dir', 'ltr');
            document.body.classList.remove('rtl');
        }

        // Update HTML lang attribute
        document.documentElement.setAttribute('lang', this.currentLang);
    }

    getTranslation(key) {
        // Split key by dots for nested objects (e.g., "nav.home")
        const keys = key.split('.');
        let translation = this.translations[this.currentLang];

        for (const k of keys) {
            if (translation && translation[k]) {
                translation = translation[k];
            } else {
                // Return key if translation not found
                return key;
            }
        }

        return translation;
    }

    async changeLanguage(lang) {
        if (!this.availableLanguages.includes(lang)) {
            console.error(`Language ${lang} is not available`);
            return;
        }

        this.currentLang = lang;
        
        // Save to localStorage
        localStorage.setItem('selectedLanguage', lang);
        
        // Load translations for new language
        await this.loadTranslations(lang);
        
        // Apply translations
        this.applyTranslations();
        
        // Update language selector
        this.updateLanguageSelector();
        
        // Dispatch custom event for other components
        document.dispatchEvent(new CustomEvent('languageChanged', {
            detail: { language: lang }
        }));
    }

    updateLanguageSelector() {
        const selector = document.getElementById('languageSwitcher');
        if (selector) {
            selector.value = this.currentLang;
        }
    }

    setupLanguageSwitcher() {
        const selector = document.getElementById('languageSwitcher');
        
        if (selector) {
            selector.addEventListener('change', (e) => {
                const selectedLang = e.target.value;
                this.changeLanguage(selectedLang);
            });
        }
    }

    // Method to translate a specific key programmatically
    translate(key) {
        return this.getTranslation(key);
    }
}

// Initialize translation manager when DOM is ready
let translationManager;

document.addEventListener('DOMContentLoaded', () => {
    translationManager = new TranslationManager();
});

// Export for use in other scripts
window.TranslationManager = TranslationManager;
window.getTranslationManager = () => translationManager;