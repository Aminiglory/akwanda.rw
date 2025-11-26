/**
 * Global Translator - Automatically translates ALL text content in the application
 * This system intercepts and translates text at multiple levels:
 * 1. React component level (via HOC)
 * 2. DOM level (via MutationObserver)
 * 3. API response level (via interceptors)
 */

import { translateText } from './translator';

let currentLanguage = 'en';
let translationObserver = null;
let isObserving = false;

// Text nodes that should NOT be translated (e.g., code, numbers, URLs)
const shouldSkipTranslation = (text) => {
  if (!text || typeof text !== 'string') return true;
  const trimmed = text.trim();
  
  // Skip if empty
  if (!trimmed) return true;
  
  // Skip if it's a number
  if (/^\d+$/.test(trimmed)) return true;
  
  // Skip if it's a URL
  if (/^https?:\/\//.test(trimmed)) return true;
  
  // Skip if it's an email
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) return true;
  
  // Skip if it's mostly numbers/symbols (e.g., phone numbers, prices with symbols)
  if (/^[\d\s\-\+\(\)\$€£¥]+$/.test(trimmed)) return true;
  
  // Skip if it's too short (likely an abbreviation or code)
  if (trimmed.length < 2) return true;
  
  // Skip if it contains code-like patterns
  if (/^[A-Z_]+$/.test(trimmed) && trimmed.length < 10) return true;
  
  return false;
};

/**
 * Translate a text node
 */
const translateTextNode = async (node) => {
  if (node.nodeType !== Node.TEXT_NODE) return;
  
  const text = node.textContent?.trim();
  if (!text || shouldSkipTranslation(text)) return;
  
  // Skip if already translated
  if (node.dataset?.translated === 'true') return;
  
  // Skip if parent has data-no-translate attribute
  let parent = node.parentElement;
  while (parent) {
    if (parent.dataset?.noTranslate === 'true') return;
    parent = parent.parentElement;
  }
  
  try {
    const translated = await translateText(text, currentLanguage, 'en');
    if (translated !== text && translated) {
      node.textContent = translated;
      node.dataset.translated = 'true';
    }
  } catch (error) {
    console.warn('Translation failed for text node:', error);
  }
};

/**
 * Translate all text nodes in an element
 */
const translateElement = async (element) => {
  if (!element) return;
  
  // Skip if element has data-no-translate
  if (element.dataset?.noTranslate === 'true') return;
  
  const walker = document.createTreeWalker(
    element,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode: (node) => {
        const text = node.textContent?.trim();
        if (!text || shouldSkipTranslation(text)) {
          return NodeFilter.FILTER_REJECT;
        }
        if (node.dataset?.translated === 'true') {
          return NodeFilter.FILTER_REJECT;
        }
        // Check parent chain for no-translate
        let parent = node.parentElement;
        while (parent) {
          if (parent.dataset?.noTranslate === 'true') {
            return NodeFilter.FILTER_REJECT;
          }
          parent = parent.parentElement;
        }
        return NodeFilter.FILTER_ACCEPT;
      }
    }
  );
  
  const textNodes = [];
  let node;
  while ((node = walker.nextNode())) {
    textNodes.push(node);
  }
  
  // Translate all text nodes
  await Promise.all(textNodes.map(translateTextNode));
};

/**
 * Start global translation observer
 */
export const startGlobalTranslation = (language = 'en') => {
  if (isObserving && currentLanguage === language) return;
  
  currentLanguage = language;
  
  // Stop existing observer
  if (translationObserver) {
    translationObserver.disconnect();
  }
  
  if (language === 'en') {
    isObserving = false;
    return;
  }
  
  isObserving = true;
  
  // Translate existing content
  translateElement(document.body).catch(console.error);
  
  // Observe new content
  translationObserver = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type === 'childList') {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            translateElement(node).catch(console.error);
          } else if (node.nodeType === Node.TEXT_NODE) {
            translateTextNode(node).catch(console.error);
          }
        });
      } else if (mutation.type === 'characterData') {
        translateTextNode(mutation.target).catch(console.error);
      }
    });
  });
  
  translationObserver.observe(document.body, {
    childList: true,
    subtree: true,
    characterData: true
  });
};

