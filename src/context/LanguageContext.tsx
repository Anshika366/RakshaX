import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { SupportedLanguage, SUPPORTED_LANGUAGES, getTranslation, translations } from '../lib/translations';

interface LanguageContextType {
  language: SupportedLanguage;
  setLanguage: (lang: SupportedLanguage) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
  isLangModalOpen: boolean;
  setIsLangModalOpen: (open: boolean) => void;
  currentLangInfo: typeof SUPPORTED_LANGUAGES[0];
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<SupportedLanguage>(() => {
    try {
      const saved = localStorage.getItem('rakshax_lang') || localStorage.getItem('safeguard_lang');
      if (saved && ['en', 'hi', 'mr', 'gu', 'bn', 'ta', 'te', 'kn'].includes(saved)) {
        return saved as SupportedLanguage;
      }
    } catch (e) {}
    return 'hi'; // Default to Hindi as preferred by users
  });

  const [isLangModalOpen, setIsLangModalOpen] = useState(false);

  const setLanguage = (newLang: SupportedLanguage) => {
    setLanguageState(newLang);
    try {
      localStorage.setItem('rakshax_lang', newLang);
      localStorage.setItem('safeguard_lang', newLang);
      document.documentElement.lang = newLang;
    } catch (e) {}
  };

  useEffect(() => {
    try {
      document.documentElement.lang = language;
    } catch (e) {}
  }, [language]);

  const t = (key: string, params?: Record<string, string | number>): string => {
    return getTranslation(language, key, params);
  };

  const currentLangInfo = SUPPORTED_LANGUAGES.find(l => l.code === language) || SUPPORTED_LANGUAGES[0];

  return (
    <LanguageContext.Provider
      value={{
        language,
        setLanguage,
        t,
        isLangModalOpen,
        setIsLangModalOpen,
        currentLangInfo,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    // Fallback if rendered outside provider
    const fallbackLang: SupportedLanguage = 'hi';
    return {
      language: fallbackLang,
      setLanguage: () => {},
      t: (key: string, params?: Record<string, string | number>) => getTranslation(fallbackLang, key, params),
      isLangModalOpen: false,
      setIsLangModalOpen: () => {},
      currentLangInfo: SUPPORTED_LANGUAGES[0],
    };
  }
  return context;
}
