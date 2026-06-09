import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as RNLocalize from 'react-native-localize';

import en from './en.json';
import ha from './ha.json';

const LANGUAGE_KEY = '@cleango_language';

const languageDetector = {
  type: 'languageDetector',
  async: true,
  detect: async (callback) => {
    try {
      const savedLanguage = await AsyncStorage.getItem(LANGUAGE_KEY);
      if (savedLanguage) {
        return callback(savedLanguage);
      }
      // Fall back to device locale
      const locales = RNLocalize?.getLocales?.() || [];
      const deviceLang = locales[0]?.languageCode || 'en';
      // Support ha (Hausa) natively, default everything else to en
      const lang = deviceLang === 'ha' ? 'ha' : 'en';
      callback(lang);
    } catch {
      callback('en');
    }
  },
  init: () => {},
  cacheUserLanguage: async (language) => {
    try {
      await AsyncStorage.setItem(LANGUAGE_KEY, language);
    } catch {}
  },
};

i18n
  .use(languageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      ha: { translation: ha },
    },
    fallbackLng: 'en',
    supportedLngs: ['en', 'ha'],
    ns: ['translation'],
    defaultNS: 'translation',
    interpolation: {
      escapeValue: false,
    },
    react: {
      useSuspense: false,
    },
  });

export const changeLanguage = async (lang) => {
  await i18n.changeLanguage(lang);
  try {
    await AsyncStorage.setItem(LANGUAGE_KEY, lang);
  } catch {}
};

export const getSavedLanguage = async () => {
  try {
    return (await AsyncStorage.getItem(LANGUAGE_KEY)) || 'en';
  } catch {
    return 'en';
  }
};

export default i18n;
