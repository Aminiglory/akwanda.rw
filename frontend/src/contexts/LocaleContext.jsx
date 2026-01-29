import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { translateText, translateObject } from '../utils/translator';

const DEFAULT_LANG = 'en';
const DEFAULT_CURRENCY = 'RWF';

const dictionaries = {
  en: {
    brand: 'AkwandaTravels',
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
      bookingComMessages: 'AkwandaTravels messages',
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
      bottomCopyright: (year) => ` ${year} AkwandaTravels. All rights reserved.`,
    },
    hero: {
      title: 'Welcome to AkwandaTravels',
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
      listCtaTitle: 'List your property with AkwandaTravels',
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
      ctaMessage: "Whether you're looking for a place to stay or want to earn from your space, AkwandaTravels is here for you.",
      btnFindApartment: 'Find an Apartment',
      btnListOrSignUp: (isUser) => isUser ? 'List Your Property' : 'Sign Up to Host',
      loading: 'Loading testimonials…'
    },
    auth: {
      loginTitle: 'Welcome back',
      loginSubtitle: 'Sign in to your AkwandaTravels account',
      email: 'Email address',
      password: 'Password',
      signIn: 'Sign in',
      rememberMe: 'Remember me',
      forgotPassword: 'Forgot password?',
      notHostYet: 'Not a host yet?',
      createAccount: 'Create an account',
      registerTitle: 'Create your account',
      registerSubtitle: 'Join AkwandaTravels and start your apartment journey',
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
        contactFromProfile: 'Update your profile with phone and email to continue.',
        languagesMin2: 'Select at least 2 languages.',
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
        languages: 'Supported languages',
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
        languagesSearch: 'Search languages'
      },
      toasts: {
        selectVisitDate: 'Select visit date',
        closedOnSelectedDate: 'Not available: closed on selected date',
        slotRequired: 'Not available: please select a time slot',
        invalidSlot: 'Not available: selected time slot is not valid',
        capacityRemaining: 'Not available: only {remaining} tickets remaining for this slot',
        notEnoughCapacity: 'Not available: not enough remaining capacity',
        notAvailable: 'Not available',
        available: 'Available',
        pleaseLogin: 'Please login',
        bookingFailed: 'Booking failed',
        redirectingToPayment: 'Redirecting to payment...',
        bookingCreated: 'Booking created',
        selectTimeSlot: 'Select a time slot',
        ticketsMin1: 'Tickets must be at least 1',
        enterPhoneNumber: 'Enter phone number'
      }
    },
    attractionDetail: {
      loading: 'Loading...',
      notFound: 'Not found',
      video: 'Video',
      videoTitle: 'Attraction video',
      locationMap: 'Location map',
      stepOf: 'Step {step} of {totalSteps}',
      total: 'Total',
      visitDate: 'Visit date',
      timeSlot: 'Time slot',
      selectSlot: 'Select a slot',
      slotsHint: 'Click "Check availability" to load slots for the selected date.',
      tickets: 'Tickets',
      checkAvailability: 'Check availability',
      checking: 'Checking...',
      available: 'Available',
      notAvailable: 'Not available',
      closedOnDate: 'This attraction is closed on the selected date.',
      slotRequired: 'Please select a time slot.',
      invalidSlot: 'Selected time slot is not valid for this attraction.',
      notEnoughCapacityInline: 'Not enough remaining capacity',
      remaining: 'remaining',
      continue: 'Continue',
      firstName: 'First name',
      lastName: 'Last name',
      email: 'Email',
      phoneNumber: 'Phone number *',
      notesOptional: 'Notes (optional)',
      back: 'Back',
      payOnArrival: 'Pay on Arrival',
      mtnMobileMoney: 'MTN Mobile Money',
      booking: 'Booking...',
      confirmBook: 'Confirm & book',
      cantBookOwn: 'You can’t book your own attraction.',
      messageHost: 'Message host',
      sections: {
        quickInfo: 'Quick info',
        amenities: 'Amenities',
        operatingHours: 'Operating hours',
        locationDetails: 'Location details',
        policies: 'Policies',
        rules: 'Rules & important info',
        contact: 'Contact'
      },
      labels: {
        category: 'Category',
        city: 'City',
        country: 'Country',
        duration: 'Duration',
        capacity: 'Capacity',
        minGuests: 'Minimum guests',
        minAge: 'Minimum age',
        bookingRequired: 'Booking required',
        guideAvailable: 'Guide available',
        audioGuideLanguages: 'Audio guide languages',
        safetyEquipment: 'Safety equipment',
        seasonality: 'Seasonality',
        address: 'Address / meeting point',
        gps: 'GPS',
        landmarks: 'Landmarks',
        directions: 'Directions',
        latitude: 'Latitude',
        longitude: 'Longitude',
        open: 'Opens',
        close: 'Closes',
        days: 'Days',
        openingDays: 'Opening days',
        timeSlots: 'Suggested time slots',
        paymentMethods: 'Payment methods',
        cancellationPolicy: 'Cancellation policy',
        refundPolicy: 'Refund policy',
        rules: 'Rules',
        dressCode: 'Dress code',
        safetyInstructions: 'Safety instructions',
        liability: 'Liability',
        contactName: 'Contact name',
        contactPhone: 'Contact phone',
        contactEmail: 'Contact email',
        contactWebsite: 'Website',
        contactEmergency: 'Emergency contact'
      },
      days: {
        monday: 'Monday',
        tuesday: 'Tuesday',
        wednesday: 'Wednesday',
        thursday: 'Thursday',
        friday: 'Friday',
        saturday: 'Saturday',
        sunday: 'Sunday'
      },
      toasts: {
        selectVisitDate: 'Select visit date',
        closedOnSelectedDate: 'Not available: closed on selected date',
        slotRequired: 'Not available: please select a time slot',
        invalidSlot: 'Not available: selected time slot is not valid',
        capacityRemaining: 'Not available: only {remaining} tickets remaining for this slot',
        notEnoughCapacity: 'Not available: not enough remaining capacity',
        notAvailable: 'Not available',
        available: 'Available',
        pleaseLogin: 'Please login',
        bookingFailed: 'Booking failed',
        redirectingToPayment: 'Redirecting to payment...',
        bookingCreated: 'Booking created',
        selectTimeSlot: 'Select a time slot',
        ticketsMin1: 'Tickets must be at least 1',
        enterPhoneNumber: 'Enter phone number'
      }
    },
    // ... (rest of the code remains the same)
  },
  fr: {
    // ... (rest of the code remains the same)
    attractionDetail: {
      loading: 'Chargement...',
      notFound: 'Introuvable',
      video: 'Vidéo',
      videoTitle: 'Vidéo de l’attraction',
      locationMap: 'Carte de localisation',
      stepOf: 'Étape {step} sur {totalSteps}',
      total: 'Total',
      visitDate: 'Date de visite',
      timeSlot: 'Créneau horaire',
      selectSlot: 'Sélectionnez un créneau',
      slotsHint: 'Cliquez sur « Vérifier la disponibilité » pour charger les créneaux pour la date choisie.',
      tickets: 'Billets',
      checkAvailability: 'Vérifier la disponibilité',
      checking: 'Vérification...',
      available: 'Disponible',
      notAvailable: 'Non disponible',
      closedOnDate: 'Cette attraction est fermée à la date sélectionnée.',
      slotRequired: 'Veuillez sélectionner un créneau horaire.',
      invalidSlot: 'Le créneau sélectionné n’est pas valide pour cette attraction.',
      notEnoughCapacityInline: 'Capacité restante insuffisante',
      remaining: 'restant',
      continue: 'Continuer',
      firstName: 'Prénom',
      lastName: 'Nom',
      email: 'E-mail',
      phoneNumber: 'Numéro de téléphone *',
      notesOptional: 'Notes (facultatif)',
      back: 'Retour',
      payOnArrival: 'Payer à l’arrivée',
      mtnMobileMoney: 'MTN Mobile Money',
      booking: 'Réservation...',
      confirmBook: 'Confirmer & réserver',
      cantBookOwn: 'Vous ne pouvez pas réserver votre propre attraction.',
      messageHost: 'Contacter l’hôte',
      sections: {
        quickInfo: 'Infos rapides',
        amenities: 'Équipements',
        operatingHours: 'Horaires d’ouverture',
        locationDetails: 'Détails de localisation',
        policies: 'Politiques',
        rules: 'Règles & infos importantes',
        contact: 'Contact'
      },
      labels: {
        category: 'Catégorie',
        city: 'Ville',
        country: 'Pays',
        duration: 'Durée',
        capacity: 'Capacité',
        minGuests: 'Clients minimum',
        minAge: 'Âge minimum',
        bookingRequired: 'Réservation requise',
        guideAvailable: 'Guide disponible',
        audioGuideLanguages: 'Langues de l’audioguide',
        safetyEquipment: 'Équipement de sécurité',
        seasonality: 'Saisonnalité',
        address: 'Adresse / point de rendez-vous',
        gps: 'GPS',
        landmarks: 'Repères',
        directions: 'Décrivez comment arriver',
        latitude: 'Latitude',
        longitude: 'Longitude',
        open: 'Ouverture',
        close: 'Fermeture',
        days: 'Jours',
        openingDays: 'Jours d’ouverture',
        timeSlots: 'Créneaux suggérés',
        paymentMethods: 'Modes de paiement',
        cancellationPolicy: 'Politique d’annulation',
        refundPolicy: 'Politique de remboursement',
        rules: 'Règles',
        dressCode: 'Code vestimentaire',
        safetyInstructions: 'Consignes de sécurité',
        liability: 'Responsabilité',
        contactName: 'Nom du contact',
        contactPhone: 'ex. +250...',
        contactEmail: 'ex. info@exemple.com',
        contactWebsite: 'ex. www.exemple.com',
        contactEmergency: 'Contact d’urgence'
      },
      days: {
        monday: 'Lundi',
        tuesday: 'Mardi',
        wednesday: 'Mercredi',
        thursday: 'Jeudi',
        friday: 'Vendredi',
        saturday: 'Samedi',
        sunday: 'Dimanche'
      },
      toasts: {
        selectVisitDate: 'Sélectionnez la date de visite',
        closedOnSelectedDate: 'Non disponible : fermé à la date sélectionnée',
        slotRequired: 'Non disponible : veuillez sélectionner un créneau horaire',
        invalidSlot: 'Non disponible : le créneau choisi n’est pas valide',
        capacityRemaining: 'Non disponible : il ne reste que {remaining} billets pour ce créneau',
        notEnoughCapacity: 'Non disponible : capacité restante insuffisante',
        notAvailable: 'Non disponible',
        available: 'Disponible',
        pleaseLogin: 'Veuillez vous connecter',
        bookingFailed: 'Échec de la réservation',
        redirectingToPayment: 'Redirection vers le paiement...',
        bookingCreated: 'Réservation créée',
        selectTimeSlot: 'Sélectionnez un créneau horaire',
        ticketsMin1: 'Le nombre de billets doit être au moins 1',
        enterPhoneNumber: 'Entrez le numéro de téléphone'
      },
      helpers: {
        coverPhoto: 'Téléchargez une photo principale.',
        galleryPhotos: 'Téléchargez 3 à 20 images.',
        highlights: 'Sélectionnez tout ce qui s’applique. Ces éléments aident les clients à comprendre ce qui rend l’attraction unique.',
        amenities: 'Sélectionnez les équipements disponibles.',
        safetyEquipment: 'Sélectionnez les équipements de sécurité fournis.',
        refundPolicy: 'Choisissez la phrase qui décrit le mieux la politique de remboursement et d’annulation.',
        languages: 'Sélectionnez au moins 2 langues que les clients peuvent utiliser pendant cette expérience.'
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
