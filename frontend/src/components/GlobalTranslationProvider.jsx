import React, { useEffect } from 'react';
import { useLocale } from '../contexts/LocaleContext';
import { startGlobalTranslation, updateGlobalTranslation, enableFetchInterception, disableFetchInterception } from '../utils/globalTranslator';

/**
 * Global Translation Provider
 * Wraps the app and enables automatic translation of ALL content
 * This system:
 * 1. Observes DOM changes and translates new text nodes
 * 2. Intercepts API responses and translates them
 * 3. Works automatically without needing to wrap every component
 */
const ENABLE_GLOBAL_TRANSLATION = false;

const GlobalTranslationProvider = ({ children }) => {
  const { language } = useLocale() || { language: 'en' };

  useEffect(() => {
    if (!ENABLE_GLOBAL_TRANSLATION) {
      // Ensure any previous interception is turned off
      disableFetchInterception();
      return;
    }

    // Small delay to ensure DOM is ready
    const timer = setTimeout(() => {
      // Start global translation observer
      updateGlobalTranslation(language);
      
      // Enable fetch interception for API responses
      if (language !== 'en') {
        enableFetchInterception();
      } else {
        disableFetchInterception();
      }
    }, 100);
    
    return () => {
      clearTimeout(timer);
      // Don't stop translation on unmount - keep it running
    };
  }, [language]);

  return <>{children}</>;
};

export default GlobalTranslationProvider;

