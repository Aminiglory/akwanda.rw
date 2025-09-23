import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { FaBed, FaBath, FaWifi, FaCar, FaUtensils, FaSwimmingPool, FaDog, FaSmokingBan, FaMapMarkerAlt, FaCalendarAlt, FaUser, FaStar, FaHeart, FaShare, FaPhone, FaEnvelope } from 'react-icons/fa';

const ApartmentDetails = () => {
  const [selectedImage, setSelectedImage] = useState(0);
  const [isFavorited, setIsFavorited] = useState(false);
  const [bookingData, setBookingData] = useState({
    checkIn: '',
    checkOut: '',
    guests: 1
  });

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
  const { id } = useParams();
  const [apartment, setApartment] = useState(null);
  
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API_URL}/api/properties/${id}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Failed to load property');
        const p = data.property;
        setApartment({
          id: p._id,
          title: p.title,
          location: `${p.address}, ${p.city}`,
          price: p.pricePerNight,
          rating: 4.8,
          reviews: 0,
          type: 'Apartment',
          size: '—',
          images: p.images && p.images.length ? p.images : [
            'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800&h=600&fit=crop'
          ],
          amenities: [
            { icon: FaWifi, name: 'Free WiFi' },
            { icon: FaCar, name: 'Parking' },
            { icon: FaUtensils, name: 'Kitchen' }
          ],
          description: p.description || 'Beautiful apartment with great amenities.',
          host: {
            name: p.host ? `${p.host.firstName} ${p.host.lastName}` : '—',
            avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face',
            rating: 4.9,
            responseTime: 'Within an hour',
            joinDate: '2020'
          },
          nearby: []
        });
      } catch (e) {
        toast.error(e.message);
      }
    })();
  }, [id]);

  const handleBooking = (e) => {
    e.preventDefault();
    console.log('Booking data:', bookingData);
  };

  const handleInputChange = (field, value) => {
    setBookingData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const renderStars = (rating) => {
    return Array.from({ length: 5 }, (_, i) => (
      <FaStar
        key={i}
        className={`${i < Math.floor(rating) ? 'text-yellow-400' : 'text-gray-300'}`}
      />
    ));
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
                  {apartment.rating} ({apartment.reviews} reviews)
                </span>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setIsFavorited(!isFavorited)}
                className={`p-3 rounded-full transition-colors ${
                  isFavorited ? 'bg-red-500 text-white' : 'bg-white/20 text-white hover:bg-white/30'
                }`}
              >
                <FaHeart className="text-xl" />
              </button>
              <button className="p-3 bg-white/20 text-white rounded-full hover:bg-white/30 transition-colors">
                <FaShare className="text-xl" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Image Gallery */}
            <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
              <div className="relative">
                <img
                  src={apartment.images[selectedImage]}
                  alt={apartment.title}
                  className="w-full h-96 object-cover"
                />
                <div className="absolute bottom-4 left-4 bg-black bg-opacity-50 text-white px-3 py-1 rounded-full text-sm">
                  {selectedImage + 1} / {apartment.images.length}
                </div>
              </div>
              <div className="p-4 grid grid-cols-4 gap-2">
                {apartment.images.map((image, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedImage(index)}
                    className={`h-20 rounded-lg overflow-hidden transition-all duration-300 ${
                      selectedImage === index ? 'ring-2 ring-blue-500' : ''
                    }`}
                  >
                    <img
                      src={image}
                      alt={`View ${index + 1}`}
                      className="w-full h-full object-cover hover:scale-110 transition-transform duration-300"
                    />
                  </button>
                ))}
              </div>
            </div>

            {/* Apartment Info */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-800 mb-2">{apartment.type}</h2>
                  <div className="flex items-center space-x-6 text-gray-600">
                    <div className="flex items-center">
                      <FaBed className="mr-2" />
                      <span>2 Bedrooms</span>
                    </div>
                    <div className="flex items-center">
                      <FaBath className="mr-2" />
                      <span>2 Bathrooms</span>
                    </div>
                    <div className="flex items-center">
                      <span>{apartment.size}</span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="flex items-center mb-1">
                    {renderStars(apartment.rating)}
                    <span className="ml-2 text-gray-600">{apartment.rating}</span>
                  </div>
                  <p className="text-sm text-gray-500">({apartment.reviews} reviews)</p>
                </div>
              </div>

              <div className="border-t pt-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-3">About this apartment</h3>
                <p className="text-gray-700 leading-relaxed">{apartment.description}</p>
              </div>
            </div>

            {/* Amenities */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Amenities</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {apartment.amenities.map((amenity, index) => {
                  const IconComponent = amenity.icon;
                  return (
                    <div key={index} className="flex items-center space-x-3">
                      <IconComponent className="text-blue-600 text-xl" />
                      <span className="text-gray-700">{amenity.name}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Host Info */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Meet your host</h3>
              <div className="flex items-center space-x-4">
                <img
                  src={apartment.host.avatar}
                  alt={apartment.host.name}
                  className="w-16 h-16 rounded-full object-cover"
                />
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-800">{apartment.host.name}</h4>
                  <div className="flex items-center space-x-4 text-sm text-gray-600">
                    <div className="flex items-center">
                      {renderStars(apartment.host.rating)}
                      <span className="ml-1">{apartment.host.rating}</span>
                    </div>
                    <span>Response time: {apartment.host.responseTime}</span>
                    <span>Host since {apartment.host.joinDate}</span>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <button className="p-2 bg-blue-100 text-blue-600 rounded-full hover:bg-blue-200 transition-colors">
                    <FaPhone />
                  </button>
                  <button className="p-2 bg-blue-100 text-blue-600 rounded-full hover:bg-blue-200 transition-colors">
                    <FaEnvelope />
                  </button>
                </div>
              </div>
            </div>

            {/* Nearby Places */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">What's nearby</h3>
              <div className="space-y-3">
                {apartment.nearby.map((place, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium text-gray-800">{place.name}</h4>
                      <p className="text-sm text-gray-600">{place.type}</p>
                    </div>
                    <span className="text-sm text-gray-500">{place.distance}</span>
                  </div>
                ))}
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
                      onChange={(e) => handleInputChange('checkIn', e.target.value)}
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
                      onChange={(e) => handleInputChange('checkOut', e.target.value)}
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
                      onChange={(e) => handleInputChange('guests', e.target.value)}
                    >
                      <option value="1">1 Guest</option>
                      <option value="2">2 Guests</option>
                      <option value="3">3 Guests</option>
                      <option value="4">4 Guests</option>
                    </select>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-xl font-semibold transition-all duration-300 hover:scale-105 shadow-lg hover:shadow-xl"
                >
                  Book This Apartment
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
                  <span className="font-medium">RWF {apartment.price.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between text-sm mt-2">
                  <span className="text-gray-600">Service fee</span>
                  <span className="font-medium">RWF {(apartment.price * 0.1).toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between text-sm mt-2 font-semibold">
                  <span>Total</span>
                  <span>RWF {(apartment.price * 1.1).toLocaleString()}</span>
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
