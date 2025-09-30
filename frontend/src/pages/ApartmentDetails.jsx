import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import {
  FaBed,
  FaBath,
  FaWifi,
  FaCar,
  FaUtensils,
  FaMapMarkerAlt,
  FaCalendarAlt,
  FaUser,
  FaStar,
  FaHeart,
  FaShare,
  FaPhone,
  FaEnvelope,
  FaSwimmingPool,
  FaTv,
  FaBook,
  FaShieldAlt,
  FaCoffee,
  FaParking,
  FaBus,
  FaKey,
  FaHome,
  FaDoorOpen,
  FaCheck,
  FaChevronLeft,
  FaChevronRight,
  // FaEye,
  // FaPlay,
  // FaPause,
  // FaVolumeUp,
  // FaVolumeMute
} from 'react-icons/fa';

const ApartmentDetails = () => {
  const [selectedImage, setSelectedImage] = useState(0);
  const [isFavorited, setIsFavorited] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [bookingData, setBookingData] = useState({
    checkIn: '',
    checkOut: '',
    guests: 1
  });

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
  const { id } = useParams();
  const [apartment, setApartment] = useState(null);
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const makeAbsolute = (u) =>
    u && !u.startsWith('http') ? `${API_URL}${u}` : u;

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API_URL}/api/properties/${id}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Failed to load property');

        const p = data.property;
        
        // Enhanced amenities mapping
        const amenityIcons = {
          'WiFi': FaWifi,
          'Parking': FaCar,
          'Kitchen': FaUtensils,
          'Pool': FaSwimmingPool,
          'TV': FaTv,
          'Air Conditioning': FaBook,
          'Security': FaShieldAlt,
          'Coffee Machine': FaCoffee,
          'Elevator': FaBus,
          'Keyless Entry': FaKey,
          'Balcony': FaHome,
          'Garden': FaHome
        };

        const processedAmenities = (p.amenities || []).map(amenity => ({
          icon: amenityIcons[amenity] || FaHome,
          name: amenity
        }));

        setApartment({
          id: p._id,
          title: p.title,
          location: `${p.address}, ${p.city}`,
          price: p.pricePerNight,
          rating: p.ratings?.length ? p.ratings.reduce((sum, r) => sum + r.rating, 0) / p.ratings.length : 0,
          reviews: p.ratings?.length || 0,
          type: p.category || 'Apartment',
          size: p.size || '—',
          bedrooms: p.bedrooms ?? 0,
          bathrooms: p.bathrooms ?? 0,
          images:
            p.images && p.images.length
              ? p.images.map((i) => makeAbsolute(i))
              : [
                  'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800&h=600&fit=crop'
                ],
          rooms: p.rooms || [],
          amenities: processedAmenities,
          description: p.description || 'Beautiful apartment with great amenities.',
          host: {
            name: p.host ? `${p.host.firstName} ${p.host.lastName}` : '—',
            avatar: null,
            rating: p.host?.rating || 0,
            responseTime: 'Within an hour',
            joinDate: '2020',
            email: p.host?.email,
            phone: p.host?.phone
          },
          nearby: [],
          features: {
            checkIn: '3:00 PM',
            checkOut: '11:00 AM',
            cancellation: 'Free cancellation up to 24 hours before check-in',
            houseRules: [
              'No smoking',
              'No pets',
              'No parties or events',
              'Check-in is anytime after 3:00 PM'
            ]
          }
        });
      } catch (e) {
        toast.error(e.message);
      }
    })();
  }, [id]);

  const handleBooking = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_URL}/api/bookings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          propertyId: id,
          checkIn: bookingData.checkIn,
          checkOut: bookingData.checkOut,
          guests: bookingData.guests
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to book');
      toast.success('Booking created');
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleInputChange = (field, value) => {
    setBookingData((prev) => ({
      ...prev,
      [field]: value
    }));
  };

  const renderStars = (rating) => {
    return Array.from({ length: 5 }, (_, i) => {
      const full = i < Math.floor(rating);
      const half = !full && i < rating;
      return (
        <FaStar
          key={i}
          className={
            full
              ? 'text-yellow-400'
              : half
              ? 'text-yellow-300'
              : 'text-gray-300'
          }
          style={half ? { clipPath: 'inset(0 50% 0 0)' } : {}}
        />
      );
    });
  };

  if (!apartment) return <div className="min-h-screen bg-gray-50" />;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2">{apartment.title}</h1>
              <div className="flex items-center">
                <FaMapMarkerAlt className="text-blue-200 mr-2" />
                <span className="text-blue-100">{apartment.location}</span>
              </div>
              <div className="flex items-center mt-3">
                {renderStars(apartment.rating)}
                <span className="ml-2 text-blue-100">
                  {apartment.rating.toFixed(1)} ({apartment.reviews} reviews)
                </span>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <button className="p-3 bg-white/20 text-white rounded-full hover:bg-white/30 transition-colors">
                <FaShare className="text-xl" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Apartment Info */}
          <div className="lg:col-span-2 space-y-8">
            {/* Enhanced Image Gallery */}
            <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
              <div className="relative group">
                <img
                  src={apartment.images[selectedImage]}
                  alt={apartment.title}
                  className="w-full h-96 object-cover transition-all duration-500 group-hover:scale-105"
                />
                
                {/* Navigation Arrows */}
                {apartment.images.length > 1 && (
                  <>
                    <button
                      onClick={() => setSelectedImage(selectedImage === 0 ? apartment.images.length - 1 : selectedImage - 1)}
                      className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 hover:bg-opacity-70 text-white p-2 rounded-full transition-all duration-300 opacity-0 group-hover:opacity-100"
                    >
                      <FaChevronLeft />
                    </button>
                    <button
                      onClick={() => setSelectedImage(selectedImage === apartment.images.length - 1 ? 0 : selectedImage + 1)}
                      className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 hover:bg-opacity-70 text-white p-2 rounded-full transition-all duration-300 opacity-0 group-hover:opacity-100"
                    >
                      <FaChevronRight />
                    </button>
                  </>
                )}
                
                {/* Image Counter */}
                <div className="absolute bottom-4 left-4 bg-black bg-opacity-50 text-white px-3 py-1 rounded-full text-sm font-medium">
                  {selectedImage + 1} / {apartment.images.length}
                </div>
                
                {/* Favorite Button Overlay */}
                <button
                  onClick={() => setIsFavorited(!isFavorited)}
                  className={`absolute top-4 right-4 p-3 rounded-full transition-all duration-300 ${
                    isFavorited
                      ? 'bg-red-500 text-white shadow-lg'
                      : 'bg-white bg-opacity-80 text-gray-600 hover:bg-opacity-100'
                  }`}
                >
                  <FaHeart className={`text-xl ${isFavorited ? 'animate-pulse' : ''}`} />
                </button>
              </div>
              
              {/* Thumbnail Gallery */}
              <div className="p-4">
                <div className="grid grid-cols-4 gap-2">
                  {apartment.images.map((image, index) => (
                    <button
                      key={index}
                      onClick={() => setSelectedImage(index)}
                      className={`relative h-20 rounded-lg overflow-hidden transition-all duration-300 group/thumb ${
                        selectedImage === index 
                          ? 'ring-2 ring-blue-500 scale-105' 
                          : 'hover:scale-105 hover:ring-2 hover:ring-blue-300'
                      }`}
                    >
                      <img
                        src={image}
                        alt={`View ${index + 1}`}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover/thumb:scale-110"
                      />
                      {selectedImage === index && (
                        <div className="absolute inset-0 bg-blue-500 bg-opacity-20 flex items-center justify-center">
                          <FaCheck className="text-white text-lg" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Property Overview */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-800 mb-2">
                    {apartment.type}
                  </h2>
                  <div className="flex items-center space-x-6 text-gray-600">
                    <div className="flex items-center">
                      <FaBed className="mr-2" />
                      <span>{apartment.bedrooms} Bedrooms</span>
                    </div>
                    <div className="flex items-center">
                      <FaBath className="mr-2" />
                      <span>{apartment.bathrooms} Bathrooms</span>
                    </div>
                    <div className="flex items-center">
                      <span>{apartment.size}</span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="flex items-center mb-1">
                    {renderStars(apartment.rating)}
                    <span className="ml-2 text-gray-600">
                      {apartment.rating.toFixed(1)}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500">
                    ({apartment.reviews} reviews)
                  </p>
                </div>
              </div>

              <div className="border-t pt-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-3">
                  About this {apartment.type.toLowerCase()}
                </h3>
                <p className="text-gray-700 leading-relaxed mb-4">
                  {apartment.description}
                </p>
                
                {/* Property Features */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  <div className="flex items-center space-x-3">
                    <FaDoorOpen className="text-blue-600" />
                    <span className="text-gray-700">Check-in: {apartment.features?.checkIn}</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <FaKey className="text-blue-600" />
                    <span className="text-gray-700">Check-out: {apartment.features?.checkOut}</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <FaShieldAlt className="text-blue-600" />
                    <span className="text-gray-700">{apartment.features?.cancellation}</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <FaHome className="text-blue-600" />
                    <span className="text-gray-700">Entire place</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Rooms Showcase */}
            {apartment.rooms && apartment.rooms.length > 0 && (
              <div className="bg-white rounded-2xl shadow-lg p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold text-gray-800">
                    Available Rooms
                  </h3>
                  <div className="flex items-center space-x-2 text-sm text-gray-600">
                    <FaBed className="text-blue-600" />
                    <span>{apartment.rooms.length} rooms available</span>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {apartment.rooms.map((room, index) => (
                    <div 
                      key={index}
                      className={`group border-2 rounded-xl p-4 cursor-pointer transition-all duration-500 transform hover:scale-105 hover:shadow-xl ${
                        selectedRoom === index 
                          ? 'border-blue-500 bg-gradient-to-br from-blue-50 to-blue-100 shadow-lg scale-105' 
                          : 'border-gray-200 hover:border-blue-300 bg-white'
                      }`}
                      onClick={() => setSelectedRoom(selectedRoom === index ? null : index)}
                    >
                      {/* Room Header with Animation */}
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-800 text-lg group-hover:text-blue-700 transition-colors duration-300">
                            {room.roomNumber}
                          </h4>
                          <p className="text-sm text-gray-600 capitalize font-medium">
                            {room.roomType} Room
                          </p>
                        </div>
                        <div className="text-right">
                          <div className="text-xl font-bold text-blue-600 group-hover:text-blue-700 transition-colors duration-300">
                            RWF {room.pricePerNight?.toLocaleString() || '0'}
                          </div>
                          <div className="text-sm text-gray-500">per night</div>
                        </div>
                      </div>
                      
                      {/* Room Info with Icons */}
                      <div className="flex items-center space-x-4 text-sm text-gray-600 mb-4">
                        <div className="flex items-center bg-gray-100 px-3 py-1 rounded-full">
                          <FaUser className="mr-1 text-blue-600" />
                          <span className="font-medium">{room.capacity} guest{room.capacity > 1 ? 's' : ''}</span>
                        </div>
                        <div className={`px-3 py-1 rounded-full text-xs font-medium transition-all duration-300 ${
                          room.isAvailable 
                            ? 'bg-green-100 text-green-800 hover:bg-green-200' 
                            : 'bg-red-100 text-red-800 hover:bg-red-200'
                        }`}>
                          {room.isAvailable ? '✓ Available' : '✗ Unavailable'}
                        </div>
                      </div>

                      {/* Room Images with Enhanced Gallery */}
                      {room.images && room.images.length > 0 && (
                        <div className="grid grid-cols-2 gap-2 mb-4">
                          {room.images.slice(0, 4).map((image, imgIndex) => (
                            <div key={imgIndex} className="relative group/image overflow-hidden rounded-lg">
                              <img
                                src={makeAbsolute(image)}
                                alt={`${room.roomNumber} - Image ${imgIndex + 1}`}
                                className="w-full h-20 object-cover transition-transform duration-500 group-hover/image:scale-110"
                              />
                              <div className="absolute inset-0 bg-black bg-opacity-0 group-hover/image:bg-opacity-20 transition-all duration-300"></div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Room Amenities with Enhanced Design */}
                      {room.amenities && room.amenities.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-3">
                          {room.amenities.slice(0, 3).map((amenity, amenityIndex) => (
                            <span 
                              key={amenityIndex}
                              className="px-3 py-1 bg-gradient-to-r from-blue-100 to-blue-200 text-blue-800 text-xs rounded-full font-medium hover:from-blue-200 hover:to-blue-300 transition-all duration-300"
                            >
                              {amenity}
                            </span>
                          ))}
                          {room.amenities.length > 3 && (
                            <span className="px-3 py-1 bg-gradient-to-r from-purple-100 to-purple-200 text-purple-800 text-xs rounded-full font-medium hover:from-purple-200 hover:to-purple-300 transition-all duration-300">
                              +{room.amenities.length - 3} more
                            </span>
                          )}
                        </div>
                      )}

                      {/* Expandable Details with Smooth Animation */}
                      <div className={`overflow-hidden transition-all duration-500 ${
                        selectedRoom === index ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
                      }`}>
                        <div className="mt-4 pt-4 border-t border-gray-200">
                          <h5 className="font-semibold text-gray-800 mb-3 flex items-center">
                            <FaBed className="mr-2 text-blue-600" />
                            Room Details
                          </h5>
                          <div className="space-y-3 text-sm">
                            <div className="flex justify-between items-center bg-gray-50 p-2 rounded-lg">
                              <span className="text-gray-600">Room Type:</span>
                              <span className="capitalize font-medium text-gray-800">{room.roomType}</span>
                            </div>
                            <div className="flex justify-between items-center bg-gray-50 p-2 rounded-lg">
                              <span className="text-gray-600">Capacity:</span>
                              <span className="font-medium text-gray-800">{room.capacity} guests</span>
                            </div>
                            <div className="flex justify-between items-center bg-blue-50 p-2 rounded-lg">
                              <span className="text-gray-600">Price per night:</span>
                              <span className="font-bold text-blue-600 text-lg">RWF {room.pricePerNight?.toLocaleString() || '0'}</span>
                            </div>
                          </div>
                          
                          {room.amenities && room.amenities.length > 0 && (
                            <div className="mt-4">
                              <h6 className="font-semibold text-gray-800 mb-3 flex items-center">
                                <FaStar className="mr-2 text-yellow-500" />
                                All Room Amenities
                              </h6>
                              <div className="flex flex-wrap gap-2">
                                {room.amenities.map((amenity, amenityIndex) => (
                                  <span 
                                    key={amenityIndex}
                                    className="px-3 py-1 bg-gradient-to-r from-green-100 to-green-200 text-green-800 text-xs rounded-full font-medium hover:from-green-200 hover:to-green-300 transition-all duration-300"
                                  >
                                    {amenity}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Selection Indicator */}
                      {selectedRoom === index && (
                        <div className="absolute top-2 right-2 w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center animate-pulse">
                          <FaCheck className="text-white text-xs" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Amenities */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">
                What this place offers
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {apartment.amenities.map((amenity, index) => {
                  const IconComponent = amenity.icon;
                  return (
                    <div
                      key={index}
                      className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <IconComponent className="text-blue-600 text-xl" />
                      <span className="text-gray-700">{amenity.name}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* House Rules */}
            {apartment.features?.houseRules && (
              <div className="bg-white rounded-2xl shadow-lg p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">
                  House Rules
                </h3>
                <div className="space-y-3">
                  {apartment.features.houseRules.map((rule, index) => (
                    <div key={index} className="flex items-start space-x-3">
                      <div className="w-2 h-2 bg-blue-600 rounded-full mt-2 flex-shrink-0"></div>
                      <span className="text-gray-700">{rule}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Host */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">
                Meet your host
              </h3>
              <div className="flex items-start space-x-4">
                {apartment.host.avatar ? (
                  <img
                    src={apartment.host.avatar}
                    alt={apartment.host.name}
                    className="w-16 h-16 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-blue-600 text-white flex items-center justify-center text-2xl font-bold">
                    {(apartment.host.name?.trim?.()?.[0] || 'H').toUpperCase()}
                  </div>
                )}
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-800 text-lg">
                    {apartment.host.name}
                  </h4>
                  <div className="flex items-center space-x-4 text-sm text-gray-600 mb-2">
                    <div className="flex items-center">
                      {renderStars(apartment.host.rating)}
                      <span className="ml-1">{apartment.host.rating}</span>
                    </div>
                    <span>Response time: {apartment.host.responseTime}</span>
                    <span>Host since {apartment.host.joinDate}</span>
                  </div>
                  
                  {/* Host Contact Info */}
                  <div className="space-y-1 text-sm text-gray-600">
                    {apartment.host.email && (
                      <div className="flex items-center space-x-2">
                        <FaEnvelope className="text-blue-600" />
                        <span>{apartment.host.email}</span>
                      </div>
                    )}
                    {apartment.host.phone && (
                      <div className="flex items-center space-x-2">
                        <FaPhone className="text-blue-600" />
                        <span>{apartment.host.phone}</span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex flex-col space-y-2">
                  {apartment.host.phone && (
                    <a 
                      href={`tel:${apartment.host.phone}`}
                      className="p-2 bg-blue-100 text-blue-600 rounded-full hover:bg-blue-200 transition-colors"
                      title="Call host"
                    >
                      <FaPhone />
                    </a>
                  )}
                  {apartment.host.email && (
                    <a 
                      href={`mailto:${apartment.host.email}`}
                      className="p-2 bg-blue-100 text-blue-600 rounded-full hover:bg-blue-200 transition-colors"
                      title="Email host"
                    >
                      <FaEnvelope />
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Booking Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-lg p-6 sticky top-8">
              <div className="text-center mb-6">
                <div className="text-3xl font-bold text-blue-600 mb-1">
                  RWF {apartment.price.toLocaleString()}
                </div>
                <span className="text-gray-600">per month</span>
              </div>

              <form onSubmit={handleBooking} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Check-in Date
                  </label>
                  <div className="relative">
                    <FaCalendarAlt className="absolute left-3 top-1/2 transform -translate-y-1/2 text-blue-600" />
                    <input
                      type="date"
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300"
                      value={bookingData.checkIn}
                      onChange={(e) =>
                        handleInputChange('checkIn', e.target.value)
                      }
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Check-out Date
                  </label>
                  <div className="relative">
                    <FaCalendarAlt className="absolute left-3 top-1/2 transform -translate-y-1/2 text-blue-600" />
                    <input
                      type="date"
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300"
                      value={bookingData.checkOut}
                      onChange={(e) =>
                        handleInputChange('checkOut', e.target.value)
                      }
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Guests
                  </label>
                  <div className="relative">
                    <FaUser className="absolute left-3 top-1/2 transform -translate-y-1/2 text-blue-600" />
                    <select
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 appearance-none bg-white"
                      value={bookingData.guests}
                      onChange={(e) =>
                        handleInputChange('guests', e.target.value)
                      }
                    >
                      <option value="1">1 Guest</option>
                      <option value="2">2 Guests</option>
                      <option value="3">3 Guests</option>
                      <option value="4">4 Guests</option>
                    </select>
                  </div>
                </div>

                <button
                  type="button"
                  disabled={!isAuthenticated}
                  onClick={(e) => {
                    if (!isAuthenticated) {
                      e.preventDefault();
                      navigate('/login');
                    } else {
                      // Navigate to the comprehensive booking process
                      navigate(`/booking/${id}`);
                    }
                  }}
                  className={`w-full ${
                    isAuthenticated
                      ? 'bg-blue-600 hover:bg-blue-700'
                      : 'bg-gray-300'
                  } text-white py-4 rounded-xl font-semibold transition-all duration-300 ${
                    isAuthenticated
                      ? 'hover:scale-105 shadow-lg hover:shadow-xl'
                      : ''
                  }`}
                >
                  {isAuthenticated ? 'Start Booking Process' : 'Login to Book'}
                </button>

                <div className="text-center">
                  <p className="text-sm text-gray-500">
                    You won't be charged yet
                  </p>
                </div>
              </form>

              <div className="mt-6 pt-6 border-t">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Monthly rent</span>
                  <span className="font-medium">
                    RWF {apartment.price.toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm mt-2">
                  <span className="text-gray-600">Commission (approx.)</span>
                  <span className="font-medium">
                    RWF {(apartment.price * 0.1).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ApartmentDetails;
