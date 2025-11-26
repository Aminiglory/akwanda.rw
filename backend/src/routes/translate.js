const express = require('express');
const router = express.Router();

// Simple translation service using a free API or fallback
// For production, consider using Google Translate API, DeepL, or similar

// Fallback translations dictionary
const translations = {
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
    'Stays': 'Séjours',
    'Flights': 'Vols',
    'Rentals': 'Locations',
    'Home': 'Accueil',
    'Apartments': 'Appartements',
    'Hotels': 'Hôtels',
    'Homes': 'Maisons',
    'Resorts': 'Complexes',
    'Tours & Activities': 'Tours & Activités',
    'Restaurants': 'Restaurants',
    'Deals': 'Offres',
    'List your property': 'Référencer votre propriété',
    'Favorites': 'Favoris',
    'Notifications': 'Notifications',
    'My Bookings': 'Mes réservations',
    'Admin Dashboard': 'Tableau de bord admin',
    'Reports': 'Rapports',
    'Content': 'Contenu',
    'My Profile': 'Mon profil',
    'Help': 'Aide',
    'Sign Out': 'Déconnexion',
    'Search flights': 'Rechercher des vols',
    'Flight deals': 'Offres de vols',
    'Multi-city': 'Multi-destinations',
    'Rent a car': 'Louer une voiture',
    'Rent a motorcycle': 'Louer une moto',
    'Rent a bicycle': 'Louer un vélo',
    'My Cars': 'Mes véhicules',
    'Car deals': 'Offres de voitures',
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
    'Stays': 'Guhagarara',
    'Flights': 'Indege',
    'Rentals': 'Gukodesha',
  }
};

// POST /api/translate - Translate text
router.post('/', async (req, res) => {
  try {
    const { text, sourceLang = 'en', targetLang = 'en' } = req.body || {};
    
    if (!text || typeof text !== 'string') {
      return res.status(400).json({ message: 'Invalid text provided' });
    }
    
    if (targetLang === sourceLang || targetLang === 'en') {
      return res.json({ translation: text, sourceLang, targetLang });
    }
    
    // Check fallback dictionary first
    if (translations[targetLang] && translations[targetLang][text]) {
      return res.json({ 
        translation: translations[targetLang][text], 
        sourceLang, 
        targetLang,
        method: 'dictionary'
      });
    }
    
    // Try using LibreTranslate (free, self-hosted option) or similar
    // For now, return original text with a note
    // In production, integrate with a translation service
    
    // Option: Use LibreTranslate API (if available)
    try {
      const libreTranslateUrl = process.env.LIBRETRANSLATE_URL || 'https://libretranslate.de/translate';
      const response = await fetch(libreTranslateUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          q: text,
          source: sourceLang,
          target: targetLang,
          format: 'text'
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.translatedText) {
          return res.json({ 
            translation: data.translatedText, 
            sourceLang, 
            targetLang,
            method: 'api'
          });
        }
      }
    } catch (apiError) {
      console.warn('Translation API failed, using fallback:', apiError.message);
    }
    
    // Fallback: return original text
    res.json({ 
      translation: text, 
      sourceLang, 
      targetLang,
      method: 'fallback',
      note: 'Translation not available, using original text'
    });
    
  } catch (error) {
    console.error('Translation error:', error);
    res.status(500).json({ message: 'Translation failed', error: error.message });
  }
});

// POST /api/translate/batch - Translate multiple texts
router.post('/batch', async (req, res) => {
  try {
    const { texts, sourceLang = 'en', targetLang = 'en' } = req.body || {};
    
    if (!Array.isArray(texts)) {
      return res.status(400).json({ message: 'Invalid texts array' });
    }
    
    if (targetLang === sourceLang || targetLang === 'en') {
      return res.json({ translations: texts, sourceLang, targetLang });
    }
    
    // Translate each text
    const translations = await Promise.all(
      texts.map(async (text) => {
        if (!text || typeof text !== 'string') return text;
        
        // Check dictionary
        if (translations[targetLang] && translations[targetLang][text]) {
          return translations[targetLang][text];
        }
        
        // Try API translation (same as single translation)
        try {
          const libreTranslateUrl = process.env.LIBRETRANSLATE_URL || 'https://libretranslate.de/translate';
          const response = await fetch(libreTranslateUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              q: text,
              source: sourceLang,
              target: targetLang,
              format: 'text'
            })
          });
          
          if (response.ok) {
            const data = await response.json();
            return data.translatedText || text;
          }
        } catch (apiError) {
          console.warn('Batch translation API failed for text:', text);
        }
        
        return text;
      })
    );
    
    res.json({ translations, sourceLang, targetLang });
    
  } catch (error) {
    console.error('Batch translation error:', error);
    res.status(500).json({ message: 'Batch translation failed', error: error.message });
  }
});

module.exports = router;

