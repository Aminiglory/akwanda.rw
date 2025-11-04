import React from 'react';
import { Link } from 'react-router-dom';
import { FaHome, FaStar, FaArrowRight } from 'react-icons/fa';
import AkwandaCard from '../components/AkwandaCard';

const Homes = () => {
  // Mock data for homes
  const homes = [
    {
      id: 1,
      title: "Modern Family Home in Kigali",
      location: "Kacyiru, Kigali",
      price: 120000,
      bedrooms: 4,
      bathrooms: 3,
      rating: 4.8,
      reviews: 45,
      image: "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=500&h=400&fit=crop",
      features: ["Garden", "Parking", "WiFi", "Kitchen"]
    },
    {
      id: 2,
      title: "Cozy Cottage in Musanze",
      location: "Musanze, Northern Province",
      price: 85000,
      bedrooms: 3,
      bathrooms: 2,
      rating: 4.6,
      reviews: 32,
      image: "https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=500&h=400&fit=crop",
      features: ["Mountain View", "Fireplace", "Garden", "WiFi"]
    },
    {
      id: 3,
      title: "Luxury Villa in Rubavu",
      location: "Rubavu, Western Province",
      price: 200000,
      bedrooms: 5,
      bathrooms: 4,
      rating: 4.9,
      reviews: 67,
      image: "https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=500&h=400&fit=crop",
      features: ["Lake View", "Pool", "Garden", "Parking"]
    },
    {
      id: 4,
      title: "Traditional Rwandan Home",
      location: "Huye, Southern Province",
      price: 75000,
      bedrooms: 3,
      bathrooms: 2,
      rating: 4.5,
      reviews: 28,
      image: "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=500&h=400&fit=crop",
      features: ["Cultural Experience", "Garden", "WiFi", "Kitchen"]
    },
    {
      id: 5,
      title: "Contemporary House in Nyagatare",
      location: "Nyagatare, Eastern Province",
      price: 95000,
      bedrooms: 4,
      bathrooms: 3,
      rating: 4.7,
      reviews: 41,
      image: "https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=500&h=400&fit=crop",
      features: ["Modern Design", "Parking", "WiFi", "Kitchen"]
    },
    {
      id: 6,
      title: "Eco-Friendly Home in Karongi",
      location: "Karongi, Western Province",
      price: 110000,
      bedrooms: 3,
      bathrooms: 2,
      rating: 4.8,
      reviews: 39,
      image: "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=500&h=400&fit=crop",
      features: ["Solar Power", "Garden", "Lake View", "WiFi"]
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
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Private Homes</h1>
          <p className="text-gray-600 text-lg max-w-2xl mx-auto">
            Experience authentic Rwandan living in beautiful private homes across the country
          </p>
        </div>

        {/* Homes Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {homes.map((home, index) => (
            <div key={home.id} style={{ animationDelay: `${index * 100}ms` }}>
              <AkwandaCard
                id={home.id}
                title={home.title}
                location={home.location}
                images={[home.image]}
                pricePerNight={Number(home.price || 0)}
                category={'Home'}
                rating={Number(home.rating || 0)}
                reviews={home.reviews}
                amenities={home.features}
                host={null}
                isAvailable={true}
                href={`/apartment/${home.id}`}
              />
              <div className="mt-2 flex justify-center">
                <Link to={`/apartment/${home.id}`} className="inline-flex items-center gap-2 btn-primary text-white px-4 py-2 rounded-xl">
                  View Details
                  <FaArrowRight className="text-sm" />
                </Link>
              </div>
            </div>
          ))}
        </div>

        {/* CTA Section */}
        <div className="mt-16">
          <div className="bg-primary rounded-2xl p-8 text-center text-white shadow-xl">
            <h3 className="text-2xl font-bold mb-4">Can't find what you're looking for?</h3>
            <p className="text-white/90 mb-6 text-lg">
              Browse all our accommodations including apartments, hotels, and more
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/apartments"
                className="bg-white text-primary-700 px-8 py-3 rounded-xl font-semibold hover:bg-gray-50 transition-all duration-300 hover:scale-105 shadow-lg"
              >
                View All Apartments
              </Link>
              <Link
                to="/attractions"
                className="btn-primary text-white px-8 py-3 rounded-xl font-semibold transition-all duration-300 hover:scale-105 shadow-lg"
              >
                Explore Attractions
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Homes;


