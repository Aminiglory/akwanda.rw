import React, { useState } from 'react';
import { FaMapMarkerAlt, FaClock, FaUsers, FaStar, FaHeart, FaCalendarAlt } from 'react-icons/fa';

const Experiences = () => {
  const [selectedCategory, setSelectedCategory] = useState('all');

  const categories = [
    { id: 'all', name: 'All Experiences', icon: '🌟' },
    { id: 'cultural', name: 'Cultural', icon: '🎭' },
    { id: 'adventure', name: 'Adventure', icon: '🏔️' },
    { id: 'food', name: 'Food & Drink', icon: '🍽️' },
    { id: 'nature', name: 'Nature', icon: '🌿' },
    { id: 'history', name: 'Historical', icon: '🏛️' }
  ];

  const experiences = [
    {
      id: 1,
      title: "Gorilla Trekking Adventure",
      location: "Volcanoes National Park",
      category: "adventure",
      duration: "Full Day",
      groupSize: "8 people",
      price: 1500000,
      rating: 4.9,
      reviews: 234,
      image: "https://images.unsplash.com/photo-1544735716-392fe2489ffa?w=500&h=400&fit=crop",
      description: "Experience the magic of encountering mountain gorillas in their natural habitat.",
      highlights: ["Professional Guide", "Park Fees Included", "Lunch Provided", "Transportation"]
    },
    {
      id: 2,
      title: "Traditional Rwandan Cooking Class",
      location: "Kigali Cultural Center",
      category: "food",
      duration: "3 hours",
      groupSize: "12 people",
      price: 45000,
      rating: 4.7,
      reviews: 156,
      image: "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=500&h=400&fit=crop",
      description: "Learn to cook authentic Rwandan dishes with local ingredients and techniques.",
      highlights: ["Local Chef", "Ingredients Included", "Recipe Book", "Tasting Session"]
    },
    {
      id: 3,
      title: "Kigali City Walking Tour",
      location: "Kigali City Center",
      category: "cultural",
      duration: "4 hours",
      groupSize: "15 people",
      price: 35000,
      rating: 4.6,
      reviews: 189,
      image: "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=500&h=400&fit=crop",
      description: "Explore the vibrant capital city with a knowledgeable local guide.",
      highlights: ["Local Guide", "Historical Sites", "Local Markets", "Transportation"]
    },
    {
      id: 4,
      title: "Lake Kivu Boat Safari",
      location: "Lake Kivu, Rubavu",
      category: "nature",
      duration: "6 hours",
      groupSize: "10 people",
      price: 120000,
      rating: 4.8,
      reviews: 98,
      image: "https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=500&h=400&fit=crop",
      description: "Cruise the beautiful Lake Kivu and discover its hidden islands and wildlife.",
      highlights: ["Boat Ride", "Island Visits", "Lunch Included", "Wildlife Spotting"]
    },
    {
      id: 5,
      title: "Genocide Memorial Tour",
      location: "Kigali Genocide Memorial",
      category: "history",
      duration: "2 hours",
      groupSize: "20 people",
      price: 25000,
      rating: 4.9,
      reviews: 312,
      image: "https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=500&h=400&fit=crop",
      description: "A respectful and educational tour of Rwanda's history and path to reconciliation.",
      highlights: ["Expert Guide", "Educational", "Respectful", "Audio Guide"]
    },
    {
      id: 6,
      title: "Coffee Plantation Experience",
      location: "Huye, Southern Province",
      category: "cultural",
      duration: "5 hours",
      groupSize: "8 people",
      price: 75000,
      rating: 4.7,
      reviews: 145,
      image: "https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=500&h=400&fit=crop",
      description: "From bean to cup - experience the complete coffee production process.",
      highlights: ["Farm Tour", "Coffee Tasting", "Lunch Included", "Coffee Bag"]
    }
  ];

  const filteredExperiences = selectedCategory === 'all' 
    ? experiences 
    : experiences.filter(exp => exp.category === selectedCategory);

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
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Unique Experiences</h1>
          <p className="text-gray-600 text-lg max-w-2xl mx-auto">
            Discover authentic Rwandan culture, nature, and adventure through unforgettable experiences
          </p>
        </div>

        {/* Category Filters */}
        <div className="flex flex-wrap justify-center gap-4 mb-12">
          {categories.map(category => (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category.id)}
              className={`flex items-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all duration-300 ${
                selectedCategory === category.id
                  ? 'bg-blue-600 text-white shadow-lg transform scale-105'
                  : 'bg-white text-gray-700 hover:bg-gray-100 hover:scale-105 shadow-md'
              }`}
            >
              <span className="text-lg">{category.icon}</span>
              {category.name}
            </button>
          ))}
        </div>

        {/* Experiences Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredExperiences.map((experience, index) => (
            <div
              key={experience.id}
              className="modern-card-elevated overflow-hidden hover:scale-105 transition-all duration-500"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              {/* Image */}
              <div className="relative h-48 overflow-hidden">
                <img
                  src={experience.image}
                  alt={experience.title}
                  className="w-full h-full object-cover transition-transform duration-500 hover:scale-110"
                />
                <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm rounded-full px-3 py-1 text-sm font-semibold text-gray-800">
                  RWF {experience.price.toLocaleString()}
                </div>
                <div className="absolute top-4 right-4 bg-blue-600 text-white px-3 py-1 rounded-full text-sm font-semibold">
                  {categories.find(cat => cat.id === experience.category)?.icon}
                </div>
                <button className="absolute bottom-4 right-4 bg-white/90 backdrop-blur-sm rounded-full p-2 hover:bg-white transition-all duration-300">
                  <FaHeart className="text-gray-600 hover:text-red-500" />
                </button>
              </div>

              {/* Content */}
              <div className="p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-2 line-clamp-2">
                  {experience.title}
                </h3>
                
                <div className="flex items-center text-gray-600 mb-3">
                  <FaMapMarkerAlt className="text-blue-600 mr-2" />
                  <span className="text-sm">{experience.location}</span>
                </div>

                <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                  {experience.description}
                </p>

                {/* Rating */}
                <div className="flex items-center mb-4">
                  <div className="flex items-center mr-2">
                    {renderStars(experience.rating)}
                  </div>
                  <span className="text-sm text-gray-600">
                    {experience.rating} ({experience.reviews} reviews)
                  </span>
                </div>

                {/* Details */}
                <div className="grid grid-cols-2 gap-3 mb-4 text-sm text-gray-600">
                  <div className="flex items-center">
                    <FaClock className="mr-2 text-blue-600" />
                    {experience.duration}
                  </div>
                  <div className="flex items-center">
                    <FaUsers className="mr-2 text-blue-600" />
                    {experience.groupSize}
                  </div>
                </div>

                {/* Highlights */}
                <div className="flex flex-wrap gap-2 mb-6">
                  {experience.highlights.slice(0, 2).map((highlight, idx) => (
                    <span
                      key={idx}
                      className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full"
                    >
                      {highlight}
                    </span>
                  ))}
                  {experience.highlights.length > 2 && (
                    <span className="bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded-full">
                      +{experience.highlights.length - 2} more
                    </span>
                  )}
                </div>

                {/* Book Button */}
                <button className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-semibold transition-all duration-300 hover:scale-105 shadow-lg flex items-center justify-center gap-2">
                  <FaCalendarAlt />
                  Book Experience
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* CTA Section */}
        <div className="mt-16">
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-2xl p-8 text-center text-white shadow-xl">
            <h3 className="text-2xl font-bold mb-4">Create Your Own Adventure</h3>
            <p className="text-blue-100 mb-6 text-lg">
              Can't find the perfect experience? Contact us to create a custom tour just for you
            </p>
            <button className="bg-white text-blue-700 px-8 py-3 rounded-xl font-semibold hover:bg-blue-50 transition-all duration-300 hover:scale-105 shadow-lg">
              Contact Us
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Experiences;


