import React from 'react';
import Hero from '../components/Hero';
import SearchSection from '../components/SearchSection';
import FeaturedApartments from '../components/FeaturedApartments';
import LandingAttractions from '../components/LandingAttractions';
import OurMission from '../components/OurMission';
import HowItWorks from '../components/HowItWorks';
import Testimonials from '../components/Testimonials';

const Home = () => {
  return (
    <div>
      {/* Hero Section with chocolate theme background */}
      <div className="bg-gradient-to-br from-[#6b3f1f] via-[#a06b42] to-[#c59b77]">
        <Hero />
      </div>

      {/* Main content */}
      <div className="bg-white">
        <SearchSection />
        <FeaturedApartments />
        <LandingAttractions />
        <HowItWorks />
        <OurMission />

        {/* Featured Destinations (static content) */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <h2 className="text-2xl md:text-3xl font-bold text-[#4b2a00] mb-6">Featured destinations</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
            {[{
              name: 'Kigali', img: 'https://images.unsplash.com/photo-1542038382126-77ae2819338e?q=80&w=1200&auto=format&fit=crop'
            },{
              name: 'Musanze', img: 'https://images.unsplash.com/photo-1521292270410-a8c4d716d518?q=80&w=1200&auto=format&fit=crop'
            },{
              name: 'Gisenyi', img: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?q=80&w=1200&auto=format&fit=crop'
            },{
              name: 'Huye', img: 'https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?q=80&w=1200&auto=format&fit=crop'
            }].map((d, i) => (
              <div key={i} className="group rounded-xl overflow-hidden border theme-chocolate-border bg-white">
                <div className="aspect-video overflow-hidden">
                  <img src={d.img} alt={d.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                </div>
                <div className="p-3 flex items-center justify-between">
                  <div className="font-semibold text-[#4b2a00]">{d.name}</div>
                  <a href="/apartments" className="text-sm theme-chocolate-text hover:underline">Explore</a>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Partners strip (static logos) */}
        <section className="bg-[#fff7ee] border-y theme-chocolate-border">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <h3 className="text-lg md:text-xl font-semibold text-[#4b2a00] mb-4">Trusted by partners</h3>
            <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-6 gap-4 items-center">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-10 sm:h-12 bg-white rounded-lg border theme-chocolate-border flex items-center justify-center">
                  <span className="text-[#8b6f47] text-sm sm:text-base">Partner {i + 1}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Testimonials (existing) */}
        <Testimonials />

        {/* CTA band */}
        <section className="bg-[#a06b42] text-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h3 className="text-2xl font-bold">List your property with AKWANDA.rw</h3>
              <p className="opacity-90">Reach guests faster with our owner tools and promotions.</p>
            </div>
            <a href="/upload" className="inline-flex items-center px-5 py-3 rounded-lg bg-white text-[#4b2a00] font-semibold hover:bg-[#fff3ea] transition-colors w-full sm:w-auto text-center">
              Get started
            </a>
          </div>
        </section>
      </div>
    </div>
  );
};

export default Home;
