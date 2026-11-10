import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

const resources = {
  en: {
    translation: {
      navbar: {
        dashboard: 'Dashboard',
        clases: 'Classes',
        grupos: 'Groups',
        finanzas: 'Finances',
        bonos: 'Bonuses',
        configuracion: 'Settings',
      },
      settings: {
        language: 'Language',
        languageDesc: 'Choose the display language for the application',
        english: 'English',
        spanish: 'Spanish',
      },
      common: {
        save: 'Save',
        cancel: 'Cancel',
      },
    },
  },
  es: {
    translation: {
      navbar: {
        dashboard: 'Dashboard',
        clases: 'Clases',
        grupos: 'Grupos',
        finanzas: 'Finanzas',
        bonos: 'Bonos',
        configuracion: 'Configuración',
      },
      settings: {
        language: 'Idioma',
        languageDesc: 'Elige el idioma de visualización de la aplicación',
        english: 'Inglés',
        spanish: 'Español',
      },
      common: {
        save: 'Guardar',
        cancel: 'Cancelar',
      },
    },
  },
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false, // React already escapes values safely
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
    },
  });

export default i18n;

