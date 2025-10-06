import React, { useState, useEffect } from 'react';
import { FaCalendarAlt, FaUsers, FaBed, FaBath, FaWifi, FaCar, FaSwimmingPool, FaUtensils, FaStar, FaMapMarkerAlt, FaHeart, FaShare, FaChevronLeft, FaChevronRight, FaCheck, FaTimes, FaCreditCard, FaMobile, FaShieldAlt } from 'react-icons/fa';
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
    }
  });
  
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [availableRooms, setAvailableRooms] = useState([]);
  const [filteredRooms, setFilteredRooms] = useState([]);
  const [totalPrice, setTotalPrice] = useState(0);
  const [discount, setDiscount] = useState(0);

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

  useEffect(() => {
    fetchProperty();
  }, [id]);

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

      setAvailableRooms(processedRooms);
    } catch (error) {
      toast.error(`Failed to load property: ${error.message}`);
      navigate('/apartments');
    } finally {
      setLoading(false);
    }
  };

  const checkAvailability = async () => {
    try {
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
        setAvailableRooms(processedAvailableRooms);
        
        // FIX: If selected room is no longer available, clear selection
        if (selectedRoom) {
          const isStillAvailable = processedAvailableRooms.some(room => 
            room._id === selectedRoom._id || room.roomNumber === selectedRoom.roomNumber
          );
          if (!isStillAvailable) {
            setSelectedRoom(null);
            toast.error('Your previously selected room is no longer available');
          }
        }
      }
    } catch (error) {
      console.error('Availability check failed:', error);
    }
  };

  const filterRoomsByBudget = () => {
    if (!bookingData.budget) {
      setFilteredRooms(availableRooms);
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
    
    const filtered = availableRooms.filter(room => {
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
      const total = selectedRoom.pricePerNight * numberOfNights;
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
    
    console.log('Room selected:', roomWithDefaults);
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

    if (!bookingData.contactInfo.firstName || !bookingData.contactInfo.lastName || !bookingData.contactInfo.email || !bookingData.contactInfo.age) {
      toast.error('Please fill in all required contact information including age');
      return;
    }

    try {
      setLoading(true);
      
      // FIX: Ensure we have proper room ID for booking
      const roomId = selectedRoom._id || selectedRoom.id;
      if (!roomId) {
        throw new Error('Invalid room selection');
      }

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
        paymentMethod: 'cash', // Default to cash, can be changed in payment step
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

  const handlePayment = async (paymentMethod) => {
    if (!selectedRoom) {
      toast.error('Please select a room');
      return;
    }

    if (!bookingData.contactInfo.firstName || !bookingData.contactInfo.lastName || !bookingData.contactInfo.email || !bookingData.contactInfo.age) {
      toast.error('Please fill in all required contact information including age');
      return;
    }

    try {
      setLoading(true);

      const roomId = selectedRoom._id || selectedRoom.id;
      if (!roomId) {
        throw new Error('Invalid room selection');
      }

      const bookingPayload = {
        propertyId: id,
        room: roomId,
        checkIn: bookingData.checkIn,
        checkOut: bookingData.checkOut,
        numberOfGuests: bookingData.guests,
        guestBreakdown: bookingData.guestBreakdown,
        contactInfo: bookingData.contactInfo,
        specialRequests: bookingData.specialRequests,
        groupBooking: bookingData.guests >= 4,
        groupSize: bookingData.guests,
        paymentMethod: paymentMethod,
        totalAmount: totalPrice,
        roomPrice: selectedRoom.pricePerNight || selectedRoom.price || 0
      };

      // Create booking
      const bookingRes = await fetch(`${API_URL}/api/bookings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(bookingPayload)
      });

      const bookingResponse = await bookingRes.json();
      if (!bookingRes.ok) throw new Error(bookingResponse.message || 'Failed to create booking');

      // If cash payment, go directly to confirmation
      if (paymentMethod === 'cash') {
        toast.success('Booking created successfully! Payment on arrival.');
        navigate(`/booking-confirmation/${bookingResponse.booking._id}`);
        return;
      }

      // If MTN Mobile Money, redirect to payment page
      if (paymentMethod === 'mtn_mobile_money') {
        toast.success('Booking created! Redirecting to payment...');
        // Navigate to MTN payment page with booking details
        navigate(`/mtn-payment`, {
          state: {
            bookingId: bookingResponse.booking._id,
            amount: totalPrice,
            description: `Booking for ${property.title}`,
            customerName: `${bookingData.contactInfo.firstName} ${bookingData.contactInfo.lastName}`,
            customerEmail: bookingData.contactInfo.email,
            phoneNumber: bookingData.contactInfo.phone || ''
          }
        });
        return;
      }

    } catch (error) {
      console.error('Payment error:', error);
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };
//remove eerors
  const renderStars = (rating) => {
    if (!rating) return null;
    return Array.from({ length: 5 }, (_, i) => (
      <FaStar
        key={i}
        className={`${i < Math.floor(rating) ? 'text-yellow-400' : 'text-gray-300'}`}
      />
    ));
  };

  const getAmenityIcon = (amenity) => {
    const iconMap = {
      'WiFi': FaWifi,
      'Parking': FaCar,
      'Pool': FaSwimmingPool,
      'Restaurant': FaUtensils,
      'Bed': FaBed,
      'Bath': FaBath
    };
    return iconMap[amenity] || FaCheck;
  };

  if (loading && !property) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading property details...</p>
        </div>
      </div>
    );
  }

  if (!property) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Property Not Found</h1>
          <button
            onClick={() => navigate('/apartments')}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
          >
            Back to Properties
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => navigate(-1)}
              className="flex items-center text-gray-600 hover:text-gray-800 transition-colors"
            >
              <FaChevronLeft className="mr-2" />
              Back
            </button>
            <div className="flex items-center space-x-4">
              <button className="p-2 text-gray-400 hover:text-gray-600 transition-colors">
                <FaShare />
              </button>
              <button className="p-2 text-gray-400 hover:text-red-600 transition-colors">
                <FaHeart />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Property Header */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">{property.title}</h1>
              <div className="flex items-center text-gray-600 mb-2">
                <FaMapMarkerAlt className="mr-2" />
                <span>{property.address}, {property.city}</span>
              </div>
              <div className="flex items-center space-x-4">
                <div className="flex items-center">
                  {renderStars(property.ratings?.length ? property.ratings.reduce((sum, r) => sum + r.rating, 0) / property.ratings.length : 0)}
                  <span className="ml-2 text-sm text-gray-600">
                    {property.ratings?.length || 0} reviews
                  </span>
                </div>
                <span className="text-sm text-gray-500">•</span>
                <span className="text-sm text-gray-600">{property.category}</span>
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-blue-600">
                RWF {property.pricePerNight?.toLocaleString()}
              </div>
              <div className="text-sm text-gray-500">per night</div>
            </div>
          </div>

          {/* Property Images */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {property.images?.slice(0, 3).map((image, index) => (
              <img
                key={index}
                src={image.startsWith('http') ? image : `${API_URL}${image}`}
                alt={`${property.title} ${index + 1}`}
                className={`w-full h-48 object-cover rounded-lg ${index === 0 ? 'md:col-span-2 md:row-span-2 md:h-96' : ''}`}
              />
            ))}
          </div>

          {/* Property Amenities */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Property Amenities</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {property.amenities?.slice(0, 8).map((amenity, index) => {
                const IconComponent = getAmenityIcon(amenity);
                return (
                  <div key={index} className="flex items-center text-sm text-gray-600">
                    <IconComponent className="mr-2 text-blue-600" />
                    {amenity}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Booking Steps */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2">
            {/* Step 1: Dates & Guests */}
            {currentStep === 1 && (
              <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Select Dates & Guests</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Check-in Date *
                    </label>
                    <input
                      type="date"
                      value={bookingData.checkIn}
                      onChange={(e) => handleInputChange('checkIn', e.target.value)}
                      min={new Date().toISOString().split('T')[0]}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Check-out Date *
                    </label>
                    <input
                      type="date"
                      value={bookingData.checkOut}
                      onChange={(e) => handleInputChange('checkOut', e.target.value)}
                      min={bookingData.checkIn || new Date().toISOString().split('T')[0]}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Number of Guests *
                    </label>
                    <select
                      value={bookingData.guests}
                      onChange={(e) => handleInputChange('guests', Number(e.target.value))}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      {Array.from({ length: 10 }, (_, i) => (
                        <option key={i + 1} value={i + 1}>{i + 1} {i === 0 ? 'Guest' : 'Guests'}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Number of Rooms
                    </label>
                    <select
                      value={bookingData.rooms}
                      onChange={(e) => handleInputChange('rooms', Number(e.target.value))}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      {Array.from({ length: 5 }, (_, i) => (
                        <option key={i + 1} value={i + 1}>{i + 1} {i === 0 ? 'Room' : 'Rooms'}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    onClick={() => setCurrentStep(2)}
                    disabled={!bookingData.checkIn || !bookingData.checkOut}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Continue to Budget Selection
                  </button>
                </div>
              </div>
            )}

            {/* Step 2: Budget Selection */}
            {currentStep === 2 && (
              <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Choose Your Budget Range</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  {budgetRanges.map((range, index) => (
                    <div
                      key={index}
                      className={`group border-2 rounded-xl p-6 cursor-pointer transition-all duration-500 transform hover:scale-105 hover:shadow-xl ${
                        bookingData.budget === range.label
                          ? `border-${range.color}-500 bg-gradient-to-br from-${range.color}-50 to-${range.color}-100 shadow-lg scale-105`
                          : 'border-gray-200 hover:border-blue-300 bg-white'
                      }`}
                      onClick={() => handleInputChange('budget', range.label)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <h3 className="font-bold text-gray-900 text-lg group-hover:text-blue-700 transition-colors duration-300">
                            {range.label}
                          </h3>
                          <p className="text-sm text-gray-600 mt-1 font-medium">
                            RWF {range.min.toLocaleString()} - RWF {range.max.toLocaleString()}
                          </p>
                          <div className="mt-2">
                            <div className={`w-full h-2 rounded-full bg-${range.color}-200`}>
                              <div 
                                className={`h-2 rounded-full bg-gradient-to-r from-${range.color}-400 to-${range.color}-600 transition-all duration-500`}
                                style={{ width: `${((range.max - range.min) / 1000000) * 100}%` }}
                              ></div>
                            </div>
                          </div>
                        </div>
                        {bookingData.budget === range.label && (
                          <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center animate-pulse">
                            <FaCheck className="text-white text-lg" />
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex justify-between">
                  <button
                    onClick={() => setCurrentStep(1)}
                    className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Back
                  </button>
                  <button
                    onClick={() => setCurrentStep(3)}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg font-medium transition-colors"
                  >
                    Continue to Room Selection
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: Room Selection */}
            {currentStep === 3 && (
              <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Select Your Room</h2>
                
                {/* Debug info - remove in production */}
                {process.env.NODE_ENV === 'development' && (
                  <div className="mb-4 p-3 bg-yellow-100 border border-yellow-400 rounded text-sm">
                    <strong>Debug Info:</strong> Selected Room: {selectedRoom ? `${selectedRoom.roomNumber} (ID: ${selectedRoom._id})` : 'None'}, 
                    Available Rooms: {availableRooms.length}, 
                    Filtered Rooms: {filteredRooms.length}
                  </div>
                )}
                
                {filteredRooms.length === 0 ? (
                  <div className="text-center py-12">
                    <FaBed className="text-4xl text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">No rooms available</h3>
                    <p className="text-gray-600 mb-4">
                      No rooms match your selected criteria. Try adjusting your budget or dates.
                    </p>
                    <button
                      onClick={() => setCurrentStep(2)}
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
                          <div className="w-32 h-24 rounded-lg overflow-hidden relative group/image">
                            {room.images && room.images.length > 0 ? (
                              <img
                                src={room.images[0]}
                                alt={room.roomNumber}
                                className="w-full h-full object-cover transition-transform duration-500 group-hover/image:scale-110"
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

                <div className="flex justify-between mt-6">
                  <button
                    onClick={() => setCurrentStep(2)}
                    className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Back
                  </button>
                  <button
                    onClick={() => {
                      console.log('Continue button clicked, selectedRoom:', selectedRoom);
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
              </div>
            )}

            {/* Step 4: Contact Information */}
            {currentStep === 4 && (
              <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Contact Information</h2>
                
                {/* Debug info - remove in production */}
                {process.env.NODE_ENV === 'development' && selectedRoom && (
                  <div className="mb-4 p-3 bg-green-100 border border-green-400 rounded text-sm">
                    <strong>Room Selection Active:</strong> {selectedRoom.roomNumber} (Step 4)
                  </div>
                )}
                
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
                      Age *
                    </label>
                    <input
                      type="number"
                      min="18"
                      max="100"
                      value={bookingData.contactInfo.age}
                      onChange={(e) => handleInputChange('contactInfo.age', e.target.value)}
                      placeholder="Enter your age"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>
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
                    onClick={() => setCurrentStep(3)}
                    className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Back
                  </button>
                  <button
                    onClick={() => setCurrentStep(5)}
                    disabled={!bookingData.contactInfo.firstName || !bookingData.contactInfo.lastName || !bookingData.contactInfo.email || !bookingData.contactInfo.age}
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
                {process.env.NODE_ENV === 'development' && selectedRoom && (
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
                    </button></div>
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
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Processing...
                      </>
                    ) : (
                      <>
                        <FaCheck />
                        Complete Booking (Pay Later)
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Sidebar - Booking Summary */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-lg p-6 sticky top-24">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Booking Summary</h3>
              
              {selectedRoom ? (
                <div className="space-y-4">
                  <div className="flex items-center space-x-3">
                    <img
                      src={selectedRoom.images?.[0]?.startsWith('http') ? selectedRoom.images[0] : `${API_URL}${selectedRoom.images?.[0]}` || 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=100&h=100&fit=crop'}
                      alt={selectedRoom.roomNumber}
                      className="w-16 h-16 object-cover rounded-lg"
                      onError={(e) => {
                        e.target.style.display = 'none';
                        e.target.nextSibling.style.display = 'block';
                      }}
                    />
                    <div className="w-16 h-16 bg-gray-200 rounded-lg flex items-center justify-center" style={{ display: 'none' }}>
                      <FaBed className="text-gray-400" />
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">{selectedRoom.roomNumber || 'Selected Room'}</h4>
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
                    <div className="border-t pt-4">
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