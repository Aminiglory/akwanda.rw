import React, { useState, useEffect } from 'react';
import { useLocale } from '../contexts/LocaleContext';

import { FaCalendarAlt, FaUsers, FaBed, FaCheck, FaMobile, FaShieldAlt, FaDollarSign } from 'react-icons/fa';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const BookingProcess = () => {
  const { formatCurrencyRWF } = useLocale() || {};

  const { id } = useParams();
  const navigate = useNavigate();
  
  const [property, setProperty] = useState(null);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [initialRoomId, setInitialRoomId] = useState(null);

  const [bookingData, setBookingData] = useState({
    checkIn: '',
    checkOut: '',
    guests: 1,
    rooms: 1,
    budget: '',
    specialRequests: '',
    contactInfo: {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      age: '',
      country: 'Rwanda'
    },
    couponCode: '',
    // Selected add-on services (by key). Used for information/negotiation only.
    services: {}
  });

  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [loadingRooms, setLoadingRooms] = useState(false);

  const [availableRooms, setAvailableRooms] = useState([]);
  const [filteredRooms, setFilteredRooms] = useState([]);
  const [totalPrice, setTotalPrice] = useState(0);
  const [discount, setDiscount] = useState(0);
  const [finalAmount, setFinalAmount] = useState(0);
  const [selectedDealId, setSelectedDealId] = useState('');
  const [propertyDeals, setPropertyDeals] = useState([]);
  const [dealsLoading, setDealsLoading] = useState(false);
  const [selectedRoomUnavailable, setSelectedRoomUnavailable] = useState(false);

  const budgetRanges = [
    { label: 'Budget', min: 0, max: 50000, color: 'green' },
    { label: 'Mid-range', min: 50000, max: 150000, color: 'blue' },
    { label: 'Luxury', min: 150000, max: 500000, color: 'purple' },
    { label: 'Ultra-luxury', min: 500000, max: 1000000, color: 'gold' }
  ];

  const countries = [
    'Rwanda', 'Uganda', 'Kenya', 'Tanzania', 'Burundi', 'DRC', 'South Sudan',
    'Ethiopia', 'Somalia', 'Djibouti', 'Eritrea', 'Other'
  ];

  const dedupeRooms = (rooms) => {
    const map = new Map();
    for (const r of rooms || []) {
      const key = r._id || r.id || r.roomNumber || `${r.roomType || ''}-${r.pricePerNight || ''}-${r.capacity || ''}`;
      if (!map.has(key)) map.set(key, r);
    }
    return Array.from(map.values());
  };

  useEffect(() => {
    if (!initialRoomId || !availableRooms || availableRooms.length === 0 || selectedRoom) return;

    const match = availableRooms.find((room) => {
      const key = String(room._id || room.id || room.roomNumber || '');
      return key && key === String(initialRoomId);
    });

    if (match) {
      const pricePerNight = match.pricePerNight || match.price || 0;
      const normalized = {
        ...match,
        _id: match._id || match.id,
        roomNumber: match.roomNumber || match.name || 'Unknown Room',
        roomType: match.roomType || 'Standard',
        pricePerNight: pricePerNight,
        isAvailable: match.isAvailable !== undefined ? match.isAvailable : true,
        capacity: match.capacity || 1,
        amenities: match.amenities || []
      };
      setSelectedRoom(normalized);
    }
  }, [initialRoomId, availableRooms, selectedRoom]);

  useEffect(() => {
    fetchProperty();
  }, [id]);

  // Promotions/deals UI is currently disabled from affecting price; we avoid
  // loading or applying them to keep totals simple and transparent.
  useEffect(() => {
    setPropertyDeals([]);
    setDealsLoading(false);
  }, [id]);

  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const d = params.get('dealId') || '';
      if (d) setSelectedDealId(d);

      const cin = params.get('checkIn') || '';
      const cout = params.get('checkOut') || '';
      const guestsParam = params.get('guests');
      const roomParam = params.get('roomId');

      if (cin || cout || guestsParam) {
        setBookingData(prev => ({
          ...prev,
          checkIn: cin || prev.checkIn,
          checkOut: cout || prev.checkOut,
          guests: guestsParam ? Number(guestsParam) || prev.guests : prev.guests
        }));
      }

      if (roomParam) {
        setInitialRoomId(roomParam);
        setCurrentStep(3);
      }
    } catch {}
  }, []);

  // Prefill contact info from logged-in user profile
  useEffect(() => {
    const prefillContact = async () => {
      try {
        const res = await fetch(`${API_URL}/api/auth/me`, { credentials: 'include' });
        if (!res.ok) return;
        const data = await res.json();
        const u = data?.user;
        if (!u) return;
        setBookingData(prev => ({
          ...prev,
          contactInfo: {
            ...prev.contactInfo,
            firstName: u.firstName || prev.contactInfo.firstName,
            lastName: u.lastName || prev.contactInfo.lastName,
            email: u.email || prev.contactInfo.email,
            phone: u.phone || prev.contactInfo.phone,
          }
        }));
      } catch (_) {}
    };

    prefillContact();
  }, []);

  // DISABLED: Start fresh each booking to avoid confusion
  // useEffect(() => {
  //   try {
  //     const cached = JSON.parse(localStorage.getItem('akw_booking_pref') || '{}');
  //     if (cached && (cached.checkIn || cached.checkOut || cached.budget || cached.guests)) {
  //       setBookingData(prev => ({
  //         ...prev,
  //         checkIn: cached.checkIn || prev.checkIn,
  //         checkOut: cached.checkOut || prev.checkOut,
  //         budget: cached.budget || prev.budget,
  //         guests: cached.guests || prev.guests
  //       }));
  //     }
  //   } catch (_) {}
  // }, []);

  // Persist date/budget whenever they change
  useEffect(() => {
    const payload = {
      checkIn: bookingData.checkIn,
      checkOut: bookingData.checkOut,
      budget: bookingData.budget,
      guests: bookingData.guests
    };
    try { localStorage.setItem('akw_booking_pref', JSON.stringify(payload)); } catch (_) {}
  }, [bookingData.checkIn, bookingData.checkOut, bookingData.budget, bookingData.guests]);

  const handlePayment = async (paymentMethod) => {
    if (!selectedRoom) {
      toast.error('Please select a room');
      return;
    }

    if (!bookingData.checkIn || !bookingData.checkOut) {
      toast.error('Please select check-in and check-out dates');
      return;
    }

    if (!bookingData.contactInfo.firstName || !bookingData.contactInfo.lastName || !bookingData.contactInfo.email) {
      toast.error('Please fill in all required contact information');
      return;
    }

    try {
      setLoading(true);
      const roomId = selectedRoom._id || selectedRoom.id;
      if (!roomId) throw new Error('Invalid room selection');

      const bookingPayload = {
        propertyId: id,
        room: roomId,
        checkIn: bookingData.checkIn,
        checkOut: bookingData.checkOut,
        numberOfGuests: bookingData.guests,
        contactInfo: bookingData.contactInfo,
        specialRequests: bookingData.specialRequests,
        groupBooking: bookingData.guests >= 4,
        groupSize: bookingData.guests,
        paymentMethod: paymentMethod,
        // Deals/discounts are not applied for now – use plain totalPrice
        totalAmount: Math.max(0, Number(totalPrice || 0)),
        roomPrice: selectedRoom.pricePerNight || selectedRoom.price || 0,
        // Info-only add-on services selected by guest; does not change totals
        services: bookingData.services || {}
      };

      const bookingRes = await fetch(`${API_URL}/api/bookings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(bookingPayload)
      });
      const bookingResponse = await bookingRes.json();
      if (!bookingRes.ok) throw new Error(bookingResponse.message || 'Failed to create booking');

      if (paymentMethod === 'cash') {
        toast.success('Booking created successfully! Payment on arrival.');
        // Compute lightweight details for success page
        const nights = (() => {
          try {
            const ci = new Date(bookingData.checkIn);
            const co = new Date(bookingData.checkOut);
            const n = Math.max(1, Math.ceil((co - ci) / (1000 * 60 * 60 * 24)));
            return n;
          } catch { return 1; }
        })();
        const params = new URLSearchParams({
          id: String(bookingResponse.booking._id || ''),
          property: property?.title || 'Your stay',
          date: bookingData.checkIn && bookingData.checkOut ? `${bookingData.checkIn} → ${bookingData.checkOut}` : '',
          loc: property?.address || property?.city || '',
          nights: String(nights)
        });
        navigate(`/booking-success?${params.toString()}`);
        return;
      }

      if (paymentMethod === 'mtn_mobile_money') {
        toast.success('Booking created! Redirecting to payment...');
        navigate(`/mtn-payment`, {
          state: {
            bookingId: bookingResponse.booking._id,
            amount: totalPrice,
            description: `Booking for ${property?.title || 'your stay'}`,
            customerName: `${bookingData.contactInfo.firstName} ${bookingData.contactInfo.lastName}`,
            customerEmail: bookingData.contactInfo.email,
            phoneNumber: bookingData.contactInfo.phone || ''
          }
        });
        return;
      }
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (bookingData.checkIn && bookingData.checkOut) {
      checkAvailability();
    } else if (property && property.rooms && property.rooms.length > 0 && availableRooms.length === 0) {
      // Fallback: if no availability check was made, use all rooms from property
      const processedRooms = property.rooms.map(room => {
        const pricePerNight = room.pricePerNight || room.price || 0;
        return {
          ...room,
          pricePerNight: pricePerNight,
          images: room.images ? room.images.map(img => 
            img.startsWith('http') ? img : `${API_URL}${img}`
          ) : []
        };
      });
      setAvailableRooms(processedRooms);
    }
  }, [bookingData.checkIn, bookingData.checkOut, bookingData.guests, property]);

  useEffect(() => {
    filterRoomsByBudget();
  }, [availableRooms, bookingData.budget]);

  useEffect(() => {
    if (selectedRoom && bookingData.checkIn && bookingData.checkOut) {
      calculateTotalPrice();
    }
  }, [selectedRoom, bookingData.checkIn, bookingData.checkOut, bookingData.rooms, bookingData.guests]);

  const fetchProperty = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/api/properties/${id}`, { credentials: 'include' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to fetch property');

      setProperty(data.property);

      // Process rooms with proper image URLs and fallback image
      const processedRooms = (data.property.rooms || []).map(room => {
        const pricePerNight = room.pricePerNight || room.price || 0;
        return {
          ...room,
          pricePerNight: pricePerNight,
          images: room.images && room.images.length > 0
            ? room.images.map(img => img.startsWith('http') ? img : `${API_URL}${img}`)
            : ['https://via.placeholder.com/150?text=No+Image'] // Fallback image
        };
      });

      setAvailableRooms(dedupeRooms(processedRooms));
    } catch (error) {
      toast.error(`Failed to load property: ${error.message}`);
      navigate('/apartments');
    } finally {
      setLoading(false);
    }
  };

  const checkAvailability = async () => {
    try {
      setLoadingRooms(true);
      const res = await fetch(`${API_URL}/api/properties/${id}/availability`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          checkIn: bookingData.checkIn,
          checkOut: bookingData.checkOut,
          guests: bookingData.guests
        })
      });
      
      const data = await res.json();
      if (res.ok) {
        // Process the available rooms with proper image URLs
        const processedAvailableRooms = (data.availableRooms || []).map(room => {
          const pricePerNight = room.pricePerNight || room.price || 0;
          return {
            ...room,
            pricePerNight: pricePerNight,
            images: room.images ? room.images.map(img => 
              img.startsWith('http') ? img : `${API_URL}${img}`
            ) : []
          };
        });

        if (processedAvailableRooms.length === 0) {
          // No rooms match the selected dates -> reflect that in the UI
          setAvailableRooms([]);
          if (selectedRoom) {
            setSelectedRoomUnavailable(true);
            toast.error(`No rooms, including ${selectedRoom.roomNumber || 'this room'}, are available for ${new Date(bookingData.checkIn).toLocaleDateString()} to ${new Date(bookingData.checkOut).toLocaleDateString()}.`);
          } else {
            setSelectedRoomUnavailable(false);
            try { toast.dismiss(); toast('No rooms are available for the selected dates.', { icon: 'ℹ️' }); } catch (_) {}
          }
        } else {
          // Only rooms returned by the API are considered available for these dates
          const uniqueRooms = dedupeRooms(processedAvailableRooms);
          setAvailableRooms(uniqueRooms);

          if (selectedRoom) {
            const isStillAvailable = uniqueRooms.some(room => {
              const roomId = room._id || room.id;
              const selectedId = selectedRoom._id || selectedRoom.id;
              if (roomId && selectedId) return roomId === selectedId;
              return room.roomNumber === selectedRoom.roomNumber;
            });
            setSelectedRoomUnavailable(!isStillAvailable);
            if (!isStillAvailable) {
              toast.error(`Sorry, ${selectedRoom.roomNumber || 'this room'} is not available for ${new Date(bookingData.checkIn).toLocaleDateString()} to ${new Date(bookingData.checkOut).toLocaleDateString()}.`);
            }
          } else {
            setSelectedRoomUnavailable(false);
          }
        }
      }
    } catch (error) {
      console.error('Availability check failed:', error);
    } finally {
      setLoadingRooms(false);
    }
  };

  const filterRoomsByBudget = () => {
    // If no budget selected, show all (with unavailable selected room kept visible)
    if (!bookingData.budget) {
      if (selectedRoom && selectedRoomUnavailable) {
        const exists = availableRooms.some(r => (r._id && r._id === selectedRoom._id) || r.roomNumber === selectedRoom.roomNumber);
        const merged = exists ? availableRooms : [...availableRooms, { ...selectedRoom, isAvailable: false }];
        setFilteredRooms(dedupeRooms(merged));
      } else {
        setFilteredRooms(dedupeRooms(availableRooms));
      }
      return;
    }

    const budgetRange = budgetRanges.find(range => range.label === bookingData.budget);
    if (!budgetRange) {
      setFilteredRooms(dedupeRooms(availableRooms));
      return;
    }

    // Compare per-night price directly to the budget range
    const nightlyMin = budgetRange.min;
    const nightlyMax = budgetRange.max;

    let filtered = dedupeRooms(availableRooms).filter(room => {
      const nightly = Number(room.pricePerNight || room.price || 0);
      return nightly >= nightlyMin && nightly <= nightlyMax;
    });

    // Always keep selected room visible even if outside the current filter
    if (selectedRoom) {
      const inList = filtered.some(r => (r._id && r._id === selectedRoom._id) || r.roomNumber === selectedRoom.roomNumber);
      if (!inList) {
        filtered = [...filtered, { ...selectedRoom, __outsideFilter: true }];
      }
    }

    // If no rooms match (besides possibly the selected one), silently fall back to all rooms
    const nonSelectedCount = filtered.filter(r => !r.__outsideFilter).length;
    if (nonSelectedCount === 0) {
      filtered = dedupeRooms(availableRooms);
      try { toast.dismiss(); toast('No rooms match the selected budget. Showing all rooms.', { icon: 'ℹ️' }); } catch (_) {}
    }

    setFilteredRooms(filtered);

    // If selected room doesn't match current budget filter, keep selection (do not auto-clear)
  };

  const calculateTotalPrice = () => {
    if (selectedRoom && bookingData.checkIn && bookingData.checkOut) {
      const checkInDate = new Date(bookingData.checkIn);
      const checkOutDate = new Date(bookingData.checkOut);
      const numberOfNights = Math.ceil((checkOutDate - checkInDate) / (1000 * 60 * 60 * 24));
      const nightly = Number(selectedRoom.pricePerNight || selectedRoom.price || 0);
      const total = nightly * numberOfNights;
      setTotalPrice(total);
    }
  };

  // Keep finalAmount equal to the simple room total; promotions/discounts removed
  useEffect(() => {
    setDiscount(0);
    setFinalAmount(totalPrice || 0);
  }, [totalPrice]);

  // FIX: Improved room selection handler with proper room data normalization and toggle behavior
  const handleRoomSelect = (room) => {
    // Ensure room has all required properties with proper fallbacks
    const pricePerNight = room.pricePerNight || room.price || 0;
    const roomWithDefaults = {
      ...room,
      _id: room._id || room.id, // Handle both _id and id
      roomNumber: room.roomNumber || room.name || 'Unknown Room',
      roomType: room.roomType || 'Standard',
      pricePerNight: pricePerNight,
      isAvailable: room.isAvailable !== undefined ? room.isAvailable : true,
      capacity: room.capacity || 1,
      amenities: room.amenities || []
    };
    // Toggle selection: clicking same room deselects
    if (selectedRoom && ((selectedRoom._id && roomWithDefaults._id && selectedRoom._id === roomWithDefaults._id) || (selectedRoom.roomNumber === roomWithDefaults.roomNumber))) {
      setSelectedRoom(null);
    } else {
      setSelectedRoom(roomWithDefaults);
    }
  };

  // FIX: Improved room comparison function
  const isRoomSelected = (room) => {
    if (!selectedRoom) return false;
    
    // Compare by _id if available, otherwise by roomNumber
    if (selectedRoom._id && room._id) {
      return selectedRoom._id === room._id;
    }
    return selectedRoom.roomNumber === room.roomNumber;
  };

  const handleInputChange = (field, value) => {
    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      setBookingData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: value
        }
      }));
    } else {
      setBookingData(prev => ({
        ...prev,
        [field]: value
      }));
    }
  };

  const handleBooking = async () => {
    if (!selectedRoom) {
      toast.error('Please select a room');
      return;
    }

    if (!bookingData.checkIn || !bookingData.checkOut) {
      toast.error('Please select check-in and check-out dates');
      return;
    }

    if (!bookingData.contactInfo.firstName || !bookingData.contactInfo.lastName || !bookingData.contactInfo.email) {
      toast.error('Please fill in all required contact information');
      return;
    }

    try {
      setLoading(true);
      // Ensure we have proper room ID for booking
      const roomId = selectedRoom._id || selectedRoom.id;
      if (!roomId) throw new Error('Invalid room selection');

      const bookingPayload = {
        propertyId: id,
        room: roomId,
        checkIn: bookingData.checkIn,
        checkOut: bookingData.checkOut,
        numberOfGuests: bookingData.guests,
        contactInfo: bookingData.contactInfo,
        specialRequests: bookingData.specialRequests,
        groupBooking: bookingData.guests >= 4,
        groupSize: bookingData.guests,
        paymentMethod: 'cash',
        totalAmount: totalPrice,
        roomPrice: selectedRoom.pricePerNight || selectedRoom.price || 0,
        // Info-only add-on services selected by guest; does not change totals
        services: bookingData.services || {}
      };

      const res = await fetch(`${API_URL}/api/bookings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(bookingPayload)
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to create booking');

      toast.success('Booking created successfully!');
      navigate(`/booking-confirmation/${data.booking._id}`);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            {currentStep === 1 && (
              <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Start Your Booking</h2>
                <p className="text-gray-600 mb-6">Select a room first, then choose your dates</p>
                
                <div className="flex justify-center">
                  <button
                    onClick={() => {
                      // Go directly to room selection
                      setCurrentStep(2);
                    }}
                    className="btn-primary text-white px-8 py-4 rounded-xl font-semibold transition-colors text-lg"
                  >
                    View Available Rooms
                  </button>
                </div>
                {/* Deals selector */}
                {dealsLoading ? (
                  <div className="mt-4 text-sm text-gray-500">Loading available promotions…</div>
                ) : propertyDeals.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                    <div className="md:col-span-3">
                      <label className="block text-sm font-medium text-gray-700 mb-2">Promotions</label>
                      <div className="flex flex-wrap gap-2">
                        {propertyDeals.map(d => (
                          <button
                            key={d._id}
                            type="button"
                            onClick={() => setSelectedDealId(prev => prev === d._id ? '' : d._id)}
                            className={`px-3 py-2 rounded-full text-sm border transition-all ${selectedDealId === d._id ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}
                            title={d.title}
                          >
                            {d.badge ? (
                              <span className="mr-2 inline-block px-2 py-0.5 rounded-full text-xs bg-yellow-100 text-yellow-800">{d.badge}</span>
                            ) : null}
                            {d.title || 'Deal'}
                          </button>
                        ))}
                      </div>
                      {selectedDealId && (
                        <div className="mt-2 text-sm text-gray-700">
                          Selected promotion will be applied to your total after you pick dates and a room.
                        </div>
                      )}
                    </div>
                  </div>
                ) : null}
              </div>
            )}
            
            {currentStep === 2 && (
              <div>
                {/* Info Banner */}
                <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-start gap-3">
                    <FaCalendarAlt className="text-blue-600 text-lg mt-0.5 flex-shrink-0" />
                    <div>
                      <h4 className="font-semibold text-blue-900 mb-1">Select a Room First</h4>
                      <p className="text-sm text-blue-700">
                        Choose your preferred room below. After selection, you'll be able to pick your dates and we'll check real-time availability for that specific room.
                      </p>
                    </div>
                  </div>
                </div>

                {filteredRooms.length === 0 ? (
                  <div className="text-center py-12">
                    <FaBed className="text-4xl text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">No rooms available</h3>
                    <p className="text-gray-600 mb-4">
                      No rooms match your selected criteria. Try adjusting your budget or dates.
                    </p>
                    <button
                      onClick={() => setCurrentStep(1)}
                      className="btn-primary text-white px-6 py-3 rounded-xl font-semibold transition-colors"
                    >
                      Adjust Budget
                    </button>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {Object.entries(
                      filteredRooms.reduce((acc, r) => {
                        const key = (r.roomType || 'Standard').toString();
                        if (!acc[key]) acc[key] = [];
                        acc[key].push(r);
                        return acc;
                      }, {})
                    ).sort(([a],[b]) => a.localeCompare(b)).map(([type, list]) => (
                      <div key={type}>
                        <h4 className="text-lg font-bold text-gray-800 mb-2">{type} Rooms</h4>
                        <div className="space-y-4">
                          {list.map((room, index) => (
                            <div
                              key={room._id || room.roomNumber || index}
                              className={`group modern-card-elevated p-4 md:p-5 cursor-pointer transition-all duration-300 ${
                                isRoomSelected(room)
                                  ? 'ring-1 ring-primary bg-[color-mix(in_srgb,_var(--ak-primary)_5%,_#fff)]'
                                  : ''
                              }`}
                              onClick={() => handleRoomSelect(room)}
                            >
                              <div className="flex items-start gap-3 md:gap-4">
                                <div className="w-28 h-24 md:w-32 md:h-24 rounded-xl overflow-hidden relative shrink-0">
                                  {room.images && room.images.length > 0 ? (
                                    <img
                                      src={room.images[0]}
                                      alt={room.roomNumber}
                                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                      onError={(e) => {
                                        e.target.style.display = 'none';
                                        e.target.nextSibling.style.display = 'flex';
                                      }}
                                    />
                                  ) : null}
                                  <div 
                                    className={`w-full h-full bg-gray-200 flex items-center justify-center ${room.images && room.images.length > 0 ? 'hidden' : ''}`}
                                    style={{ display: room.images && room.images.length > 0 ? 'none' : 'flex' }}
                                  >
                                    <FaBed className="text-gray-400 text-2xl" />
                                  </div>
                                  {isRoomSelected(room) && (
                                    <div className="absolute inset-0 bg-blue-500 bg-opacity-20 flex items-center justify-center">
                                      <FaCheck className="text-white text-2xl" />
                                    </div>
                                  )}
                                </div>

                                <div className="flex-1 min-w-0">
                                  <div className="flex items-start justify-between gap-3">
                                    <div className="flex-1 min-w-0">
                                      <h3 className="text-base md:text-lg font-semibold text-gray-900 group-hover:text-primary transition-colors duration-300 truncate">
                                        {room.roomNumber || 'Room ' + (index + 1)}
                                      </h3>
                                      <p className="text-xs md:text-sm text-gray-600 capitalize font-medium">
                                        {(room.roomType || 'Standard')} Room
                                      </p>
                                      <div className="flex items-center mt-2 md:mt-3 gap-2 md:gap-3 text-[11px] md:text-sm text-gray-600 flex-wrap">
                                        <div className="flex items-center bg-gray-100 px-2.5 py-1 rounded-full">
                                          <FaUsers className="mr-1 text-primary" />
                                          <span className="font-medium">{room.capacity || 1} guests</span>
                                        </div>
                                        <div className={`px-2.5 py-1 rounded-full text-[11px] md:text-xs font-medium transition-all duration-300 ${
                                          !(bookingData.checkIn && bookingData.checkOut)
                                            ? 'bg-gray-100 text-gray-700'
                                            : (room.isAvailable !== false
                                                ? 'bg-green-100 text-green-800 hover:bg-green-200'
                                                : 'bg-red-100 text-red-800 hover:bg-red-200')
                                        }`}>
                                          {!(bookingData.checkIn && bookingData.checkOut)
                                            ? 'Select dates to check'
                                            : (room.isAvailable !== false
                                                ? '✓ Available for your dates'
                                                : '✗ Unavailable for your dates')}
                                        </div>

                                        {room.__outsideFilter && (
                                          <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-[11px] md:text-xs rounded-full">Outside current filter</span>
                                        )}
                                      </div>

                                      {room.amenities && room.amenities.length > 0 && (
                                        <div className="flex flex-wrap gap-1.5 md:gap-2 mt-2 md:mt-3">
                                          {room.amenities.slice(0, 3).map((amenity, amenityIndex) => (
                                            <span 
                                              key={amenityIndex}
                                              className="px-2 py-0.5 bg-primary/10 text-primary text-[11px] md:text-xs rounded-full font-medium"
                                            >
                                              {amenity}
                                            </span>
                                          ))}
                                          {room.amenities.length > 3 && (
                                            <span className="px-2 py-0.5 bg-purple-100 text-purple-800 text-[11px] md:text-xs rounded-full font-medium">
                                              +{room.amenities.length - 3} more
                                            </span>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                    <div className="text-right shrink-0">
                                      <div className="text-lg md:text-xl font-bold text-primary group-hover:text-primary-600 transition-colors duration-300">
                                        {(() => {
                                          const pricePerNight = room.pricePerNight || room.price || 0;
                                          return formatCurrencyRWF ? formatCurrencyRWF(pricePerNight) : `RWF ${Number(pricePerNight).toLocaleString()}`;
                                        })()}
                                      </div>

                                      <div className="text-xs md:text-sm text-gray-500">per night</div>
                                      {isRoomSelected(room) && (
                                        <div className="mt-2 flex items-center justify-center">
                                          <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center animate-pulse">
                                            <FaCheck className="text-white text-xs" />
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                

                {/* Navigation buttons for room selection */}
                {filteredRooms.length > 0 && (
                  <div className="flex justify-between mt-6">
                    <button
                      onClick={() => setCurrentStep(1)}
                      className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      Back
                    </button>
                    <button
                      onClick={() => {
                        if (selectedRoom) {
                          setCurrentStep(3);
                        } else {
                          toast.error('Please select a room to continue');
                        }
                      }}
                      disabled={!selectedRoom}
                      className={`px-8 py-3 rounded-lg font-medium transition-colors ${
                        selectedRoom
                          ? 'bg-blue-600 hover:bg-blue-700 text-white'
                          : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      }`}
                    >
                      Continue to Select Dates
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Step 3: Select Dates */}
            {currentStep === 3 && (
              <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Select Your Dates</h2>
                
                {selectedRoom && (
                  <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-700">
                          <strong>Selected Room:</strong> {selectedRoom.roomNumber} - {selectedRoom.roomType}
                        </p>
                        <p className="text-xs text-gray-600 mt-1">
                          {formatCurrencyRWF ? formatCurrencyRWF(selectedRoom.pricePerNight || 0) : `RWF ${(selectedRoom.pricePerNight || 0).toLocaleString()}`} per night
                        </p>
                      </div>
                      {selectedRoomUnavailable && bookingData.checkIn && bookingData.checkOut && (
                        <div className="flex items-center gap-2 px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm">
                          <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                          Not Available
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Check-in *</label>
                    <div className="relative">
                      <FaCalendarAlt className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                      <input
                        type="date"
                        value={bookingData.checkIn}
                        onChange={(e) => handleInputChange('checkIn', e.target.value)}
                        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Check-out *</label>
                    <div className="relative">
                      <FaCalendarAlt className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                      <input
                        type="date"
                        value={bookingData.checkOut}
                        onChange={(e) => handleInputChange('checkOut', e.target.value)}
                        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Guests</label>
                    <div className="relative">
                      <FaUsers className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                      <input
                        type="number"
                        min={1}
                        value={bookingData.guests}
                        onChange={(e) => handleInputChange('guests', Number(e.target.value) || 1)}
                        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                </div>

                {/* Check Availability Button */}
                {bookingData.checkIn && bookingData.checkOut && (
                  <div className="mb-6">
                    <button
                      onClick={async () => {
                        await checkAvailability();
                        if (!selectedRoomUnavailable) {
                          toast.success('Room is available for your selected dates!');
                        }
                      }}
                      disabled={loadingRooms}
                      className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loadingRooms ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          Checking Availability...
                        </>
                      ) : (
                        <>
                          <FaCheck />
                          Check Room Availability
                        </>
                      )}
                    </button>
                    <p className="text-xs text-gray-500 text-center mt-2">
                      Click to verify if this room is available for your selected dates
                    </p>
                  </div>
                )}

                {/* Availability Status Message */}
                {bookingData.checkIn && bookingData.checkOut && !loadingRooms && (
                  <div className="mb-6">
                    {selectedRoomUnavailable ? (
                      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                        <div className="flex items-start gap-3">
                          <div className="w-5 h-5 bg-red-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                            <span className="text-white text-xs">✕</span>
                          </div>
                          <div>
                            <h4 className="font-semibold text-red-900 mb-1">Room Not Available</h4>
                            <p className="text-sm text-red-700">
                              {selectedRoom?.roomNumber} is already booked for {new Date(bookingData.checkIn).toLocaleDateString()} to {new Date(bookingData.checkOut).toLocaleDateString()}.
                            </p>
                            <button
                              onClick={() => setCurrentStep(2)}
                              className="mt-3 text-sm text-red-700 underline hover:text-red-900"
                            >
                              ← Choose a different room
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                        <div className="flex items-start gap-3">
                          <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                            <FaCheck className="text-white text-xs" />
                          </div>
                          <div>
                            <h4 className="font-semibold text-green-900 mb-1">Room Available!</h4>
                            <p className="text-sm text-green-700">
                              {selectedRoom?.roomNumber} is available for your selected dates. You can proceed with booking.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div className="flex justify-between mt-6">
                  <button
                    onClick={() => setCurrentStep(2)}
                    className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Back to Rooms
                  </button>
                  <button
                    onClick={() => {
                      if (!selectedRoom) {
                        toast.error('Please select a room before continuing.');
                        setCurrentStep(2);
                        return;
                      }
                      if (!bookingData.checkIn || !bookingData.checkOut) {
                        toast.error('Please select check-in and check-out dates');
                        return;
                      }
                      if (selectedRoomUnavailable) {
                        toast.error('This room is not available for your selected dates. Please choose different dates or another room.');
                        return;
                      }
                      setCurrentStep(4);
                    }}
                    disabled={selectedRoomUnavailable}
                    className={`px-8 py-3 rounded-lg font-medium transition-colors ${
                      selectedRoomUnavailable
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        : 'bg-blue-600 hover:bg-blue-700 text-white'
                    }`}
                  >
                    Continue to Contact Info
                  </button>
                </div>
              </div>
            )}

            {/* Step 4: Contact Information */}
            {currentStep === 4 && (
              <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Contact Information</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      First Name *
                    </label>
                    <input
                      type="text"
                      value={bookingData.contactInfo.firstName}
                      onChange={(e) => handleInputChange('contactInfo.firstName', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Last Name *
                    </label>
                    <input
                      type="text"
                      value={bookingData.contactInfo.lastName}
                      onChange={(e) => handleInputChange('contactInfo.lastName', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email Address *
                    </label>
                    <input
                      type="email"
                      value={bookingData.contactInfo.email}
                      onChange={(e) => handleInputChange('contactInfo.email', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      value={bookingData.contactInfo.phone}
                      onChange={(e) => handleInputChange('contactInfo.phone', e.target.value)}
                      placeholder="+250 78X XXX XXX"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Country
                    </label>
                    <select
                      value={bookingData.contactInfo.country}
                      onChange={(e) => handleInputChange('contactInfo.country', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      {countries.map(country => (
                        <option key={country} value={country}>{country}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Special Requests (Optional)
                  </label>
                  <textarea
                    value={bookingData.specialRequests}
                    onChange={(e) => handleInputChange('specialRequests', e.target.value)}
                    rows={4}
                    placeholder="Any special requests or requirements..."
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div className="flex justify-between">
                  <button
                    onClick={() => setCurrentStep(2)}
                    className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Back
                  </button>
                  <button
                    onClick={() => setCurrentStep(5)}
                    disabled={!bookingData.contactInfo.firstName || !bookingData.contactInfo.lastName || !bookingData.contactInfo.email}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Continue to Payment
                  </button>
                </div>
              </div>
            )}

            {/* Step 5: Payment & Confirmation */}
            {currentStep === 5 && (
              <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Payment & Confirmation</h2>
                
                {/* Debug info - remove in production */}
                {import.meta.env.MODE === 'development' && selectedRoom && (
                  <div className="mb-4 p-3 bg-green-100 border border-green-400 rounded text-sm">
                    <strong>Room Selection Active:</strong> {selectedRoom.roomNumber} (Step 5)
                  </div>
                )}
                
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                  <div className="flex items-start space-x-3">
                    <FaShieldAlt className="text-blue-600 text-lg mt-0.5" />
                    <div>
                      <h3 className="text-sm font-medium text-blue-900">Secure Booking</h3>
                      <p className="text-sm text-blue-700 mt-1">
                        Your payment information is encrypted and secure. You can pay upon arrival or use our secure payment methods.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4 mb-6">
                  <h3 className="text-lg font-semibold text-gray-900">Choose Payment Method</h3>
                  
                  <div className="space-y-3">
                    <button
                      onClick={() => handlePayment('cash')}
                      disabled={loading || !selectedRoom || !bookingData.checkIn || !bookingData.checkOut || selectedRoomUnavailable}

                      className="w-full flex items-center p-3 text-sm border border-gray-300 rounded-lg cursor-pointer bg-white hover:bg-gray-50 text-[#4b2a00] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <div className="flex items-center">
                        <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center mr-3">
                          <span className="text-green-600 font-bold text-sm">C</span>
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">Pay on Arrival</div>
                          <div className="text-sm text-gray-600">Pay in cash when you arrive</div>
                        </div>
                      </div>
                    </button>

                    <button
                      onClick={() => handlePayment('mtn_mobile_money')}
                      disabled={loading || !selectedRoom || !bookingData.checkIn || !bookingData.checkOut || selectedRoomUnavailable}

                      className="w-full flex items-center p-3 text-sm border border-gray-300 rounded-lg cursor-pointer bg-white hover:bg-gray-50 text-[#4b2a00] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <div className="flex items-center">
                        <div className="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center mr-3">
                          <FaMobile className="text-yellow-600" />
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">MTN Mobile Money</div>
                          <div className="text-sm text-gray-600">Pay with your mobile money account</div>
                        </div>
                      </div>
                    </button>
                  </div>
                </div>

                <div className="flex justify-between">
                  <button
                    onClick={() => setCurrentStep(4)}
                    className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Back
                  </button>
                  <button
                    onClick={handleBooking}
                    disabled={loading || !selectedRoom || !bookingData.checkIn || !bookingData.checkOut || selectedRoomUnavailable}

                    className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 rounded-lg font-medium transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? (
                      <span className="inline-flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Processing...
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-2">
                        <FaCheck />
                        Complete Booking (Pay Later)
                      </span>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-lg p-6 sticky top-24">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Booking Summary</h3>
              
              {!selectedRoom ? (
                <div className="text-center py-8">
                  <FaBed className="text-4xl text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500 text-sm">Select a room to see booking details</p>
                </div>
              ) : selectedRoom ? (
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <img
                      loading="lazy"
                      src={(function(){
                        const imgs = selectedRoom && selectedRoom.images;
                        const img = (imgs && imgs[0]) ? imgs[0] : '';
                        if (!img) return 'https://via.placeholder.com/150?text=Room';
                        return img.startsWith('http') ? img : `${API_URL}${img}`;
                      })()}
                      alt={selectedRoom.roomNumber}
                      className="w-16 h-16 object-cover rounded-lg"
                      onError={(e) => { e.currentTarget.src = 'https://via.placeholder.com/150?text=Room'; }}
                    />

                    <div>
                      <div className="font-semibold text-gray-900">{selectedRoom.roomNumber}</div>
                      <p className="text-sm text-gray-600 capitalize">{(selectedRoom.roomType || 'Standard')} Room</p>
                    </div>
                  </div>

                  {bookingData.checkIn && bookingData.checkOut && (
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Check-in:</span>
                        <span className="font-medium">{new Date(bookingData.checkIn).toLocaleDateString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Check-out:</span>
                        <span className="font-medium">{new Date(bookingData.checkOut).toLocaleDateString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Guests:</span>
                        <span className="font-medium">{bookingData.guests}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Rooms:</span>
                        <span className="font-medium">{bookingData.rooms}</span>
                      </div>
                    </div>
                  )}

                  {totalPrice > 0 && (
                    <div className="border-t pt-4 mt-4 space-y-4 text-sm">
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Room price (nightly):</span>
                          <span>RWF {(selectedRoom.pricePerNight || selectedRoom.price || 0).toLocaleString()}/night</span>
                        </div>
                        {discount > 0 && (
                          <div className="flex justify-between text-green-600">
                            <span>Group discount:</span>
                            <span>-RWF {discount.toLocaleString()}</span>
                          </div>
                        )}
                        <div className="flex justify-between font-semibold text-lg">
                          <span>Total:</span>
                          <span className="text-blue-600">RWF {totalPrice.toLocaleString()}</span>
                        </div>
                      </div>

                      {/* Guest-selected add-on services (info only, negotiable) */}
                      <div className="pt-2 border-t border-dashed border-gray-200">
                        <div className="text-sm font-semibold text-gray-900 mb-1">Additional Services</div>
                        <div className="text-xs text-gray-500 mb-2">
                          Select services for information only. Amounts are negotiable and are not added to the total.
                        </div>
                        {(!Array.isArray(property?.addOnServices) || property.addOnServices.length === 0) && (
                          <div className="text-xs text-gray-400">No add-on services configured for this property.</div>
                        )}
                        {Array.isArray(property?.addOnServices) && property.addOnServices.map((addOn) => {
                          const key = addOn.key;
                          const checked = !!(bookingData.services && bookingData.services[key]);
                          const included = addOn.includedItems && typeof addOn.includedItems === 'object'
                            ? Object.keys(addOn.includedItems)
                                .filter((k) => addOn.includedItems[k])
                                .map((k) =>
                                  k
                                    .replace(/_/g, ' ')
                                    .replace(/\s+/g, ' ')
                                    .trim()
                                    .replace(/^(.)/, (m) => m.toUpperCase())
                                )
                            : [];
                          const isFree = !addOn.price || Number(addOn.price) <= 0;
                          return (
                            <div key={key} className="space-y-0.5 mb-1.5">
                              <label className="flex items-center gap-2 text-sm">
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={(e) =>
                                    setBookingData((prev) => ({
                                      ...prev,
                                      services: { ...(prev.services || {}), [key]: e.target.checked },
                                    }))
                                  }
                                />
                                <span>{addOn.name}</span>
                                <span
                                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${
                                    isFree ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'
                                  }`}
                                >
                                  {isFree ? 'Free' : 'Paid (negotiable)'}
                                </span>
                              </label>
                              {included.length > 0 && (
                                <div className="pl-6 text-xs text-gray-500">Includes: {included.join(', ')}</div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <FaBed className="text-4xl mx-auto mb-4 text-gray-300" />
                  <p>Select a room to see booking details</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookingProcess;