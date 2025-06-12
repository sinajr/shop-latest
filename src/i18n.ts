import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
// Removed HttpBackend as we are no longer loading translations from /public/locales at runtime
// import HttpBackend from 'i18next-http-backend';

// Import translation files directly
import enTranslation from '../public/locales/en/translation.json';
import ruTranslation from '../public/locales/ru/translation.json';

i18n
  // Removed HttpBackend as translations are now bundled
  // .use(HttpBackend) // Loads translations from /public/locales
  .use(LanguageDetector) // Detects user language
  .use(initReactI18next) // Passes i18n instance to react-i18next
  .init({
    resources: { // Define resources directly
      en: {
        translation: enTranslation,
      },
      ru: {
        translation: ruTranslation,
      },
    },
    supportedLngs: ['en', 'ru'],
    fallbackLng: 'en',
    debug: process.env.NODE_ENV === 'development', // Enable debug output in development
    ns: ['translation'], // Default namespace
    defaultNS: 'translation',
    // Removed backend configuration as translations are now bundled
    // backend: {
    //   loadPath: '/locales/{{lng}}/{{ns}}.json', // Path to translation files
    // },
    detection: {
      // Order and from where user language should be detected
      order: ['querystring', 'cookie', 'localStorage', 'sessionStorage', 'navigator', 'htmlTag', 'path', 'subdomain'],
      caches: ['cookie', 'localStorage'], // Where to cache detected language
    },
    interpolation: {
      escapeValue: false, // React already safes from xss
    },
    react: {
      useSuspense: true, // Recommended for new projects
    }
  });

export default i18n;
