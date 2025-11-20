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
      myBookings: 'My Bookings',
      adminDashboard: 'Admin Dashboard',
      adminReports: 'Reports',
      landingContent: 'Content',
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
      bookingComMessages: 'Akwanda.rw messages',
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
      searchApartments: 'Search Properties',
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
      bottomCopyright: (year) => ` ${year} AKWANDA.rw. All rights reserved.`
    },
    hero: {
      title: 'Welcome to AKWANDA.rw',
      subtitle: 'Find places to stay, cars, and attractions',
      activeListings: 'Active Listings',
      happyGuests: 'Happy Guests',
      satisfactionRate: 'Satisfaction Rate'
    },
    search: {
      staysTab: 'Stays',
      carsTab: 'Cars',
      attractionsTab: 'Attractions',
      location: 'Location',
      pickupLocation: 'Pickup Location',
      whereGoing: 'Where are you going?',
      wherePickup: 'Where to pick up?',
      checkIn: 'Check-in',
      checkOut: 'Check-out',
      pickupDate: 'Pickup Date',
      returnDate: 'Return Date',
      guests: 'Guests',
      returnLocationOptional: 'Return Location (optional)',
      returnDifferentPlace: 'Return to a different place?',
      searchStays: 'Search Stays',
      searchCars: 'Search Cars',
      exploreAttractions: 'Explore Attractions',
      quickPopularCars: 'Popular Cars',
      quickFeaturedStays: 'Featured Stays',
      quickTopAttractions: 'Top Attractions'
    },
    listing: {
      propertyLocation: 'Property location',
      country: 'Country',
      findYourAddress: 'Find your address',
      city: 'City',
      searching: 'Searching…',
      coords: (lat, lon) => `Coords: ${lat ?? '—'}, ${lon ?? '—'}`,
      uploadTitle: 'Upload an apartment',
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
    // Generic CTAs (used on landing sections like Our Mission)
    cta: {
      learnMore: 'Learn more',
      contactUs: 'Contact us'
    },
    featured: {
      title: 'Featured Properties',
      subtitle: 'Discover our most popular and highly-rated stays',
      moreOptionsTitle: 'Looking for more options?',
      moreOptionsSubtitle: 'Browse all properties and filter by location, price, and amenities.',
      viewAll: 'View All properties'
    },
    property: {
      hostedBy: 'Hosted by',
      bookings: 'bookings',
      bedrooms: 'Bedrooms',
      bathrooms: 'Bathrooms',
      area: 'Area',
      viewDetails: 'View Details'
    },
    how: {
      forGuests: 'For Guests',
      forHosts: 'For Hosts',
      moreOnHow: 'More on how it works',
      faq: 'Frequently Asked Questions',
      ctaBecomeHost: 'Become a Host',
      ctaGuests: 'List your property and start earning',
      ctaAuth: 'Sign up to start listing your property'
    },
    testimonials: {
      title: 'What Our Users Say',
      subtitle: 'Real experiences from our community',
      ctaTitle: 'Ready to Join Our Community?',
      ctaMessage: "Whether you're looking for a place to stay or want to earn from your space, AKWANDA.rw is here for you.",
      btnFindApartment: 'Find an Apartment',
      btnListOrSignUp: (isUser) => isUser ? 'List Your Property' : 'Sign Up to Host',
      loading: 'Loading testimonials…'
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
  // Common messages (toasts, inline notices)
  msg: {
    mustLoginToList: 'Please login to list a property',
    ownerOnly: 'Only property owners can list properties. Please use Owner Login.',
    fillRequiredFields: 'Please fill all required fields',
    propertyUpdated: 'Property updated',
    propertyCreated: 'Property created',
    saveFailed: 'Failed to save',
    draftSaved: 'Draft saved',
    draftSaveFailed: 'Could not save draft',
    loadingPropertyData: 'Loading property data...',
    contactSaveFailed: 'Failed to save contact details',
    completeRequiredInfo: 'Complete required info',
    authRequired: 'Authorization required. Please log in as a host and try again.',
    switchToOwnerSuccess: 'Switched to Property Owner',
    ownerLoginFailed: 'Owner login failed',
    notOwnerAccount: 'That account is not a property owner',
    enterOwnerCredentials: 'Enter owner email and password',
    couldNotSwitchAccount: 'Could not switch account',
    roomImagesUploaded: 'Room images uploaded',
    roomImagesUploadFailed: 'Failed to upload room images',
    accountDeactivatedNotice: 'Your account is currently deactivated. You cannot create or edit listings until reactivated.',
  },
  // Minimal keys for listing flow (used in EnhancedUploadProperty)
  listing: {
    propertyLocation: 'Lieu de la propriété',
    country: 'Pays',
    findYourAddress: 'Trouver votre adresse',
    city: 'Ville',
    searching: 'Recherche…',
    coords: (lat, lon) => `Coords: ${lat ?? '—'}, ${lon ?? '—'}`,
    uploadTitle: 'Télécharger un appartement',
  },
  // ... (rest of the code remains the same)

  msg: {
    mustLoginToList: 'Veuillez vous connecter pour répertorier une propriété',
    ownerOnly: 'Seuls les propriétaires peuvent répertorier des propriétés. Veuillez utiliser la connexion propriétaire.',
    fillRequiredFields: 'Veuillez remplir tous les champs obligatoires',
    propertyUpdated: 'Propriété mise à jour',
    propertyCreated: 'Propriété créée',
    saveFailed: 'Échec de l\'enregistrement',
    draftSaved: 'Brouillon enregistré',
    draftSaveFailed: 'Impossible d\'enregistrer le brouillon',
    loadingPropertyData: 'Chargement des données de propriété...',
    contactSaveFailed: 'Échec de l\'enregistrement des coordonnées',
    completeRequiredInfo: 'Veuillez compléter les informations requises',
    authRequired: 'Autorisation requise. Veuillez vous connecter en tant qu\'hôte et réessayer.',
    switchToOwnerSuccess: 'Basculé vers le propriétaire',
    ownerLoginFailed: 'Échec de la connexion propriétaire',
    notOwnerAccount: 'Ce compte n\'est pas un propriétaire',
    enterOwnerCredentials: 'Entrez l\'adresse e-mail et le mot de passe du propriétaire',
    couldNotSwitchAccount: 'Impossible de basculer de compte',
    roomImagesUploaded: 'Images de chambres téléchargées',
    roomImagesUploadFailed: 'Échec du téléchargement des images de chambres',
    accountDeactivatedNotice: 'Votre compte est actuellement désactivé. Vous ne pouvez pas créer ou modifier des annonces jusqu\'à réactivation.',
    attractionsTab: 'Attractions',
    location: 'Location',
    pickupLocation: 'Pickup Location',
    whereGoing: 'Where are you going?',
    wherePickup: 'Where to pick up?',
    checkIn: 'Check-in',
    checkOut: 'Check-out',
    pickupDate: 'Pickup Date',
    returnDate: 'Return Date',
    guests: 'Guests',
    returnLocationOptional: 'Return Location (optional)',
    returnDifferentPlace: 'Return to a different place?',
    searchStays: 'Search Stays',
    searchCars: 'Search Cars',
    exploreAttractions: 'Explore Attractions',
    quickPopularCars: 'Popular Cars',
    quickFeaturedStays: 'Featured Stays',
    quickTopAttractions: 'Top Attractions'
  },
  // Landing attractions section
  landing: {
    viewAll: 'View all',
    curatedBy: 'Curated by AKWANDA.rw',
    explore: 'Explore'
  },
  // Generic CTAs
  cta: {
    learnMore: 'Learn more',
    contactUs: 'Contact us'
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
    // Navbar banners/messages
    banner: {
      accountDeactivated: 'Account deactivated',
      limitedFeatures: 'Limited features are unlocked due to a partial payment. Complete your payment to restore full visibility.',
      clearDues: 'Clear outstanding dues to restore full access and visibility.',
      commissionDue: 'Commission due',
      finesDue: 'Fines due',
      totalDue: 'Total due',
      payHalf: 'Pay Half',
      payFull: 'Pay Full',
      viewNotice: 'View notice',
      choosePropertyToManage: 'Choose property to manage',
      manageProperty: 'Manage property',
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
    property: {
      hostedBy: 'Hébergé par',
      bookings: 'réservations',
      bedrooms: 'Chambres',
      bathrooms: 'Salles de bain',
      area: 'Superficie',
      viewDetails: 'Voir les détails'
    },
    how: {
      forGuests: 'Pour les clients',
      forHosts: 'Pour les hôtes',
      moreOnHow: 'En savoir plus sur le fonctionnement',
      faq: 'Foire aux questions',
      ctaBecomeHost: 'Devenir hôte',
      ctaGuests: 'Référencez votre appartement et commencez à gagner',
      ctaAuth: 'Inscrivez-vous pour commencer à référencer votre appartement'
    },
    testimonials: {
      title: 'Ce que disent nos utilisateurs',
      subtitle: 'De vraies expériences de notre communauté',
      ctaTitle: 'Prêt à rejoindre notre communauté ?',
      ctaMessage: 'Que vous cherchiez un logement ou souhaitiez gagner avec votre espace, AKWANDA.rw est là pour vous.',
      btnFindApartment: 'Trouver un appartement',
      btnListOrSignUp: (isUser) => isUser ? 'Référencez votre propriété' : 'Inscrivez-vous pour héberger',
      loading: 'Chargement des témoignages…'
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
  },
  // Messages communs (toasts, messages)
  msg: {
    mustLoginToList: 'Veuillez vous connecter pour référencer une propriété',
    ownerOnly: 'Seuls les propriétaires peuvent référencer des propriétés. Utilisez la connexion Propriétaire.',
    fillRequiredFields: 'Veuillez remplir tous les champs obligatoires',
    propertyUpdated: 'Propriété mise à jour',
    propertyCreated: 'Propriété créée',
    saveFailed: 'Échec de l’enregistrement',
    draftSaved: 'Brouillon enregistré',
    draftSaveFailed: 'Impossible d’enregistrer le brouillon',
    loadingPropertyData: 'Chargement des données de la propriété…',
    contactSaveFailed: 'Échec de l’enregistrement des coordonnées',
    completeRequiredInfo: 'Complétez les informations requises',
    authRequired: 'Autorisation requise. Connectez-vous en tant qu’hôte et réessayez.',
    switchToOwnerSuccess: 'Passé en mode Propriétaire',
    ownerLoginFailed: 'Échec de la connexion Propriétaire',
    notOwnerAccount: 'Ce compte n’est pas un propriétaire',
    enterOwnerCredentials: 'Saisissez l’e-mail et le mot de passe du propriétaire',
    couldNotSwitchAccount: 'Impossible de changer de compte',
    roomImagesUploaded: 'Images de chambre téléchargées',
    roomImagesUploadFailed: 'Échec du téléchargement des images de chambre',
    accountDeactivatedNotice: 'Votre compte est actuellement désactivé. Vous ne pouvez pas créer ou modifier des annonces tant qu’il n’est pas réactivé.',
  },
  // Clés minimales pour le flux d'annonce (utilisées dans EnhancedUploadProperty)
  listing: {
    propertyLocation: 'Localisation de la propriété',
    country: 'Pays',
    findYourAddress: 'Trouvez votre adresse',
    city: 'Ville',
    searching: 'Recherche…',
    coords: (lat, lon) => `Coordonnées : ${lat ?? '—'}, ${lon ?? '—'}`,
    uploadTitle: 'Téléverser un appartement',
  },
  // Section de recherche (page d'accueil)
  search: {
    staysTab: 'Séjours',
    carsTab: 'Voitures',
    attractionsTab: 'Attractions',
    location: 'Lieu',
    pickupLocation: 'Lieu de prise en charge',
    whereGoing: 'Où allez-vous ?',
    wherePickup: 'Où récupérer ?',
    checkIn: 'Arrivée',
    checkOut: 'Départ',
    pickupDate: 'Date de prise en charge',
    returnDate: 'Date de retour',
    guests: 'Voyageurs',
    returnLocationOptional: 'Lieu de retour (optionnel)',
    returnDifferentPlace: 'Retour à un autre endroit ?',
    searchStays: 'Rechercher des séjours',
    searchCars: 'Rechercher des voitures',
    exploreAttractions: 'Explorer les attractions',
    quickPopularCars: 'Voitures populaires',
    quickFeaturedStays: 'Séjours à la une',
    quickTopAttractions: 'Attractions incontournables'
  },
  // Section attractions de la page d'accueil
  landing: {
    viewAll: 'Tout voir',
    curatedBy: 'Sélection AKWANDA.rw',
    explore: 'Explorer'
  },
  // Appels à l'action génériques
  cta: {
    learnMore: 'En savoir plus',
    contactUs: 'Nous contacter'
  },
};

const LocaleContext = createContext(null);

export const LocaleProvider = ({ children }) => {
  // ... (rest of the code remains the same)
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
    // Use available rates or safe fallback so we ALWAYS convert numbers, not just change symbol
    const fx = (rates && rates['RWF']) ? rates : { RWF: 1, USD: 0.00077, EUR: 0.00071 };
    if (!fx[cur]) {
      return `RWF ${amt.toLocaleString()}`;
    }
    // amount in target = amt * rate[target] (since base is RWF)
    const converted = amt * fx[cur];
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
    // Use available rates or safe fallback so conversion happens immediately
    const fx = (rates && rates['RWF']) ? rates : { RWF: 1, USD: 0.00077, EUR: 0.00071 };
    // Convert base -> RWF
    let amountInRwf = amt;
    if (base !== 'RWF') {
      if (!fx[base] || fx[base] === 0) {
        // If we somehow don't know base, show base amount plainly
        const symbolBase = base === 'USD' ? '$' : (base === 'EUR' ? '€' : base);
        return `${symbolBase} ${amt.toLocaleString()}`;
      }
      // Since rates are base RWF, 1 RWF = fx[base] units of base.
      // Therefore 1 unit of base = 1 / fx[base] RWF.
      amountInRwf = amt / fx[base];
    }
    // RWF -> target
    const tRate = fx[target];
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
        else {
          // Fallback: try resolving from root-level dictionaries object (for misplaced keys)
          let fb = dictionaries;
          for (const pp of parts) {
            if (fb && typeof fb === 'object' && pp in fb) fb = fb[pp];
            else { fb = null; break; }
          }
          if (fb != null) {
            if (typeof fb === 'function') return fb(...args);
            return fb;
          }
          return path;
        }
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
