import React, { useState, useEffect } from "react";
import img from "../assets/images/home.jpg"

const Hero = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  return (
    <div className="w-full min-h-[600px] bg-gradient-to-br from-blue-800 via-blue-700 to-blue-900 flex flex-col lg:flex-row justify-between items-center relative overflow-hidden px-4 lg:px-0">
      {/* Animated background elements */}
      <div className="absolute inset-0">
        <div className="absolute top-10 left-10 w-20 h-20 bg-blue-600/20 rounded-full animate-float"></div>
        <div className="absolute top-32 right-20 w-16 h-16 bg-blue-500/30 rounded-full animate-float-delayed"></div>
        <div className="absolute bottom-20 left-32 w-12 h-12 bg-blue-400/25 rounded-full animate-float-slow"></div>
      </div>
      
      <div className="flex flex-col mx-4 lg:mx-[50px] w-full lg:w-1/2 relative z-10 mb-8 lg:mb-0">
        <div className={`transition-all duration-1000 ${isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-10'}`}>
          <h2 className="font-bold text-white text-2xl md:text-3xl lg:text-4xl leading-tight mb-6">
            <span className="block animate-fade-in-up">Welcome to</span>
            <span className="block text-blue-200 animate-fade-in-up-delayed">AKWANDA.rw</span>
            <span className="block text-lg font-normal text-blue-100 mt-4 animate-fade-in-up-slow">
              An online Booking and Apartment reservation Platform
            </span>
          </h2>
          
          <div className="flex gap-4 mt-8">
            <a href="#how-it-works" className="bg-white text-blue-800 px-8 py-3 rounded-full font-semibold hover:bg-blue-100 hover:scale-105 transition-all duration-300 shadow-lg hover:shadow-xl animate-fade-in-up-slower">
              How It Works
            </a>
            <a href="#features" className="border-2 border-white text-white px-8 py-3 rounded-full font-semibold hover:bg-white hover:text-blue-800 hover:scale-105 transition-all duration-300 animate-fade-in-up-slower">
              Learn More
            </a>
          </div>
        </div>
      </div>
      
      <div className="w-full lg:w-1/2 relative px-4">
        <div className={`transition-all duration-1000 delay-300 ${isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-10'}`}>
          <div className="relative group overflow-hidden rounded-l-3xl">
            <img 
              src={img} 
              alt="home" 
              className="w-full h-[500px] object-cover group-hover:scale-105 transition-transform duration-500"
            />
            <div className="absolute inset-0 bg-gradient-to-l from-blue-800/50 to-transparent group-hover:from-blue-800/30 transition-all duration-500"></div>
            <div className="absolute bottom-4 right-4 bg-white/90 backdrop-blur-sm rounded-full p-3 animate-bounce-gentle">
              <div className="w-4 h-4 bg-blue-600 rounded-full"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Hero;
