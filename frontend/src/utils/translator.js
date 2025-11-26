/**
 * Global Translator Utility
 * Provides dynamic translation capabilities for the entire application
 * Supports both static dictionary translations and dynamic API-based translations
 */

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// Translation cache to avoid repeated API calls
const translationCache = new Map();
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

// Fallback translations for common terms
const fallbackTranslations = {
  en: {},
  fr: {
    'Search': 'Rechercher',
    'Properties': 'Propriétés',
    'Vehicles': 'Véhicules',
    'Attractions': 'Attractions',
    'Dashboard': 'Tableau de bord',
    'Settings': 'Paramètres',
    'Profile': 'Profil',
    'Bookings': 'Réservations',
    'Messages': 'Messages',
    'Logout': 'Déconnexion',
    'Login': 'Connexion',
    'Register': 'Inscription',
    'Price': 'Prix',
    'Location': 'Emplacement',
    'Available': 'Disponible',
    'Unavailable': 'Indisponible',
    'View Details': 'Voir les détails',
    'Book Now': 'Réserver maintenant',
    'Cancel': 'Annuler',
    'Save': 'Enregistrer',
    'Delete': 'Supprimer',
    'Edit': 'Modifier',
    'Create': 'Créer',
    'Update': 'Mettre à jour',
    'Loading': 'Chargement',
    'Error': 'Erreur',
    'Success': 'Succès',
  },
  rw: {
    'Search': 'Shakisha',
    'Properties': 'Amashyamba',
    'Vehicles': 'Imodoka',
    'Attractions': 'Ibyiza',
    'Dashboard': 'Ikibaho',
    'Settings': 'Igenamiterere',
    'Profile': 'Inyandiko',
    'Bookings': 'Gahunda',
    'Messages': 'Ubutumwa',
    'Logout': 'Sohoka',
    'Login': 'Injira',
    'Register': 'Kwiyandikisha',
    'Price': 'Igiciro',
    'Location': 'Ahantu',
    'Available': 'Birabaho',
    'Unavailable': 'Ntibirabaho',
  }
};

/**
 * Translate text using API or cache
 * @param {string} text - Text to translate
 * @param {string} targetLang - Target language code (en, fr, rw)
 * @param {string} sourceLang - Source language code (default: en)
 * @returns {Promise<string>} Translated text
 */
export async function translateText(text, targetLang = 'en', sourceLang = 'en') {
  if (!text || typeof text !== 'string') return text;
  if (targetLang === sourceLang || targetLang === 'en') return text;
  
  const cacheKey = `${text}:${sourceLang}:${targetLang}`;
  const cached = translationCache.get(cacheKey);
  
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.translation;
  }
  
  // Check fallback first
  if (fallbackTranslations[targetLang] && fallbackTranslations[targetLang][text]) {
    const translation = fallbackTranslations[targetLang][text];
    translationCache.set(cacheKey, { translation, timestamp: Date.now() });
    return translation;
  }
  
  try {
    // Try API translation (if backend supports it)
    const response = await fetch(`${API_URL}/api/translate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ text, sourceLang, targetLang })
    });
    
    if (response.ok) {
      const data = await response.json();
      if (data.translation) {
        translationCache.set(cacheKey, { translation: data.translation, timestamp: Date.now() });
        return data.translation;
      }
    }
  } catch (error) {
    console.warn('Translation API failed, using fallback:', error);
  }
  
  // Fallback: return original text or use simple word replacement
  return text;
}

/**
 * Translate multiple texts in batch
 * @param {string[]} texts - Array of texts to translate
 * @param {string} targetLang - Target language
 * @param {string} sourceLang - Source language
 * @returns {Promise<string[]>} Array of translated texts
 */
export async function translateBatch(texts, targetLang = 'en', sourceLang = 'en') {
  if (!Array.isArray(texts)) return texts;
  return Promise.all(texts.map(text => translateText(text, targetLang, sourceLang)));
}

/**
 * Translate object values recursively
 * @param {Object} obj - Object to translate
 * @param {string} targetLang - Target language
 * @param {string[]} keysToTranslate - Keys to translate (if empty, translates all string values)
 * @returns {Promise<Object>} Translated object
 */
export async function translateObject(obj, targetLang = 'en', keysToTranslate = []) {
  if (!obj || typeof obj !== 'object') return obj;
  
  const translated = { ...obj };
  
  for (const key in translated) {
    if (keysToTranslate.length > 0 && !keysToTranslate.includes(key)) continue;
    
    const value = translated[key];
    if (typeof value === 'string' && value.trim()) {
      translated[key] = await translateText(value, targetLang);
    } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      translated[key] = await translateObject(value, targetLang, keysToTranslate);
    } else if (Array.isArray(value)) {
      translated[key] = await Promise.all(
        value.map(item => 
          typeof item === 'string' 
            ? translateText(item, targetLang)
            : typeof item === 'object' 
              ? translateObject(item, targetLang, keysToTranslate)
              : item
        )
      );
    }
  }
  
  return translated;
}

/**
 * React Hook for translations
 * Returns a translate function that uses current language from context
 */
export function useTranslator() {
  const { language } = require('../contexts/LocaleContext').useLocale() || { language: 'en' };
  
  const t = async (text, fallback = null) => {
    if (!text) return fallback || '';
    if (language === 'en') return text;
    try {
      return await translateText(text, language, 'en');
    } catch {
      return fallback || text;
    }
  };
  
  return { t, language };
}

/**
 * Auto-translate DOM elements
 * @param {string} selector - CSS selector for elements to translate
 * @param {string} targetLang - Target language
 */
export async function translateDOM(selector, targetLang = 'en') {
  if (targetLang === 'en') return;
  
  const elements = document.querySelectorAll(selector);
  for (const element of elements) {
    const text = element.textContent?.trim();
    if (text && !element.dataset.translated) {
      const translated = await translateText(text, targetLang);
      if (translated !== text) {
        element.textContent = translated;
        element.dataset.translated = 'true';
      }
    }
  }
}

/**
 * Clear translation cache
 */
export function clearTranslationCache() {
  translationCache.clear();
}

/**
 * Get translation statistics
 */
export function getTranslationStats() {
  return {
    cacheSize: translationCache.size,
    languages: Object.keys(fallbackTranslations)
  };
}

