import React, { useState } from 'react';
import { FaUpload, FaHome, FaDollarSign, FaUsers, FaCamera, FaMapMarkerAlt } from 'react-icons/fa';

const UploadSection = () => {
  const [isUploading, setIsUploading] = useState(false);

  const handleUpload = () => {
    setIsUploading(true);
    // Simulate upload process
    setTimeout(() => {
      setIsUploading(false);
      alert('Apartment listing uploaded successfully!');
    }, 2000);
  };

  const benefits = [
    {
      icon: FaDollarSign,
      title: "Earn Money",
      description: "Turn your empty space into extra income"
    },
    {
      icon: FaUsers,
      title: "Meet People",
      description: "Connect with travelers from around the world"
    },
    {
      icon: FaHome,
      title: "Flexible Schedule",
      description: "You control when your space is available"
    }
  ];

  return (
    <div className="warm-cream py-16 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Left Side - Upload Form */}
          <div className="modern-card p-8">
            <div className="text-center mb-8">
              <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 chocolate-bg chocolate-shadow">
                <FaHome className="text-white text-2xl" />
              </div>
              <h2 className="text-3xl font-bold text-gray-800 mb-2">
                List Your Property
              </h2>
              <p className="medium-contrast-text">
                Start earning money by renting out your space
              </p>
            </div>

            <div className="space-y-6">
              {/* Property Type */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Property Type
                </label>
                <select className="modern-input w-full">
                  <option>Select Property Type</option>
                  <option>Studio Apartment</option>
                  <option>1 Bedroom</option>
                  <option>2 Bedrooms</option>
                  <option>3+ Bedrooms</option>
                  <option>Entire House</option>
                </select>
              </div>

              {/* Location */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Location
                </label>
                <div className="relative">
                  <FaMapMarkerAlt className="absolute left-3 top-1/2 transform -translate-y-1/2 chocolate-text" />
                  <input
                    type="text"
                    placeholder="Enter your address"
                    className="modern-input w-full pl-10"
                  />
                </div>
              </div>

              {/* Price */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Monthly Rent (RWF)
                </label>
                <div className="relative">
                  <FaDollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 chocolate-text" />
                  <input
                    type="number"
                    placeholder="Enter monthly rent"
                    className="modern-input w-full pl-10"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  rows="4"
                  placeholder="Describe your apartment, amenities, and what makes it special..."
                  className="modern-input w-full resize-none"
                />
              </div>

              {/* Photo Upload */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Photos
                </label>
                <div className="border-2 border-dashed chocolate-border rounded-xl p-8 text-center hover:bg-gray-50 transition-colors duration-300 cursor-pointer">
                  <FaCamera className="text-4xl text-gray-400 mx-auto mb-4" />
                  <p className="medium-contrast-text mb-2">Upload photos of your apartment</p>
                  <p className="text-sm light-contrast-text">Drag & drop or click to browse</p>
                </div>
              </div>

              {/* Upload Button */}
              <button
                onClick={handleUpload}
                disabled={isUploading}
                className="w-full modern-btn disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isUploading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    Uploading...
                  </>
                ) : (
                  <>
                    <FaUpload />
                    List My Apartment
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Right Side - Benefits */}
          <div className="space-y-8">
            <div>
              <h3 className="text-3xl font-bold text-gray-800 mb-4">
                Why List with AKWANDA.rw?
              </h3>
              <p className="medium-contrast-text text-lg mb-8">
                Join thousands of hosts who are earning extra income by sharing their space
              </p>
            </div>

            <div className="space-y-6">
              {benefits.map((benefit, index) => {
                const IconComponent = benefit.icon;
                return (
                  <div
                    key={index}
                    className="flex items-start gap-4 modern-card p-6 hover:shadow-xl transition-all duration-300 hover:scale-105"
                    style={{ animationDelay: `${index * 0.1}s` }}
                  >
                    <div className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 chocolate-bg">
                      <IconComponent className="text-white text-xl" />
                    </div>
                    <div>
                      <h4 className="text-xl font-semibold text-gray-800 mb-2">
                        {benefit.title}
                      </h4>
                      <p className="medium-contrast-text">
                        {benefit.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="chocolate-bg rounded-2xl p-6 text-white">
              <h4 className="text-xl font-bold mb-2">Start Earning Today!</h4>
              <p className="mb-4">
                The average host earns RWF 150,000+ per month by listing their apartment.
              </p>
              <button className="bg-white text-gray-900 px-6 py-2 rounded-lg font-semibold hover:bg-gray-100 transition-colors duration-300">
                Learn More
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UploadSection;
