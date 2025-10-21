import React, { useState, useEffect } from 'react';
import { FaCalendarAlt, FaUsers, FaBed, FaCheck, FaMobile, FaShieldAlt, FaDollarSign } from 'react-icons/fa';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const BookingProcess = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [property, setProperty] = useState(null);
  const [selectedRoom, setSelectedRoom] = useState(null);
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
    couponCode: ''
  });

  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [loadingRooms, setLoadingRooms] = useState(false);

  const [availableRooms, setAvailableRooms] = useState([]);
  const [filteredRooms, setFilteredRooms] = useState([]);
  const [totalPrice, setTotalPrice] = useState(0);
  const [discount, setDiscount] = useState(0);
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
    fetchProperty();
  }, [id]);

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

  // Restore date/budget from localStorage on first mount
  useEffect(() => {
    try {
      const cached = JSON.parse(localStorage.getItem('akw_booking_pref') || '{}');
      if (cached && (cached.checkIn || cached.checkOut || cached.budget || cached.guests)) {
        setBookingData(prev => ({
          ...prev,
          checkIn: cached.checkIn || prev.checkIn,
          checkOut: cached.checkOut || prev.checkOut,
          budget: cached.budget || prev.budget,
          guests: cached.guests || prev.guests
        }));
      }
    } catch (_) {}
  }, []);

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
        totalAmount: totalPrice,
        roomPrice: selectedRoom.pricePerNight || selectedRoom.price || 0
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
        navigate(`/booking-confirmation/${bookingResponse.booking._id}`);
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

  // NEW: Effect to recalculate total price when relevant data changes
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
        // Process the available rooms with proper image URLs and monthly prices
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
        setAvailableRooms(dedupeRooms(processedAvailableRooms));
        
        // If selected room is no longer available, keep it visible and mark as unavailable with message
        if (selectedRoom) {
          const isStillAvailable = processedAvailableRooms.some(room => {
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
    } catch (error) {
      console.error('Availability check failed:', error);
    } finally {
      setLoadingRooms(false);
    }
  };

  const filterRoomsByBudget = () => {
    if (!bookingData.budget) {
      // If the selected room is not available, append it (marked unavailable) so it doesn't disappear
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
      setFilteredRooms(availableRooms);
      return;
    }

    // Filter by monthly price (convert budget range to monthly)
    const monthlyMin = budgetRange.min * 30;
    const monthlyMax = budgetRange.max * 30;
    
    const filtered = dedupeRooms(availableRooms).filter(room => {
      const roomMonthlyPrice = room.pricePerMonth || ((room.pricePerNight || 0) * 30);
      return roomMonthlyPrice >= monthlyMin && roomMonthlyPrice <= monthlyMax;
    });
    
    setFilteredRooms(filtered);
    
    // FIX: If selected room doesn't match current budget filter, clear selection
    if (selectedRoom && filtered.length > 0) {
      const isInFiltered = filtered.some(room => 
        room._id === selectedRoom._id || room.roomNumber === selectedRoom.roomNumber
      );
      if (!isInFiltered) {
        setSelectedRoom(null);
        toast.info('Your selected room no longer matches the budget filter');
      }
    }
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

  // FIX: Improved room selection handler with proper room data normalization
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
    
    setSelectedRoom(roomWithDefaults);
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
        roomPrice: selectedRoom.pricePerNight || selectedRoom.price || 0
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
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Plan your stay</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Check-in</label>
                    <div className="relative">
                      <FaCalendarAlt className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                      <input
                        type="date"
                        value={bookingData.checkIn}
                        onChange={(e) => handleInputChange('checkIn', e.target.value)}
                        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Check-out</label>
                    <div className="relative">
                      <FaCalendarAlt className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                      <input
                        type="date"
                        value={bookingData.checkOut}
                        onChange={(e) => handleInputChange('checkOut', e.target.value)}
                        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Budget</label>
                    <div className="relative">
                      <FaDollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                      <select
                        value={bookingData.budget}
                        onChange={(e) => handleInputChange('budget', e.target.value)}
                        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="">Any</option>
                        {budgetRanges.map(b => (
                          <option key={b.label} value={b.label}>{b.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="flex items-end">
                    <button
                      onClick={async () => {
                        if (!bookingData.checkIn || !bookingData.checkOut) {
                          toast.error('Please select check-in and check-out dates');
                          return;
                        }
                        await checkAvailability();
                        setCurrentStep(2);
                      }}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
                    >
                      Find available rooms
                    </button>
                  </div>
                </div>
              </div>
            )}
            
            {currentStep === 2 && (
              <div>
                {filteredRooms.length === 0 ? (
                  <div className="text-center py-12">
                    <FaBed className="text-4xl text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">No rooms available</h3>
                    <p className="text-gray-600 mb-4">
                      No rooms match your selected criteria. Try adjusting your budget or dates.
                    </p>
                    <button
                      onClick={() => setCurrentStep(1)}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
                    >
                      Adjust Budget
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {filteredRooms.map((room, index) => (
                      <div
                        key={room._id || room.roomNumber || index}
                        className={`group border-2 rounded-xl p-6 cursor-pointer transition-all duration-500 transform hover:scale-105 hover:shadow-xl ${
                          isRoomSelected(room)
                            ? 'border-blue-500 bg-gradient-to-br from-blue-50 to-blue-100 shadow-lg scale-105'
                            : 'border-gray-200 hover:border-blue-300 bg-white'
                        }`}
                        onClick={() => handleRoomSelect(room)}
                      >
                        <div className="flex items-start space-x-4">
                          {/* Enhanced Room Images */}
                          <div className="w-32 h-24 rounded-lg overflow-hidden relative group">
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
                              className={`w-full h-full bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center ${room.images && room.images.length > 0 ? 'hidden' : ''}`}
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

                          <div className="flex-1">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <h3 className="text-lg font-semibold text-gray-900 group-hover:text-blue-700 transition-colors duration-300">
                                  {room.roomNumber || 'Room ' + (index + 1)}
                                </h3>
                                <p className="text-sm text-gray-600 capitalize font-medium">
                                  {(room.roomType || 'Standard')} Room
                                </p>
                                <div className="flex items-center mt-3 space-x-4 text-sm text-gray-600">
                                  <div className="flex items-center bg-gray-100 px-3 py-1 rounded-full">
                                    <FaUsers className="mr-1 text-blue-600" />
                                    <span className="font-medium">{room.capacity || 1} guests</span>
                                  </div>
                                  <div className={`px-3 py-1 rounded-full text-xs font-medium transition-all duration-300 ${
                                    room.isAvailable !== false 
                                      ? 'bg-green-100 text-green-800 hover:bg-green-200' 
                                      : 'bg-red-100 text-red-800 hover:bg-red-200'
                                  }`}>
                                    {room.isAvailable !== false ? '✓ Available' : '✗ Unavailable'}
                                  </div>
                                </div>
                                
                                {/* Room Amenities */}
                                {room.amenities && room.amenities.length > 0 && (
                                  <div className="flex flex-wrap gap-2 mt-3">
                                    {room.amenities.slice(0, 3).map((amenity, amenityIndex) => (
                                      <span 
                                        key={amenityIndex}
                                        className="px-2 py-1 bg-gradient-to-r from-blue-100 to-blue-200 text-blue-800 text-xs rounded-full font-medium"
                                      >
                                        {amenity}
                                      </span>
                                    ))}
                                    {room.amenities.length > 3 && (
                                      <span className="px-2 py-1 bg-gradient-to-r from-purple-100 to-purple-200 text-purple-800 text-xs rounded-full font-medium">
                                        +{room.amenities.length - 3} more
                                      </span>
                                    )}
                                  </div>
                                )}
                              </div>
                              <div className="text-right">
                                <div className="text-xl font-bold text-blue-600 group-hover:text-blue-700 transition-colors duration-300">
                                  RWF {(() => {
                                    const pricePerNight = room.pricePerNight || room.price || 0;
                                    return pricePerNight.toLocaleString();
                                  })()}
                                </div>
                                <div className="text-sm text-gray-500">per night</div>
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
                          setCurrentStep(4);
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
                      Continue to Contact Info
                    </button>
                  </div>
                )}
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
                      disabled={loading}
                      className="w-full flex items-center p-4 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
                      disabled={loading}
                      className="w-full flex items-center p-4 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
                    disabled={loading || !selectedRoom}
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
              {selectedRoom ? (
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
                    <div className="border-t pt-4 mt-4">
                      <div className="space-y-2 text-sm">
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