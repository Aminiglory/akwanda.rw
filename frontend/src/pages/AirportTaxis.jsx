import React, { useState } from 'react';
import { FaTaxi, FaMapMarkerAlt, FaCalendarAlt, FaUser, FaClock, FaStar, FaPhone, FaCreditCard, FaShieldAlt } from 'react-icons/fa';

const AirportTaxis = () => {
  const [bookingData, setBookingData] = useState({
    pickup: 'Kigali International Airport',
    destination: '',
    date: '',
    time: '',
    passengers: 1,
    vehicleType: 'standard'
  });

  const handleBooking = (e) => {
    e.preventDefault();
    console.log('Taxi booking:', bookingData);
  };

  const handleInputChange = (field, value) => {
    setBookingData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const vehicleTypes = [
    {
      id: 'standard',
      name: 'Standard Car',
      capacity: '4 passengers',
      price: '25,000',
      features: ['Air Conditioning', 'WiFi', 'Professional Driver'],
      icon: '🚗'
    },
    {
      id: 'premium',
      name: 'Premium Car',
      capacity: '4 passengers',
      price: '35,000',
      features: ['Luxury Vehicle', 'WiFi', 'Professional Driver', 'Bottled Water'],
      icon: '🚙'
    },
    {
      id: 'van',
      name: 'Van/SUV',
      capacity: '8 passengers',
      price: '45,000',
      features: ['Large Vehicle', 'Extra Luggage Space', 'WiFi', 'Professional Driver'],
      icon: '🚐'
    },
    {
      id: 'bus',
      name: 'Mini Bus',
      capacity: '12 passengers',
      price: '60,000',
      features: ['Group Transport', 'Luggage Compartment', 'WiFi', 'Professional Driver'],
      icon: '🚌'
    }
  ];

  const popularDestinations = [
    { name: 'Kigali City Center', distance: '25 km', duration: '45 min', price: '25,000' },
    { name: 'Nyarutarama (Upscale)', distance: '30 km', duration: '50 min', price: '30,000' },
    { name: 'Kimisagara (Budget)', distance: '20 km', duration: '35 min', price: '20,000' },
    { name: 'Kacyiru (Government)', distance: '28 km', duration: '45 min', price: '28,000' },
    { name: 'Remera (Residential)', distance: '22 km', duration: '40 min', price: '22,000' },
    { name: 'Gikondo (Business)', distance: '26 km', duration: '42 min', price: '26,000' }
  ];

  const drivers = [
    {
      id: 1,
      name: 'Jean Baptiste M.',
      rating: 4.9,
      trips: 1247,
      vehicle: 'Toyota Camry',
      languages: ['English', 'French', 'Kinyarwanda'],
      experience: '5+ years',
      image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face'
    },
    {
      id: 2,
      name: 'Grace N.',
      rating: 4.8,
      trips: 892,
      vehicle: 'Honda CR-V',
      languages: ['English', 'Kinyarwanda', 'Swahili'],
      experience: '3+ years',
      image: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=100&h=100&fit=crop&crop=face'
    },
    {
      id: 3,
      name: 'Paul R.',
      rating: 4.9,
      trips: 1563,
      vehicle: 'Toyota Land Cruiser',
      languages: ['English', 'French', 'Kinyarwanda'],
      experience: '7+ years',
      image: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face'
    }
  ];

  const renderStars = (rating) => {
    return Array.from({ length: 5 }, (_, i) => (
      <FaStar
        key={i}
        className={`${i < Math.floor(rating) ? 'text-yellow-400' : 'text-gray-300'}`}
      />
    ));
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-blue-500 to-blue-700 text-white py-16">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold mb-4">Airport to Apartment Transfers</h1>
            <p className="text-xl text-blue-100">Get to your apartment safely from the airport</p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Booking Form */}
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-12">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">Book Your Apartment Transfer</h2>
          <form onSubmit={handleBooking} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Pickup Location */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Pickup Location
                </label>
                <div className="relative">
                  <FaMapMarkerAlt className="absolute left-3 top-1/2 transform -translate-y-1/2 text-blue-600" />
                  <input
                    type="text"
                    value={bookingData.pickup}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300"
                    readOnly
                  />
                </div>
              </div>

              {/* Destination */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Apartment Address
                </label>
                <div className="relative">
                  <FaMapMarkerAlt className="absolute left-3 top-1/2 transform -translate-y-1/2 text-blue-600" />
                  <input
                    type="text"
                    placeholder="Enter your apartment address"
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300"
                    value={bookingData.destination}
                    onChange={(e) => handleInputChange('destination', e.target.value)}
                  />
                </div>
              </div>

              {/* Date */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Date
                </label>
                <div className="relative">
                  <FaCalendarAlt className="absolute left-3 top-1/2 transform -translate-y-1/2 text-blue-600" />
                  <input
                    type="date"
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300"
                    value={bookingData.date}
                    onChange={(e) => handleInputChange('date', e.target.value)}
                  />
                </div>
              </div>

              {/* Time */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Time
                </label>
                <div className="relative">
                  <FaClock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-blue-600" />
                  <input
                    type="time"
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300"
                    value={bookingData.time}
                    onChange={(e) => handleInputChange('time', e.target.value)}
                  />
                </div>
              </div>

              {/* Passengers */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Passengers
                </label>
                <div className="relative">
                  <FaUser className="absolute left-3 top-1/2 transform -translate-y-1/2 text-blue-600" />
                  <select
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 appearance-none bg-white"
                    value={bookingData.passengers}
                    onChange={(e) => handleInputChange('passengers', e.target.value)}
                  >
                    <option value="1">1 Passenger</option>
                    <option value="2">2 Passengers</option>
                    <option value="3">3 Passengers</option>
                    <option value="4">4 Passengers</option>
                    <option value="5+">5+ Passengers</option>
                  </select>
                </div>
              </div>

              {/* Book Button */}
              <div className="flex items-end">
                <button
                  type="submit"
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-semibold transition-all duration-300 hover:scale-105 flex items-center justify-center gap-2"
                >
                  <FaTaxi />
                  Book Transfer
                </button>
              </div>
            </div>
          </form>
        </div>

        {/* Vehicle Types */}
        <div className="mb-12">
          <h2 className="text-3xl font-bold text-gray-800 mb-8 text-center">Choose Your Vehicle</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {vehicleTypes.map((vehicle, index) => (
              <div
                key={vehicle.id}
                className={`bg-white rounded-2xl shadow-lg p-6 cursor-pointer transition-all duration-300 hover:scale-105 ${
                  bookingData.vehicleType === vehicle.id ? 'ring-2 ring-blue-500' : 'hover:shadow-xl'
                }`}
                onClick={() => handleInputChange('vehicleType', vehicle.id)}
              >
                <div className="text-center mb-4">
                  <div className="text-4xl mb-2">{vehicle.icon}</div>
                  <h3 className="text-lg font-bold text-gray-800">{vehicle.name}</h3>
                  <p className="text-sm text-gray-600">{vehicle.capacity}</p>
                </div>
                <div className="text-center mb-4">
                  <span className="text-2xl font-bold text-blue-600">RWF {vehicle.price}</span>
                  <p className="text-sm text-gray-600">per trip</p>
                </div>
                <ul className="space-y-2 mb-4">
                  {vehicle.features.map((feature, idx) => (
                    <li key={idx} className="text-sm text-gray-600 flex items-center">
                      <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mr-2"></div>
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* Popular Destinations */}
        <div className="mb-12">
          <h2 className="text-3xl font-bold text-gray-800 mb-8 text-center">Popular Apartment Areas</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {popularDestinations.map((dest, index) => (
              <div
                key={index}
                className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-all duration-300 hover:scale-105 cursor-pointer"
              >
                <h3 className="text-lg font-bold text-gray-800 mb-2">{dest.name}</h3>
                <div className="flex items-center text-gray-600 mb-2">
                  <FaMapMarkerAlt className="text-blue-500 mr-2" />
                  <span className="text-sm">{dest.distance}</span>
                </div>
                <div className="flex items-center text-gray-600 mb-3">
                  <FaClock className="text-blue-500 mr-2" />
                  <span className="text-sm">{dest.duration}</span>
                </div>
                <div className="text-right">
                  <span className="text-xl font-bold text-blue-600">RWF {dest.price}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Featured Drivers */}
        <div className="mb-12">
          <h2 className="text-3xl font-bold text-gray-800 mb-8 text-center">Our Professional Drivers</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {drivers.map((driver, index) => (
              <div
                key={driver.id}
                className="bg-white rounded-2xl shadow-lg p-6 hover:shadow-xl transition-all duration-300 hover:scale-105"
              >
                <div className="flex items-center mb-4">
                  <img
                    src={driver.image}
                    alt={driver.name}
                    className="w-16 h-16 rounded-full object-cover mr-4"
                  />
                  <div>
                    <h3 className="text-lg font-bold text-gray-800">{driver.name}</h3>
                    <div className="flex items-center">
                      {renderStars(driver.rating)}
                      <span className="text-sm text-gray-600 ml-2">
                        {driver.rating} ({driver.trips} trips)
                      </span>
                    </div>
                  </div>
                </div>
                <div className="space-y-2 mb-4">
                  <p className="text-sm text-gray-600">
                    <strong>Vehicle:</strong> {driver.vehicle}
                  </p>
                  <p className="text-sm text-gray-600">
                    <strong>Experience:</strong> {driver.experience}
                  </p>
                  <p className="text-sm text-gray-600">
                    <strong>Languages:</strong> {driver.languages.join(', ')}
                  </p>
                </div>
                <button className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg font-semibold transition-colors duration-300 flex items-center justify-center gap-2">
                  <FaPhone />
                  Contact Driver
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Features */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-800 rounded-2xl p-8 text-white">
          <h3 className="text-2xl font-bold mb-6 text-center">Why Choose AKWANDA Transfers?</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <FaShieldAlt className="text-4xl mx-auto mb-4" />
              <h4 className="text-lg font-semibold mb-2">Safe & Secure</h4>
              <p className="text-blue-100">Get to your apartment safely with licensed drivers and inspected vehicles</p>
            </div>
            <div className="text-center">
              <FaCreditCard className="text-4xl mx-auto mb-4" />
              <h4 className="text-lg font-semibold mb-2">Easy Payment</h4>
              <p className="text-blue-100">Pay by card, mobile money, or cash. Fixed pricing to your apartment</p>
            </div>
            <div className="text-center">
              <FaStar className="text-4xl mx-auto mb-4" />
              <h4 className="text-lg font-semibold mb-2">Apartment Knowledge</h4>
              <p className="text-blue-100">Drivers know the best routes to apartments across Rwanda</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AirportTaxis;
