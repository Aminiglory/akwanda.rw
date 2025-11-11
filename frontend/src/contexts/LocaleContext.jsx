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
      signOut: 'Sign Out',
      searchFlights: 'Search flights',
      flightDeals: 'Flight deals',
      multiCity: 'Multi-city',
      rentCar: 'Rent a car',
      rentMotorcycle: 'Rent a motorcycle',
      rentBicycle: 'Rent a bicycle',
      myCars: 'My Cars',
      carDeals: 'Car deals',
      home: 'Home',
      ratesAvailability: 'Rates & Availability',
      calendar: 'Calendar',
      openCloseRooms: 'Open/close rooms',
      copyYearlyRates: 'Copy yearly rates',
      dynamicRestrictionRules: 'Dynamic restriction rules',
      ratePlans: 'Rate plans',
      valueAdds: 'Value adds',
      availabilityPlanner: 'Availability planner',
      pricingPerGuest: 'Pricing per guest',
      countryRates: 'Country rates',
      mobileRates: 'Mobile rates',
      promotions: 'Promotions',
      chooseNewPromotion: 'Choose new promotion',
      simulateMaxDiscount: 'Simulate max discount',
      yourActivePromotions: 'Your active promotions',
      reservations: 'Reservations',
      allReservations: 'All reservations',
      upcoming: 'Upcoming',
      checkedIn: 'Checked in',
      checkedOut: 'Checked out',
      cancelled: 'Cancelled',
      property: 'Property',
      qualityRating: 'Quality rating',
      propertyPageScore: 'Property page score',
      generalInfo: 'General info & property status',
      vatTax: 'VAT/tax/charges',
      photos: 'Photos',
      propertyPolicies: 'Property policies',
      reservationPolicies: 'Reservation policies',
      facilitiesServices: 'Facilities & services',
      roomDetails: 'Room details',
      roomAmenities: 'Room amenities',
      yourProfile: 'Your profile',
      viewDescriptions: 'View your descriptions',
      messagingPreferences: 'Messaging preferences',
      sustainability: 'Sustainability',
      boostPerformance: 'Boost performance',
      opportunityCentre: 'Opportunity Centre',
      commissionFreeBookings: 'Commission-free bookings',
      geniusPartnerProgramme: 'Genius partner programme',
      preferredPartnerProgramme: 'Preferred Partner Programme',
      longStaysToolkit: 'Long stays toolkit',
      visibilityBooster: 'Visibility booster',
      workFriendlyProgramme: 'Work-Friendly Programme',
      unitDifferentiationTool: 'Unit differentiation tool',
      inbox: 'Inbox',
      reservationMessages: 'Reservation messages',
      bookingComMessages: 'Booking.com messages',
      guestQandA: 'Guest Q&A',
      guestReviews: 'Guest reviews',
      guestExperience: 'Guest experience',
      finance: 'Finance',
      invoices: 'Invoices',
      reservationsStatement: 'Reservations statement',
      financialOverview: 'Financial overview',
      financeSettings: 'Finance settings',
      analytics: 'Analytics',
      analyticsDashboard: 'Analytics dashboard',
      demandForLocation: 'Demand for location',
      yourPaceOfBookings: 'Your pace of bookings',
      salesStatistics: 'Sales statistics',
      bookerInsights: 'Booker insights',
      bookwindowInformation: 'Bookwindow information',
      cancellationCharacteristics: 'Cancellation characteristics',
      manageYourCompetitiveSet: 'Manage your competitive set',
      geniusReport: 'Genius report',
      rankingDashboard: 'Ranking dashboard',
      performanceDashboard: 'Performance dashboard',
      viewAll: 'View All',
      profile: 'Profile',
      accountSettings: 'Account settings',
      logout: 'Log out'
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
      ownerLoginSubtitle: 'Sign in to access your owner dashboard',
      ownerPrompt: 'Are you a property owner?'
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
      signOut: 'Déconnexion',
      searchFlights: 'Rechercher des vols',
      flightDeals: 'Offres de vols',
      multiCity: 'Multi-destinations',
      rentCar: 'Louer une voiture',
      rentMotorcycle: 'Louer une moto',
      rentBicycle: 'Louer un vélo',
      myCars: 'Mes véhicules',
      carDeals: 'Offres de voitures',
      home: 'Accueil',
      ratesAvailability: 'Tarifs et disponibilités',
      calendar: 'Calendrier',
      openCloseRooms: 'Ouvrir/fermer des chambres',
      copyYearlyRates: 'Copier les tarifs annuels',
      dynamicRestrictionRules: 'Règles de restriction dynamiques',
      ratePlans: 'Plans tarifaires',
      valueAdds: 'Avantages',
      availabilityPlanner: 'Planificateur de disponibilité',
      pricingPerGuest: 'Tarification par personne',
      countryRates: 'Tarifs par pays',
      mobileRates: 'Tarifs mobiles',
      promotions: 'Promotions',
      chooseNewPromotion: 'Choisir une nouvelle promotion',
      simulateMaxDiscount: 'Simuler la remise maximale',
      yourActivePromotions: 'Vos promotions actives',
      reservations: 'Réservations',
      allReservations: 'Toutes les réservations',
      upcoming: 'À venir',
      checkedIn: 'Arrivés',
      checkedOut: 'Partis',
      cancelled: 'Annulées',
      property: 'Propriété',
      qualityRating: 'Indice de qualité',
      propertyPageScore: 'Score de la page propriété',
      generalInfo: 'Infos générales & statut',
      vatTax: 'TVA/taxes/frais',
      photos: 'Photos',
      propertyPolicies: 'Règles de la propriété',
      reservationPolicies: 'Règles de réservation',
      facilitiesServices: 'Équipements & services',
      roomDetails: 'Détails des chambres',
      roomAmenities: 'Équipements des chambres',
      yourProfile: 'Votre profil',
      viewDescriptions: 'Vos descriptions',
      messagingPreferences: 'Préférences de messagerie',
      sustainability: 'Durabilité',
      boostPerformance: 'Booster la performance',
      opportunityCentre: 'Centre d’opportunités',
      commissionFreeBookings: 'Réservations sans commission',
      geniusPartnerProgramme: 'Programme Genius',
      preferredPartnerProgramme: 'Programme Partenaire Préféré',
      longStaysToolkit: 'Outils longs séjours',
      visibilityBooster: 'Booster de visibilité',
      workFriendlyProgramme: 'Programme adapté au travail',
      unitDifferentiationTool: 'Outil de différenciation des unités',
      inbox: 'Boîte de réception',
      reservationMessages: 'Messages de réservation',
      bookingComMessages: 'Messages plateforme',
      guestQandA: 'Questions/Réponses clients',
      guestReviews: 'Avis des clients',
      guestExperience: 'Expérience client',
      finance: 'Finance',
      invoices: 'Factures',
      reservationsStatement: 'Relevé des réservations',
      financialOverview: 'Vue d’ensemble financière',
      financeSettings: 'Paramètres de finance',
      analytics: 'Analytique',
      analyticsDashboard: 'Tableau de bord analytique',
      demandForLocation: 'Demande pour le lieu',
      yourPaceOfBookings: 'Rythme de réservations',
      salesStatistics: 'Statistiques de ventes',
      bookerInsights: 'Aperçus des réservataires',
      bookwindowInformation: 'Fenêtre de réservation',
      cancellationCharacteristics: 'Caractéristiques des annulations',
      manageYourCompetitiveSet: 'Gérer votre ensemble concurrentiel',
      geniusReport: 'Rapport Genius',
      rankingDashboard: 'Tableau de classement',
      performanceDashboard: 'Tableau de performance',
      viewAll: 'Tout voir',
      profile: 'Profil',
      accountSettings: 'Paramètres du compte',
      logout: 'Se déconnecter'
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
      ownerLoginSubtitle: 'Connectez-vous pour accéder à votre tableau de bord',
      ownerPrompt: 'Êtes-vous propriétaire ?'
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
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
        
        const res = await fetch('https://api.exchangerate.host/latest?base=RWF&symbols=USD,EUR,RWF', {
          signal: controller.signal
        });
        clearTimeout(timeoutId);
        
        if (!res.ok) {
          console.warn('Exchange rate API returned non-OK status, using fallback rates');
          if (!cancelled) {
            setRates({ RWF: 1, USD: 0.00077, EUR: 0.00071 }); // Fallback rates
          }
          return;
        }
        const data = await res.json();
        if (!cancelled && data && data.rates) {
          setRates(data.rates);
          try { localStorage.setItem('fx_rates', JSON.stringify(data.rates)); } catch {}
        }
      } catch (err) {
        // Network error or timeout - use fallback rates
        console.warn('Exchange rate fetch failed, using fallback rates:', err.message);
        if (!cancelled) {
          setRates({ RWF: 1, USD: 0.00077, EUR: 0.00071 }); // Fallback rates (approximate)
        }
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
    if (cur === 'RWF') return `RWF ${Math.round(converted).toLocaleString()}`;
    try {
      const fmt = new Intl.NumberFormat(undefined, { style: 'currency', currency: cur, maximumFractionDigits: 2 });
      return fmt.format(converted);
    } catch {
      return `${cur} ${converted.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
    }
  };

  // Universal formatter: convert from any base currency into the selected currency
  const formatCurrency = (amount, baseCurrency = 'RWF') => {
    const amt = Number(amount || 0);
    const target = (currency || DEFAULT_CURRENCY).toUpperCase();
    const base = String(baseCurrency || 'RWF').toUpperCase();
    // If no rates yet, fallback to showing base currency with naive formatting
    if (!rates || !rates['RWF']) {
      const symbolBase = base === 'USD' ? '$' : (base === 'EUR' ? '€' : base);
      return `${symbolBase} ${amt.toLocaleString()}`;
    }
    // Convert base -> RWF
    let amountInRwf = amt;
    if (base !== 'RWF') {
      if (!rates[base] || rates[base] === 0) {
        const symbolBase = base === 'USD' ? '$' : (base === 'EUR' ? '€' : base);
        return `${symbolBase} ${amt.toLocaleString()}`;
      }
      // Since rates are base RWF, 1 RWF = rates[base] units of base.
      // Therefore 1 unit of base = 1 / rates[base] RWF.
      amountInRwf = amt / rates[base];
    }
    // RWF -> target
    const tRate = rates[target];
    if (!tRate) {
      // Fallback to RWF
      return `RWF ${Math.round(amountInRwf).toLocaleString()}`;
    }
    const converted = amountInRwf * tRate;
    if (target === 'RWF') return `RWF ${Math.round(converted).toLocaleString()}`;
    try {
      const fmt = new Intl.NumberFormat(undefined, { style: 'currency', currency: target, maximumFractionDigits: 2 });
      return fmt.format(converted);
    } catch {
      return `${target} ${converted.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
    }
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

  // Localize dynamic values coming from Admin CMS or backend
  // Accepts:
  // - string: returned as-is
  // - object: tries value[language] -> value[DEFAULT_LANG] -> first string value
  const localize = (value) => {
    if (value == null) return '';
    if (typeof value === 'string') return value;
    if (typeof value === 'object') {
      const v = value[language] ?? value[DEFAULT_LANG];
      if (typeof v === 'string') return v;
      // Try to find any string entry
      for (const k in value) {
        if (typeof value[k] === 'string') return value[k];
      }
    }
    return String(value);
  };

  const value = useMemo(() => ({ language, setLanguage, currency, setCurrency, t, rates, formatCurrencyRWF, formatCurrency, localize }), [language, currency, t, rates]);
  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
};

export const useLocale = () => useContext(LocaleContext);
