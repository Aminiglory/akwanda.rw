import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

const DEFAULT_LANG = 'en';
const DEFAULT_CURRENCY = 'RWF';

const dictionaries = {
  en: {
    brand: 'AKWANDA.rw',
    nav: {
      stays: 'Stays',
      flights: 'Flights',
      rentals: 'Rentals',
      attractions: 'Attractions',
      homes: 'Homes',
      apartments: 'Apartments',
      hotels: 'Hotels',
      resorts: 'Resorts',
      tours: 'Tours & Activities',
      restaurants: 'Restaurants',
      deals: 'Deals',
      listProperty: 'List your property',
      favorites: 'Favorites',
      messages: 'Messages',
      login: 'Login',
      ownerLogin: 'Owner Login',
      signUp: 'Sign Up',
      dashboard: 'Dashboard',
      notifications: 'Notifications',
      myProfile: 'My Profile',
      settings: 'Settings',
      help: 'Help',
      signOut: 'Sign Out'
    },
    footer: {
      forGuests: 'For Guests',
      forHosts: 'For Hosts',
      company: 'Company',
      support: 'Support',
      searchApartments: 'Search Apartments',
      howToBook: 'How to Book',
      guestReviews: 'Guest Reviews',
      listProperty: 'List Your Property',
      hostGuidelines: 'Host Guidelines',
      hostSupport: 'Host Support',
      aboutUs: 'About Us',
      contactUs: 'Contact Us',
      helpCenter: 'Help Center',
      safetyCenter: 'Safety Center',
      terms: 'Terms of Service',
      privacy: 'Privacy Policy',
      quickLinks: 'Quick Links',
      apartments: 'Apartments',
      bottomCopyright: (year) => `© ${year} AKWANDA.rw. All rights reserved.`
    },
    hero: {
      title: 'Welcome to AKWANDA.rw',
      subtitle: 'Find places to stay, cars, and attractions',
      activeListings: 'Active Listings',
      happyGuests: 'Happy Guests',
      satisfactionRate: 'Satisfaction Rate'
    },
    vehicles: {
      title: 'Vehicle Rentals',
      subtitle: 'Find the perfect car, motorcycle, or bicycle',
      location: 'Location',
      allTypes: 'All types',
      searchBrandModel: 'Search brand/model',
      searchVehicles: 'Search Vehicles',
      grid: 'Grid',
      table: 'Table',
      vehicle: 'Vehicle',
      brandModel: 'Brand/Model',
      type: 'Type',
      pricePerDay: 'Price/day',
      rating: 'Rating',
      capacity: 'Capacity',
      fuel: 'Fuel',
      action: 'Action',
      view: 'View'
    },
    vehicleDetail: {
      pricePerDay: 'per day',
      pickupDate: 'Pickup date',
      returnDate: 'Return date',
      pickupTime: 'Pickup time',
      returnTime: 'Return time',
      pickupLocation: 'Pickup location',
      returnLocation: 'Return location',
      checkAvailability: 'Check availability',
      available: 'Available',
      notAvailable: 'Not available',
      payOnPickup: 'Pay on Pickup',
      payWithMTN: 'MTN Mobile Money',
      bookNow: 'Book now',
      otherYouMightLike: 'Other vehicles you might like'
    },
    transactions: {
      title: 'Transactions',
      totalAmount: 'Total amount',
      type: 'Type',
      date: 'Date',
      code: 'Code',
      amount: 'Amount',
      status: 'Status',
      carBookings: 'Car bookings',
      attractionBookings: 'Attraction bookings',
      all: 'All',
      exportCsv: 'Export CSV',
      print: 'Print'
    },
    home: {
      featuredDestinations: 'Featured destinations',
      explore: 'Explore',
      trustedByPartners: 'Trusted by partners',
      listCtaTitle: 'List your property with AKWANDA.rw',
      listCtaSubtitle: 'Reach guests faster with our owner tools and promotions.',
      getStarted: 'Get started'
    },
    featured: {
      title: 'Featured Apartments',
      subtitle: 'Discover our most popular and highly-rated stays',
      moreOptionsTitle: 'Looking for more options?',
      moreOptionsSubtitle: 'Browse all apartments and filter by location, price, and amenities.',
      viewAll: 'View All Apartments'
    },
    auth: {
      loginTitle: 'Welcome back',
      loginSubtitle: 'Sign in to your AKWANDA.rw account',
      email: 'Email address',
      password: 'Password',
      signIn: 'Sign in',
      rememberMe: 'Remember me',
      forgotPassword: 'Forgot password?',
      notHostYet: 'Not a host yet?',
      createAccount: 'Create an account',
      registerTitle: 'Create your account',
      registerSubtitle: 'Join AKWANDA.rw and start your apartment journey',
      iWantTo: 'I want to',
      findApartments: 'Find Apartments',
      becomeHost: 'Become a Host',
      ownerLoginTitle: 'Property Owner Login',
      ownerLoginSubtitle: 'Sign in to access your owner dashboard'
    },
    settings: {
      title: 'Settings',
      subtitle: 'Manage your account settings and preferences'
    }
  },
  fr: {
    brand: 'AKWANDA.rw',
    nav: {
      stays: 'Séjours',
      flights: 'Vols',
      rentals: 'Locations',
      attractions: 'Attractions',
      homes: 'Maisons',
      apartments: 'Appartements',
      hotels: 'Hôtels',
      resorts: 'Complexes',
      tours: 'Tours & Activités',
      restaurants: 'Restaurants',
      deals: 'Offres',
      listProperty: 'Référencer votre propriété',
      favorites: 'Favoris',
      messages: 'Messages',
      login: 'Connexion',
      ownerLogin: 'Connexion Propriétaire',
      signUp: 'Inscription',
      dashboard: 'Tableau de bord',
      notifications: 'Notifications',
      myProfile: 'Mon profil',
      settings: 'Paramètres',
      help: 'Aide',
      signOut: 'Déconnexion'
    },
    footer: {
      forGuests: 'Pour les clients',
      forHosts: 'Pour les hôtes',
      company: 'Entreprise',
      support: 'Assistance',
      searchApartments: 'Rechercher des appartements',
      howToBook: 'Comment réserver',
      guestReviews: 'Avis des clients',
      listProperty: 'Référencer une propriété',
      hostGuidelines: 'Conseils pour hôtes',
      hostSupport: 'Support hôte',
      aboutUs: 'À propos de nous',
      contactUs: 'Contactez-nous',
      helpCenter: 'Centre d’aide',
      safetyCenter: 'Centre de sécurité',
      terms: 'Conditions d’utilisation',
      privacy: 'Politique de confidentialité',
      quickLinks: 'Liens rapides',
      apartments: 'Appartements',
      bottomCopyright: (year) => `© ${year} AKWANDA.rw. Tous droits réservés.`
    },
    hero: {
      title: 'Bienvenue sur AKWANDA.rw',
      subtitle: 'Trouvez des hébergements, des voitures et des attractions',
      activeListings: 'Annonces actives',
      happyGuests: 'Clients satisfaits',
      satisfactionRate: 'Taux de satisfaction'
    },
    vehicles: {
      title: 'Location de véhicules',
      subtitle: 'Trouvez la voiture, la moto ou le vélo idéal',
      location: 'Lieu',
      allTypes: 'Tous les types',
      searchBrandModel: 'Rechercher marque/modèle',
      searchVehicles: 'Rechercher des véhicules',
      grid: 'Grille',
      table: 'Tableau',
      vehicle: 'Véhicule',
      brandModel: 'Marque/Modèle',
      type: 'Type',
      pricePerDay: 'Prix/jour',
      rating: 'Note',
      capacity: 'Capacité',
      fuel: 'Carburant',
      action: 'Action',
      view: 'Voir'
    },
    vehicleDetail: {
      pricePerDay: 'par jour',
      pickupDate: 'Date de prise en charge',
      returnDate: 'Date de retour',
      pickupTime: 'Heure de prise en charge',
      returnTime: 'Heure de retour',
      pickupLocation: 'Lieu de prise en charge',
      returnLocation: 'Lieu de retour',
      checkAvailability: 'Vérifier la disponibilité',
      available: 'Disponible',
      notAvailable: 'Non disponible',
      payOnPickup: 'Payer au retrait',
      payWithMTN: 'MTN Mobile Money',
      bookNow: 'Réserver',
      otherYouMightLike: 'Autres véhicules susceptibles de vous plaire'
    },
    transactions: {
      title: 'Transactions',
      totalAmount: 'Montant total',
      type: 'Type',
      date: 'Date',
      code: 'Code',
      amount: 'Montant',
      status: 'Statut',
      carBookings: 'Réservations de voiture',
      attractionBookings: 'Réservations d’attraction',
      all: 'Tous',
      exportCsv: 'Exporter CSV',
      print: 'Imprimer'
    },
    home: {
      featuredDestinations: 'Destinations à la une',
      explore: 'Explorer',
      trustedByPartners: 'Ils nous font confiance',
      listCtaTitle: 'Référencez votre propriété sur AKWANDA.rw',
      listCtaSubtitle: 'Atteignez plus vite vos clients grâce à nos outils et promotions.',
      getStarted: 'Commencer'
    },
    featured: {
      title: 'Appartements à la une',
      subtitle: 'Découvrez nos séjours les plus populaires et les mieux notés',
      moreOptionsTitle: 'Vous cherchez plus d’options ?',
      moreOptionsSubtitle: 'Parcourez tous les appartements et filtrez par lieu, prix et équipements.',
      viewAll: 'Voir tous les appartements'
    },
    auth: {
      loginTitle: 'Bon retour',
      loginSubtitle: 'Connectez-vous à votre compte AKWANDA.rw',
      email: 'Adresse e-mail',
      password: 'Mot de passe',
      signIn: 'Se connecter',
      rememberMe: 'Se souvenir de moi',
      forgotPassword: 'Mot de passe oublié ?',
      notHostYet: 'Pas encore hôte ?',
      createAccount: 'Créer un compte',
      registerTitle: 'Créez votre compte',
      registerSubtitle: 'Rejoignez AKWANDA.rw et commencez votre aventure',
      iWantTo: 'Je veux',
      findApartments: 'Trouver des appartements',
      becomeHost: 'Devenir hôte',
      ownerLoginTitle: 'Connexion Propriétaire',
      ownerLoginSubtitle: 'Connectez-vous pour accéder à votre tableau de bord'
    },
    settings: {
      title: 'Paramètres',
      subtitle: 'Gérez les paramètres et préférences de votre compte'
    }
  }
};

