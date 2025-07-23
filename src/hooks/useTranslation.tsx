
import React from 'react';
import { translations, Language } from '@/lib/translations';
import { dbOperations, STORES } from '@/lib/db';

interface TranslationContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: typeof translations.en;
}

interface AppSettings {
  id: string;
  language: Language;
}

const TranslationContext = React.createContext<TranslationContextType | undefined>(undefined);

export const TranslationProvider = ({ children }: { children: React.ReactNode }) => {
  const [language, setLanguageState] = React.useState<Language>('en');

  
  React.useEffect(() => {
    const loadLanguage = async () => {
      try {
        const appSettings = await dbOperations.get<AppSettings>(STORES.SETTINGS, 'app-settings');
        if (appSettings?.language) {
          setLanguageState(appSettings.language);
        }
      } catch (error) {
        console.error('Error loading language:', error);
      }
    };
    loadLanguage();
  }, []);

  
  const setLanguage = async (lang: Language) => {
    try {
      setLanguageState(lang);
      
      
      const currentSettings = await dbOperations.get<AppSettings>(STORES.SETTINGS, 'app-settings');
      const settingsToSave: AppSettings = {
        id: 'app-settings',
        language: lang,
        ...(currentSettings || {})
      };
      
      await dbOperations.put(STORES.SETTINGS, settingsToSave);
    } catch (error) {
      console.error('Error saving language:', error);
    }
  };

  const t = translations[language];

  return (
    <TranslationContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </TranslationContext.Provider>
  );
};

export const useTranslation = () => {
  const context = React.useContext(TranslationContext);
  if (context === undefined) {
    throw new Error('useTranslation must be used within a TranslationProvider');
  }
  return context;
};
