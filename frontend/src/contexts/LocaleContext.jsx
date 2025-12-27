import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { translateText, translateObject } from '../utils/translator';

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
      propertyManagement: 'Property management',
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
    admin: {
      content: {
        siteContent: 'Site Content',
        landingCmsTitle: 'Landing Page CMS',
        landingCmsDesc: 'Edit hero title/subtitle, manage slideshow images and captions, and publish changes.',
        attractionsCmsTitle: 'Attractions Page CMS',
        attractionsCmsDesc: 'Manage attractions content, images, and publish the page.',
        rentalsCmsTitle: 'Rentals Page CMS',
        rentalsCmsDesc: 'Manage rentals content, images, and publish the page.',
        flightsCmsTitle: 'Flights Page CMS',
        flightsCmsDesc: 'Manage flights content, images, and publish the page.',
        messagesTitle: 'Messages',
        messagesDesc: 'Open conversations with users and property/car owners.',
      }
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
    vehicleListing: {
      form: {
        missingFields: (fields = '') => fields ? `Please fill in: ${fields}` : 'Please fill in the required fields',
        fields: {
          vehicleName: 'Vehicle name',
          brand: 'Brand',
          model: 'Model',
          vehicleType: 'Vehicle type',
          licensePlate: 'License plate number',
          pricePerDay: 'Price per day',
          pickupLocation: 'Pickup / drop-off location',
          capacity: 'Number of seats',
          photos: 'Vehicle photos',
          ownerName: 'Owner / company name',
          ownerPhone: 'Phone number'
        },
        pickupInstructions: 'Pickup instructions (optional)',
        pickupInstructionsPlaceholder: 'Meeting point, landmarks, ID check, delivery notes, etc.',
        imagesRequired: 'Please add at least one image.'
      },
      docs: {
        title: '6. Required Documents',
        subtitle: 'Upload clear photos or PDFs of the required documents. They will be stored securely with this vehicle listing.',
        required: 'Required',
        optional: 'Optional',
        upload: 'Upload document',
        accepted: 'JPG, PNG, or PDF',
        selected: 'Selected:',
        requiredError: 'Please upload the required documents',
        registration: 'Vehicle registration certificate',
        insurance: 'Vehicle insurance policy',
        proofOfOwnership: 'Proof of ownership / lease agreement',
        inspection: 'Vehicle inspection certificate',
        plate: 'Photo of number plate',
        ownerId: 'Owner ID / Passport',
        driversLicense: "Driver's license (if applicable)",
        businessRegistration: 'Business registration (companies only)',
        taxCertificate: 'Tax certificate (if applicable)'
      }
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
    },
    attractionWizard: {
      listingType: {
        title: 'What would you like to list?',
        subtitle: 'Choose the type of listing you want to create. Stays, rentals, attractions and flights each have their own flow.',
        stay: 'Stay',
        stayDesc: 'Apartments, hotels, homes',
        rental: 'Rental',
        rentalDesc: 'Cars & vehicles',
        attraction: 'Attraction',
        attractionDesc: 'Tours & activities',
        flight: 'Flight',
        flightDesc: 'Flight services'
      },
      stepLabel: 'Step',
      stepOf: 'of',
      common: {
        selectPlaceholder: 'Select an option',
        yes: 'Yes',
        no: 'No'
      },
      categories: {
        cultural: 'Culture & Museums',
        nature: 'Nature & Parks',
        adventure: 'Adventure & Outdoor',
        historical: 'Historical & Landmarks',
        religious: 'Religious Sites',
        entertainment: 'Entertainment & Shows'
      },
      actions: {
        uploadCover: 'Upload cover photo',
        uploadGallery: 'Upload gallery images',
        back: 'Back',
        next: 'Next',
        save: 'Save attraction info'
      },
      toasts: {
        saved: 'Attraction saved and will appear on the attractions page once active.'
      },
      errors: {
        step1: 'Add attraction name, category and a short description.',
        step2: 'Add country, city and exact address.',
        step3: 'Upload a cover photo and at least one gallery image.',
        step5: 'Add adult ticket price and currency.',
        step9: 'Add contact phone and email.',
        missingCore: 'Name, category, country, and city are required.',
        saveFailed: 'Could not save attraction',
        uploadImagesFailed: 'Could not upload images'
      },
      steps: {
        basic: {
          title: '1. Basic information',
          helper: 'Required to identify the attraction.'
        },
        location: {
          title: '2. Location details',
          helper: 'Precision helps guests arrive smoothly.'
        },
        media: {
          title: '3. Photos & Media',
          helper: 'Visuals bring the experience to life.'
        },
        operating: {
          title: '4. Operating details',
          helper: 'Opening days, hours and typical visit length.'
        },
        pricing: {
          title: '5. Pricing',
          helper: 'Set the per-person price guests will pay.'
        },
        capacity: {
          title: '6. Capacity & requirements',
          helper: 'Help guests understand group limits and requirements.'
        },
        amenities: {
          title: '7. Facilities & experience details',
          helper: 'What is included and what guests should expect.'
        },
        rules: {
          title: '8. Rules & important information',
          helper: 'Clarify expectations for guests.'
        },
        contact: {
          title: '9. Contact information',
          helper: 'How guests reach you.'
        }
      },
      locationMap: {
        title: 'Location Map',
        helper: 'Click or drag the marker to auto-fill GPS.'
      },
      fields: {
        name: 'Attraction Name *',
        category: 'Category / Type *',
        shortDescription: 'Short Description *',
        fullDescription: 'Full Description',
        highlights: 'Highlights / Key Features',
        country: 'Country *',
        city: 'City / Town / District *',
        address: 'Meeting point / Address *',
        landmarks: 'Landmarks Nearby',
        directions: 'Directions / How to get there',
        coverPhoto: 'Cover photo *',
        galleryPhotos: 'Gallery images *',
        video: 'Video URL (optional)',
        openingDays: 'Opening Days',
        openingStart: 'Opening Hour Start',
        openingEnd: 'Opening Hour End',
        duration: 'Duration',
        minAge: 'Minimum age requirement',
        timeSlot1: 'Start time 1 (optional)',
        timeSlot2: 'Start time 2 (optional)',
        timeSlot3: 'Start time 3 (optional)',
        priceAdult: 'Price per adult *',
        priceChild: 'Price per child (optional)',
        currency: 'Currency *',
        refundPolicy: 'Refund & cancellation policy',
        capacity: 'Maximum group size (optional)',
        minGuests: 'Minimum guests (optional)',
        bookingRequired: 'Booking required?',
        amenities: 'Amenities & facilities',
        guideAvailable: 'Guide available?',
        languages: 'Main language of the experience',
        safetyEquipment: 'Safety equipment provided',
        rules: 'Important info / rules',
        dressCode: 'Dress code (optional)',
        safetyInstructions: 'Safety instructions (optional)',
        contactName: 'Owner / manager name',
        contactPhone: 'Phone number *',
        contactEmail: 'Email address *',
        contactWebsite: 'Website (optional)',
        paymentMethods: 'Preferred payment method'
      },
      placeholders: {
        name: 'Kigali Cultural Walk',
        category: 'Select a category',
        shortDescription: '1–2 sentence summary',
        fullDescription: 'Describe the experience in detail',
        country: 'Rwanda',
        city: 'Kigali',
        address: 'Street, building name...',
        landmarks: 'Hotel, park, landmark (optional)',
        directions: 'Public transport, parking, pickup point (optional)',
        video: 'YouTube / Vimeo link',
        openingDays: 'Select opening days',
        duration: 'e.g., 2 hours',
        minAge: 'e.g., 12+',
        price: 'Amount',
        currency: 'Select currency',
        capacity: 'Guests per session',
        minGuests: 'Minimum booking size',
        languages: 'Select language',
        rules: 'Meeting instructions, what to bring, restrictions...',
        dressCode: 'Modest clothing, swimwear...',
        safetyInstructions: 'Safety requirements and instructions...',
        contactName: 'John Doe',
        contactPhone: '+250 78...',
        contactEmail: 'owner@example.com',
        contactWebsite: 'https://...'
      },
      helpers: {
        coverPhoto: 'Upload a hero photo.',
        galleryPhotos: 'Upload 3–20 images.',
        highlights: 'Select all that apply. These help guests understand what makes this attraction special.',
        amenities: 'Select all amenities that apply to this attraction.',
        safetyEquipment: 'Select all safety items you provide to guests.',
        refundPolicy: 'Choose the statement that best describes how refunds and cancellations are handled.'
      },
      openingDays: {
        weekend: 'Weekend',
        weekdays: 'Monday–Friday',
        wholeWeek: 'Whole week'
      },
      paymentMethods: {
        momo: 'Mobile money (MoMoPay)',
        cash: 'Cash on arrival',
        card: 'Card payment (POS / online)',
        bank: 'Bank transfer'
      },
      refundPolicies: {
        noEarlyRefund: 'No refund for early cancellation (unless stated otherwise).',
        fullWithinWindow: 'Full refund for cancellations within a defined window before the visit (for example 48 hours or 7 days).',
        latePartial: 'Late cancellations may result in partial or no refund.',
        noShow: 'No refund for no-shows.',
        closedOnly: 'Refunds offered only if the attraction is closed or unavailable due to unforeseen circumstances.',
        unusedTickets: 'Refunds are not provided for unused tickets.',
        groupDifferent: 'Group bookings may have different cancellation terms and conditions.'
      },
      languages: {
        kinyarwanda: 'Kinyarwanda',
        english: 'English',
        french: 'French',
        kiswahili: 'Kiswahili',
        other: 'Other'
      }
    },
    ownerAttractions: {
      ui: {
        backToListingOptions: 'Back to listing options',
        listYourAttraction: 'List Your Attraction',
        cards: 'Cards',
        table: 'Table',
        myAttractions: 'My Attractions',
        overview: 'Overview'
      }
    }
  },
  // Common messages (toasts, inline notices)
  msg: {
    mustLoginToList: 'Please login to list a property',
    ownerOnly: 'Only property owners can list properties. Please use Owner Login.',
    fillRequiredFields: 'Veuillez remplir tous les champs obligatoires',
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
    admin: {
      content: {
        siteContent: 'Contenu du site',
        landingCmsTitle: 'CMS de la page d’accueil',
        landingCmsDesc: 'Modifiez le titre/sous-titre, gérez les images du diaporama et les légendes, puis publiez les changements.',
        attractionsCmsTitle: 'CMS de la page Attractions',
        attractionsCmsDesc: 'Gérez le contenu des attractions, les images et publiez la page.',
        rentalsCmsTitle: 'CMS de la page Locations',
        rentalsCmsDesc: 'Gérez le contenu des locations, les images et publiez la page.',
        flightsCmsTitle: 'CMS de la page Vols',
        flightsCmsDesc: 'Gérez le contenu des vols, les images et publiez la page.',
        messagesTitle: 'Messages',
        messagesDesc: 'Ouvrez des conversations avec les utilisateurs et les propriétaires de biens/voitures.',
      }
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
      title: 'Locations de véhicules',
      subtitle: 'Trouvez la voiture, la moto ou le vélo idéal',
      location: 'Lieu',
      allTypes: 'Tous types',
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
    vehicleListing: {
      form: {
        missingFields: (fields = '') => fields ? `Veuillez remplir : ${fields}` : 'Veuillez remplir les champs obligatoires',
        fields: {
          vehicleName: 'Nom du véhicule',
          brand: 'Marque',
          model: 'Modèle',
          vehicleType: 'Type de véhicule',
          licensePlate: "Numéro de plaque d'immatriculation",
          pricePerDay: 'Prix par jour',
          pickupLocation: 'Lieu de prise en charge / retour',
          capacity: 'Nombre de places',
          photos: 'Photos du véhicule',
          ownerName: 'Nom du propriétaire / entreprise',
          ownerPhone: 'Numéro de téléphone'
        },
        pickupInstructions: 'Instructions de prise en charge (facultatif)',
        pickupInstructionsPlaceholder: 'Point de rendez-vous, repères, vérification d’identité, notes de livraison, etc.',
        imagesRequired: 'Veuillez ajouter au moins une image.'
      },
      docs: {
        title: '6. Documents requis',
        subtitle: "Téléchargez des photos claires ou des PDF des documents requis. Ils seront stockés en toute sécurité avec cette annonce.",
        required: 'Requis',
        optional: 'Optionnel',
        upload: 'Télécharger le document',
        accepted: 'JPG, PNG ou PDF',
        selected: 'Sélectionné :',
        requiredError: 'Veuillez télécharger les documents requis',
        registration: "Certificat d'immatriculation du véhicule",
        insurance: "Police d'assurance du véhicule",
        proofOfOwnership: "Preuve de propriété / contrat de location",
        inspection: "Certificat d'inspection du véhicule",
        plate: "Photo de la plaque d'immatriculation",
        ownerId: "Pièce d'identité / Passeport du propriétaire",
        driversLicense: 'Permis de conduire (si applicable)',
        businessRegistration: "Registre du commerce (entreprises uniquement)",
        taxCertificate: "Attestation fiscale (si applicable)"
      }
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
    },
    attractionWizard: {
      listingType: {
        title: 'Que souhaitez-vous publier ?',
        subtitle: 'Choisissez le type d’annonce que vous souhaitez créer. Les séjours, locations, attractions et vols ont chacun leur propre parcours.',
        stay: 'Séjour',
        stayDesc: 'Appartements, hôtels, maisons',
        rental: 'Location',
        rentalDesc: 'Voitures et véhicules',
        attraction: 'Attraction',
        attractionDesc: 'Visites et activités',
        flight: 'Vol',
        flightDesc: 'Services de vols'
      },
      stepLabel: 'Étape',
      stepOf: 'sur',
      common: {
        selectPlaceholder: 'Sélectionnez une option',
        yes: 'Oui',
        no: 'Non'
      },
      categories: {
        cultural: 'Culture & musées',
        nature: 'Nature & parcs',
        adventure: 'Aventure & plein air',
        historical: 'Histoire & monuments',
        religious: 'Sites religieux',
        entertainment: 'Divertissement & spectacles'
      },
      actions: {
        uploadCover: 'Télécharger la photo de couverture',
        uploadGallery: 'Télécharger les photos de la galerie',
        back: 'Retour',
        next: 'Suivant',
        save: 'Enregistrer l’attraction'
      },
      toasts: {
        saved: 'Attraction enregistrée et affichée sur la page des attractions une fois active.'
      },
      errors: {
        step1: 'Ajoutez le nom, la catégorie et une courte description.',
        step2: 'Ajoutez le pays, la ville et l’adresse exacte.',
        step3: 'Téléchargez une photo de couverture et au moins une image de galerie.',
        step5: 'Ajoutez le prix adulte et la devise.',
        step9: 'Ajoutez le téléphone et l’e-mail de contact.',
        missingCore: 'Le nom, la catégorie, le pays et la ville sont obligatoires.',
        saveFailed: 'Impossible d’enregistrer l’attraction',
        uploadImagesFailed: 'Impossible de télécharger les images'
      },
      steps: {
        basic: {
          title: '1. Informations de base',
          helper: 'Nécessaire pour identifier l’attraction.'
        },
        location: {
          title: '2. Détails de localisation',
          helper: 'La précision aide les clients à arriver facilement.'
        },
        media: {
          title: '3. Photos & média',
          helper: 'Les visuels donnent vie à l’expérience.'
        },
        operating: {
          title: '4. Horaires & fonctionnement',
          helper: 'Jours d’ouverture, heures et durée de visite.'
        },
        pricing: {
          title: '5. Prix',
          helper: 'Définissez le prix par personne.'
        },
        capacity: {
          title: '6. Capacité & conditions',
          helper: 'Aidez les clients à comprendre les limites et exigences.'
        },
        amenities: {
          title: '7. Services & détails de l’expérience',
          helper: 'Ce qui est inclus et ce que les clients doivent prévoir.'
        },
        rules: {
          title: '8. Règles & informations importantes',
          helper: 'Clarifiez les attentes pour les clients.'
        },
        contact: {
          title: '9. Informations de contact',
          helper: 'Comment les clients peuvent vous joindre.'
        }
      },
      locationMap: {
        title: 'Carte de localisation',
        helper: 'Cliquez ou déplacez le marqueur pour renseigner le GPS.'
      },
      fields: {
        name: 'Nom de l’attraction *',
        category: 'Catégorie / Type *',
        shortDescription: 'Courte description *',
        fullDescription: 'Description complète',
        highlights: 'Points forts',
        country: 'Pays *',
        city: 'Ville / district *',
        address: 'Point de rendez-vous / adresse *',
        landmarks: 'Repères à proximité',
        directions: 'Directions / comment s’y rendre',
        coverPhoto: 'Photo de couverture *',
        galleryPhotos: 'Images de la galerie *',
        video: 'Lien vidéo (facultatif)',
        openingDays: 'Jours d’ouverture',
        openingStart: 'Heure d’ouverture',
        openingEnd: 'Heure de fermeture',
        duration: 'Durée',
        minAge: 'Âge minimum',
        timeSlot1: 'Heure de départ 1 (facultatif)',
        timeSlot2: 'Heure de départ 2 (facultatif)',
        timeSlot3: 'Heure de départ 3 (facultatif)',
        priceAdult: 'Prix adulte *',
        priceChild: 'Prix enfant (facultatif)',
        currency: 'Devise *',
        refundPolicy: 'Politique d’annulation et de remboursement',
        capacity: 'Taille maximale du groupe (facultatif)',
        minGuests: 'Nombre minimum de clients (facultatif)',
        bookingRequired: 'Réservation obligatoire ?',
        amenities: 'Équipements & services',
        guideAvailable: 'Guide disponible ?',
        languages: 'Langue principale de l’expérience',
        safetyEquipment: 'Équipement de sécurité fourni',
        rules: 'Infos / règles importantes',
        dressCode: 'Code vestimentaire (facultatif)',
        safetyInstructions: 'Consignes de sécurité (facultatif)',
        contactName: 'Nom du responsable',
        contactPhone: 'Numéro de téléphone *',
        contactEmail: 'Adresse e-mail *',
        contactWebsite: 'Site web (facultatif)',
        paymentMethods: 'Méthode de paiement préférée'
      },
      placeholders: {
        name: 'Balade culturelle à Kigali',
        category: 'Sélectionnez une catégorie',
        shortDescription: 'Résumé en 1–2 phrases',
        fullDescription: 'Décrivez l’expérience en détail',
        country: 'Rwanda',
        city: 'Kigali',
        address: 'Rue, bâtiment...',
        landmarks: 'Hôtel, parc, repère (facultatif)',
        directions: 'Transports, parking, point de rendez-vous (facultatif)',
        video: 'Lien YouTube / Vimeo',
        openingDays: 'Choisissez les jours d’ouverture',
        duration: 'ex. 2 heures',
        minAge: 'ex. 12+',
        price: 'Montant',
        currency: 'Choisissez une devise',
        capacity: 'Clients par session',
        minGuests: 'Taille minimale de réservation',
        languages: 'Sélectionnez une langue',
        rules: 'Point de rendez-vous, quoi apporter, restrictions...',
        dressCode: 'Tenue correcte, maillot...',
        safetyInstructions: 'Exigences et consignes de sécurité...',
        contactName: 'Jean Dupont',
        contactPhone: '+250 78...',
        contactEmail: 'proprietaire@example.com',
        contactWebsite: 'https://...'
      },
      helpers: {
        coverPhoto: 'Téléchargez une photo principale.',
        galleryPhotos: 'Téléchargez 3 à 20 images.',
        highlights: 'Sélectionnez tout ce qui s’applique. Ces éléments aident les clients à comprendre ce qui rend l’attraction unique.',
        amenities: 'Sélectionnez les équipements disponibles.',
        safetyEquipment: 'Sélectionnez les équipements de sécurité fournis.',
        refundPolicy: 'Choisissez la phrase qui décrit le mieux la politique de remboursement et d’annulation.'
      },
      openingDays: {
        weekend: 'Week-end',
        weekdays: 'Lundi–Vendredi',
        wholeWeek: 'Toute la semaine'
      },
      paymentMethods: {
        momo: 'Mobile money (MoMoPay)',
        cash: 'Paiement en espèces à l’arrivée',
        card: 'Paiement par carte (TPE / en ligne)',
        bank: 'Virement bancaire'
      },
      refundPolicies: {
        noEarlyRefund: 'Aucun remboursement en cas d’annulation anticipée (sauf indication contraire).',
        fullWithinWindow: 'Remboursement intégral si l’annulation intervient dans un délai défini avant la visite (par exemple 48 heures ou 7 jours).',
        latePartial: 'Les annulations tardives peuvent entraîner un remboursement partiel ou nul.',
        noShow: 'Aucun remboursement en cas de non-présentation.',
        closedOnly: 'Remboursement uniquement si l’attraction est fermée ou indisponible en raison de circonstances imprévues.',
        unusedTickets: 'Aucun remboursement pour les billets non utilisés.',
        groupDifferent: 'Les réservations de groupe peuvent avoir des conditions d’annulation différentes.'
      },
      languages: {
        kinyarwanda: 'Kinyarwanda',
        english: 'Anglais',
        french: 'Français',
        kiswahili: 'Kiswahili',
        other: 'Autre'
      }
    },
    ownerAttractions: {
      ui: {
        backToListingOptions: 'Retour aux options de publication',
        listYourAttraction: 'Publier une attraction',
        cards: 'Cartes',
        table: 'Tableau',
        myAttractions: 'Mes attractions',
        overview: 'Aperçu'
      }
    }
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
    const controller = new AbortController();
    let timeoutId;

    const fetchRates = async () => {
      try {
        timeoutId = setTimeout(() => controller.abort('timeout'), 8000); // allow more time before abort

        const res = await fetch('https://api.exchangerate.host/latest?base=RWF&symbols=USD,EUR,RWF', {
          signal: controller.signal
        });

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
        if (err.name === 'AbortError') {
          console.warn('Exchange rate fetch aborted, falling back to cached/default rates.');
        } else {
          console.warn('Exchange rate fetch failed, using fallback rates:', err.message);
        }
        if (!cancelled) {
          setRates({ RWF: 1, USD: 0.00077, EUR: 0.00071 }); // Fallback rates (approximate)
        }
      } finally {
        if (timeoutId) clearTimeout(timeoutId);
      }
    };

    fetchRates();
    return () => {
      cancelled = true;
      if (timeoutId) clearTimeout(timeoutId);
      controller.abort('cleanup');
    };
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

const resolveDictValue = (dictionary, path, args = []) => {
  if (!dictionary || !path) return null;
  const parts = String(path).split('.');
  let cur = dictionary;
  for (const part of parts) {
    if (cur && typeof cur === 'object' && part in cur) {
      cur = cur[part];
    } else {
      return null;
    }
  }
  if (typeof cur === 'function') {
    try {
      return cur(...args);
    } catch {
      return null;
    }
  }
  return cur ?? null;
};

const t = useMemo(() => {
  return (path, ...args) => {
    if (!path) return '';
    const primary = resolveDictValue(dict, path, args);
    if (primary !== null && primary !== undefined) {
      return primary;
    }

    const fallbackDict = dictionaries[DEFAULT_LANG];
    const fallback = resolveDictValue(fallbackDict, path, args);
    if (fallback !== null && fallback !== undefined) {
      return fallback;
    }

    const rootFallback = resolveDictValue(dictionaries, path, args);
    if (rootFallback !== null && rootFallback !== undefined) {
      return rootFallback;
    }

    if (typeof path === 'string') {
      const parts = path.split('.');
      return parts[parts.length - 1] || '';
    }
    return '';
  };
}, [dict]);

  // Localize dynamic values coming from Admin CMS or backend (synchronous, no network calls)
  // Accepts:
  // - string: returns as-is
  // - object: returns value[language] -> value[DEFAULT_LANG] -> first string value
  const localize = (value) => {
    if (value == null) return '';

    if (typeof value === 'string') {
      return value;
    }

    if (typeof value === 'object') {
      // Prefer per-language fields
      const direct = value[language] ?? value[DEFAULT_LANG];
      if (typeof direct === 'string') return direct;

      // Otherwise pick the first string field
      for (const k in value) {
        if (typeof value[k] === 'string') {
          return value[k];
        }
      }
    }

    return String(value);
  };

// Synchronous helper for placeholders / immediate render paths
const translateSync = useMemo(() => {
  return (pathOrText, fallback = null) => {
    if (pathOrText == null) return fallback ?? '';
    if (typeof pathOrText !== 'string') return pathOrText;

    const resolved =
      resolveDictValue(dict, pathOrText) ??
      resolveDictValue(dictionaries[DEFAULT_LANG], pathOrText) ??
      resolveDictValue(dictionaries, pathOrText);
    if (resolved !== null && resolved !== undefined) {
      return resolved;
    }

    return fallback ?? pathOrText;
  };
}, [dict, language]);

  const value = useMemo(() => ({ 
    language, 
    setLanguage, 
    currency, 
    setCurrency, 
    t, 
    rates, 
    formatCurrencyRWF, 
    formatCurrency, 
    localize,
    translateSync // Add synchronous translation function
  }), [language, currency, t, rates, formatCurrencyRWF, formatCurrency, localize, translateSync]);
  
  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
};

export const useLocale = () => useContext(LocaleContext);
