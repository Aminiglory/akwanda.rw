/**
 * Auto-translate utility - Automatically translates all text content
 * This works at the React component level by wrapping text nodes
 */

import React from 'react';
import { useLocale } from '../contexts/LocaleContext';
import { translateText } from './translator';

// Cache for translated text to avoid re-translating
const translationCache = new Map();

/**
 * Auto-translate component - Wraps children and automatically translates text
 */
export const AutoTranslate = ({ children, skip = false, className = '', as: Component = 'span', ...props }) => {
  const { language } = useLocale() || { language: 'en' };
  const [translated, setTranslated] = React.useState(children);

  React.useEffect(() => {
    if (skip || language === 'en' || !children) {
      setTranslated(children);
      return;
    }

    const translate = async () => {
      if (typeof children === 'string') {
        const cacheKey = `${children}:${language}`;
        if (translationCache.has(cacheKey)) {
          setTranslated(translationCache.get(cacheKey));
          return;
        }
        
        try {
          const result = await translateText(children, language, 'en');
          translationCache.set(cacheKey, result);
          setTranslated(result);
        } catch {
          setTranslated(children);
        }
      } else if (React.isValidElement(children)) {
        // For React elements, translate their text content
        setTranslated(children);
      } else {
        setTranslated(children);
      }
    };

    translate();
  }, [children, language, skip]);

  return <Component className={className} {...props}>{translated}</Component>;
};

/**
 * Hook to get auto-translate function
 */
export const useAutoTranslate = () => {
  const { language } = useLocale() || { language: 'en' };
  
  const translate = React.useCallback(async (text) => {
    if (!text || typeof text !== 'string' || language === 'en') return text;
    
    const cacheKey = `${text}:${language}`;
    if (translationCache.has(cacheKey)) {
      return translationCache.get(cacheKey);
    }
    
    try {
      const result = await translateText(text, language, 'en');
      translationCache.set(cacheKey, result);
      return result;
    } catch {
      return text;
    }
  }, [language]);
  
  return { translate, language };
};