const LocaleContext = createContext(null);

export const LocaleProvider = ({ children }) => {
  const [language, setLanguage] = useState(() => localStorage.getItem('lang') || DEFAULT_LANG);
  const [currency, setCurrency] = useState(() => localStorage.getItem('currency') || DEFAULT_CURRENCY);
  const [rates, setRates] = useState(() => {
    try {
      const raw = localStorage.getItem('fx_rates');
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  });

  useEffect(() => {
    localStorage.setItem('lang', language);
    document.documentElement.lang = language;
    window.dispatchEvent(new CustomEvent('localeChanged', { detail: { language } }));
  }, [language]);

  useEffect(() => {
    localStorage.setItem('currency', currency);
    window.dispatchEvent(new CustomEvent('currencyChanged', { detail: { currency } }));
  }, [currency]);

  // Fetch FX rates (base RWF) for simple client-side conversion
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // Use exchangerate.host (no API key) with base RWF
        const res = await fetch('https://api.exchangerate.host/latest?base=RWF&symbols=USD,EUR,RWF');
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled && data && data.rates) {
          setRates(data.rates);
          try { localStorage.setItem('fx_rates', JSON.stringify(data.rates)); } catch {}
        }
      } catch {
        // ignore; fallback to cached
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const formatCurrencyRWF = (amountRwf) => {
    const amt = Number(amountRwf || 0);
    const cur = (currency || DEFAULT_CURRENCY).toUpperCase();
    if (!rates || !rates[cur] || !rates['RWF']) {
      return `RWF ${amt.toLocaleString()}`;
    }
    // amount in target = amt * rate[target] (since base is RWF)
    const converted = amt * rates[cur];
    const symbol = cur === 'USD' ? '$' : (cur === 'EUR' ? '€' : 'RWF');
    if (cur === 'RWF') return `RWF ${Math.round(converted).toLocaleString()}`;
    return `${symbol} ${converted.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
  };

  const dict = dictionaries[language] || dictionaries[DEFAULT_LANG];

  const t = useMemo(() => {
    const fn = (path, ...args) => {
      const parts = String(path).split('.');
      let cur = dict;
      for (const p of parts) {
        if (cur && typeof cur === 'object' && p in cur) cur = cur[p];
        else return path;
      }
      if (typeof cur === 'function') return cur(...args);
      return cur;
    };
    return fn;
  }, [dict]);

  const value = useMemo(() => ({ language, setLanguage, currency, setCurrency, t, rates, formatCurrencyRWF }), [language, currency, t, rates]);
  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
};

export const useLocale = () => useContext(LocaleContext);
