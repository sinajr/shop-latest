
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import HttpBackend from 'i18next-http-backend';

i18n
  .use(HttpBackend) // Loads translations from /public/locales
  .use(LanguageDetector) // Detects user language
  .use(initReactI18next) // Passes i18n instance to react-i18next
  .init({
    supportedLngs: ['en', 'ru'],
    fallbackLng: 'en',
    debug: process.env.NODE_ENV === 'development', // Enable debug output in development
    ns: ['translation'], // Default namespace
    defaultNS: 'translation',
    backend: {
      loadPath: '/locales/{{lng}}/{{ns}}.json', // Path to translation files
    },
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
