import React from 'react';
import { Link } from 'react-router-dom';
import { FaStar, FaQuoteLeft } from 'react-icons/fa';

const Testimonials = () => {
  const testimonials = [
    {
      id: 1,
      name: "Sarah M.",
      role: "Guest from Kigali",
      rating: 5,
      text: "AKWANDA.rw made finding a perfect apartment so easy! The booking process was smooth and the apartment exceeded my expectations.",
      avatar: "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=100&h=100&fit=crop&crop=face",
      location: "Kigali"
    },
    {
      id: 2,
      name: "Jean Paul R.",
      role: "Host",
      rating: 5,
      text: "I've been hosting on AKWANDA.rw for 6 months now. The platform is user-friendly and I've earned great income from my spare apartment.",
      avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face",
      location: "Musanze"
    },
    {
      id: 3,
      name: "Grace K.",
      role: "Guest from USA",
      rating: 5,
      text: "Visiting Rwanda was amazing! Thanks to AKWANDA.rw, I found a beautiful apartment in Gisenyi with lake views. Highly recommended!",
      avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop&crop=face",
      location: "Gisenyi"
    },
    {
      id: 4,
      name: "David M.",
      role: "Host",
      rating: 5,
      text: "The support team is excellent and the payment system is reliable. I've had nothing but positive experiences with AKWANDA.rw.",
      avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face",
      location: "Huye"
    },
    {
      id: 5,
      name: "Marie C.",
      role: "Guest from Belgium",
      rating: 5,
      text: "Perfect for business trips! The apartments are clean, well-equipped, and the hosts are very professional. Will definitely use again.",
      avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&h=100&fit=crop&crop=face",
      location: "Kigali"
    },
    {
      id: 6,
      name: "Paul N.",
      role: "Host",
      rating: 5,
      text: "Listing my apartment was simple and the income has been steady. The platform handles everything professionally.",
      avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop&crop=face",
      location: "Butare"
    }
  ];

  const renderStars = (rating) => {
    return Array.from({ length: 5 }, (_, i) => (
      <FaStar
        key={i}
        className={`${i < rating ? 'text-yellow-400' : 'text-gray-300'}`}
      />
    ));
  };

  return (
    <div className="bg-gray-50 py-16 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-800 mb-4">
            What Our Users Say
          </h2>
          <p className="text-gray-600 text-lg">
            Real experiences from our community
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {testimonials.map((testimonial, index) => (
            <div
              key={testimonial.id}
              className="bg-white rounded-2xl shadow-lg p-6 hover:shadow-xl transition-all duration-300 hover:scale-105 relative"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              {/* Quote Icon */}
              <div className="absolute top-4 right-4 text-blue-200">
                <FaQuoteLeft className="text-2xl" />
              </div>

              {/* Rating */}
              <div className="flex items-center mb-4">
                {renderStars(testimonial.rating)}
              </div>

              {/* Testimonial Text */}
              <p className="text-gray-700 mb-6 leading-relaxed">
                "{testimonial.text}"
              </p>

              {/* User Info */}
              <div className="flex items-center">
                <img
                  src={testimonial.avatar}
                  alt={testimonial.name}
                  className="w-12 h-12 rounded-full object-cover mr-4"
                />
                <div>
                  <h4 className="font-semibold text-gray-800">
                    {testimonial.name}
                  </h4>
                  <p className="text-sm text-gray-600">
                    {testimonial.role}
                  </p>
                  <p className="text-sm text-blue-600">
                    📍 {testimonial.location}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Call to Action */}
        <div className="text-center mt-12">
          <div className="bg-blue-600 rounded-2xl p-8 text-white">
            <h3 className="text-2xl font-bold mb-4">
              Ready to Join Our Community?
            </h3>
            <p className="text-blue-100 mb-6">
              Whether you're looking for a place to stay or want to earn from your space, 
              AKWANDA.rw is here for you.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/apartments" className="bg-white text-blue-600 px-8 py-3 rounded-xl font-semibold hover:bg-gray-100 transition-all duration-300 hover:scale-105 text-center">
                Find an Apartment
              </Link>
              <Link to="/register" className="border-2 border-white text-white px-8 py-3 rounded-xl font-semibold hover:bg-white hover:text-blue-600 transition-all duration-300 hover:scale-105 text-center">
                Sign Up to Host
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Testimonials;
