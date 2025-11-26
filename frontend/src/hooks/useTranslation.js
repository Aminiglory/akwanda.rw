import { useState, useEffect, useCallback } from 'react';
import { useLocale } from '../contexts/LocaleContext';
import { translateText, translateObject, translateBatch } from '../utils/translator';

/**
 * React Hook for dynamic translations
 * Provides both synchronous (dictionary) and asynchronous (API) translation
 */
export function useTranslation() {
  const { language, t: dictT } = useLocale() || { language: 'en', t: null };
  const [isTranslating, setIsTranslating] = useState(false);

  // Synchronous translation using dictionary (fast, for UI elements)
  const t = useCallback((path, ...args) => {
    if (!dictT) return path;
    try {
      const result = dictT(path, ...args);
      // If it's a promise, handle it
      if (result && typeof result.then === 'function') {
        return result;
      }
      return result;
    } catch {
      return path;
    }
  }, [dictT]);

  // Asynchronous translation using API (for dynamic content)
  const translate = useCallback(async (text, targetLang = language, sourceLang = 'en') => {
    if (!text || typeof text !== 'string') return text;
    if (targetLang === sourceLang || targetLang === 'en') return text;
    
    setIsTranslating(true);
    try {
      const result = await translateText(text, targetLang, sourceLang);
      return result;
    } catch (error) {
      console.warn('Translation failed:', error);
      return text;
    } finally {
      setIsTranslating(false);
    }
  }, [language]);

  // Translate multiple texts
  const translateMany = useCallback(async (texts, targetLang = language, sourceLang = 'en') => {
    if (!Array.isArray(texts)) return texts;
    setIsTranslating(true);
    try {
      const results = await translateBatch(texts, targetLang, sourceLang);
      return results;
    } catch (error) {
      console.warn('Batch translation failed:', error);
      return texts;
    } finally {
      setIsTranslating(false);
    }
  }, [language]);

  // Translate object
  const translateObj = useCallback(async (obj, targetLang = language, keysToTranslate = []) => {
    if (!obj || typeof obj !== 'object') return obj;
    setIsTranslating(true);
    try {
      const result = await translateObject(obj, targetLang, keysToTranslate);
      return result;
    } catch (error) {
      console.warn('Object translation failed:', error);
      return obj;
    } finally {
      setIsTranslating(false);
    }
  }, [language]);

  return {
    t,           // Synchronous dictionary translation
    translate,   // Async API translation
    translateMany,
    translateObj,
    isTranslating,
    language
  };
}