/**
 * Stop global translation observer
 */
export const stopGlobalTranslation = () => {
  if (translationObserver) {
    translationObserver.disconnect();
    translationObserver = null;
  }
  isObserving = false;
};

/**
 * Update language and retranslate
 */
export const updateGlobalTranslation = (language) => {
  // Clear all translated markers
  document.querySelectorAll('[data-translated="true"]').forEach((el) => {
    delete el.dataset.translated;
  });
  
  // Restart with new language
  startGlobalTranslation(language);
};

/**
 * React Hook for global translation
 */
export const useGlobalTranslation = () => {
  const React = require('react');
  const { language } = require('../contexts/LocaleContext').useLocale() || { language: 'en' };
  
  React.useEffect(() => {
    updateGlobalTranslation(language);
    return () => {
      // Don't stop on unmount, keep it running
    };
  }, [language]);
  
  return { language };
};

/**
 * Higher-Order Component to auto-translate component text
 */
export const withGlobalTranslation = (Component) => {
  return function TranslatedComponent(props) {
    // Dynamic import to avoid circular dependencies
    const React = require('react');
    const { language } = require('../contexts/LocaleContext').useLocale() || { language: 'en' };
    
    React.useEffect(() => {
      // Component will be translated by DOM observer
      // But we can also translate props that contain text
      if (language !== 'en' && props.children) {
        // Children will be handled by DOM observer
      }
    }, [language, props.children]);
    
    return React.createElement(Component, props);
  };
};

/**
 * Translate API response data
 */
export const translateApiResponse = async (data, language = 'en') => {
  if (language === 'en' || !data) return data;
  
  if (typeof data === 'string') {
    return await translateText(data, language, 'en');
  }
  
  if (Array.isArray(data)) {
    return await Promise.all(data.map(item => translateApiResponse(item, language)));
  }
  
  if (typeof data === 'object') {
    const translated = {};
    for (const key in data) {
      // Skip certain keys that shouldn't be translated
      if (['_id', 'id', 'email', 'phone', 'url', 'image', 'images', 'avatar', 'password', 'token'].includes(key)) {
        translated[key] = data[key];
        continue;
      }
      
      // Translate string values
      if (typeof data[key] === 'string') {
        if (!shouldSkipTranslation(data[key])) {
          translated[key] = await translateText(data[key], language, 'en');
        } else {
          translated[key] = data[key];
        }
      } else {
        // Recursively translate nested objects/arrays
        translated[key] = await translateApiResponse(data[key], language);
      }
    }
    return translated;
  }
  
  return data;
};

/**
 * Intercept fetch to auto-translate responses
 */
let originalFetch = window.fetch;
let isIntercepting = false;

export const enableFetchInterception = () => {
  if (isIntercepting) return;
  
  isIntercepting = true;
  window.fetch = async function(...args) {
    const response = await originalFetch.apply(this, args);
    
    // Only intercept JSON responses from our API
    const url = args[0];
    if (typeof url === 'string' && url.includes('/api/') && response.headers.get('content-type')?.includes('application/json')) {
      const clonedResponse = response.clone();
      try {
        const data = await clonedResponse.json();
        const translated = await translateApiResponse(data, currentLanguage);
        return new Response(JSON.stringify(translated), {
          status: response.status,
          statusText: response.statusText,
          headers: response.headers
        });
      } catch (error) {
        // If parsing fails, return original response
        return response;
      }
    }
    
    return response;
  };
};

export const disableFetchInterception = () => {
  if (!isIntercepting) return;
  window.fetch = originalFetch;
  isIntercepting = false;
};

// React will be imported by components using this

