import React from 'react';
import Hero from '../components/Hero';
import SearchSection from '../components/SearchSection';
import FeaturedApartments from '../components/FeaturedApartments';
import HowItWorks from '../components/HowItWorks';
import Testimonials from '../components/Testimonials';

const Home = () => {
  return (
    <div>
      {/* Hero Section with blue background */}
      <div className="bg-gradient-to-br from-blue-800 via-blue-700 to-blue-900">
        <Hero />
      </div>
      
      {/* Main content with white background */}
      <div className="bg-white">
        <SearchSection />
        <FeaturedApartments />
        <HowItWorks />
        <Testimonials />
      </div>
    </div>
  );
};

export default Home;
