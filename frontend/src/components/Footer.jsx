import React, { useMemo } from 'react';
import { FaFacebook, FaTwitter, FaInstagram, FaLinkedin, FaPhone, FaEnvelope, FaMapMarkerAlt, FaBed, FaBuffer } from 'react-icons/fa';

const Footer = () => {
  const site = useMemo(() => {
    try {
      const raw = localStorage.getItem('siteSettings');
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }, []);

  const companyEmail = site?.companyEmail || 'info@akwanda.rw';
  const phone = site?.phone || '0781714167';
  const socials = {
    facebook: site?.facebook || '',
    twitter: site?.twitter || '',
    instagram: site?.instagram || '',
    linkedin: site?.linkedin || ''
  };
  const footerSections = [
    {
      title: "For Guests",
      links: [
        { name: "Search Apartments", href: "/apartments" },
        { name: "How to Book", href: "#how-to-book" },
        { name: "Guest Reviews", href: "#reviews" }
      ]
    },
    {
      title: "For Hosts",
      links: [
        { name: "List Your Property", href: "/upload-property" },
        { name: "Host Guidelines", href: "#guidelines" },
        { name: "Host Support", href: "/support" }
      ]
    },
    {
      title: "Company",
      links: [
        { name: "About Us", href: "#about" },
        { name: "Contact Us", href: "#contact" }
      ]
    },
    {
      title: "Support",
      links: [
        { name: "Help Center", href: "/support" },
        { name: "Safety Center", href: "#safety" },
        { name: "Terms of Service", href: "#terms" }
      ]
    }
  ];

  const quickLinks = [
    { icon: FaBed, name: "Apartments", href: "/apartments" },
    { icon: FaBuffer, name: "List Property", href: "/upload-property" }
  ];

  return (
    <footer className="bg-gray-900 text-white">
      {/* Main Footer Content */}
      <div className="max-w-6xl mx-auto px-4 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8">
          {/* Brand Section */}
          <div className="lg:col-span-1">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-white mb-4">AKWANDA.rw</h2>
              <p className="text-white-300 leading-relaxed">
                Rwanda's leading apartment rental platform. Connect guests with amazing hosts across the country.
              </p>
            </div>

            {/* Contact Info */}
            <div className="space-y-3 mb-6">
              <div className="flex items-center">
                <FaMapMarkerAlt className="text-blue-400 mr-3" />
                <span className="text-gray-300">Kigali, Rwanda</span>
              </div>
              <div className="flex items-center">
                <FaPhone className="text-blue-400 mr-3" />
                <a href={`tel:${phone}`} className="text-gray-300 hover:text-white">{phone}</a>
              </div>
              <div className="flex items-center">
                <FaEnvelope className="text-blue-400 mr-3" />
                <a href={`mailto:${companyEmail}`} className="text-gray-300 hover:text-white">{companyEmail}</a>
              </div>
            </div>

            {/* Social Media */}
            <div className="flex flex-wrap gap-3">
              {socials.facebook && (
                <a href={socials.facebook} target="_blank" rel="noreferrer" className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center hover:bg-blue-700 transition-colors duration-300">
                  <FaFacebook />
                </a>
              )}
              {socials.twitter && (
                <a href={socials.twitter} target="_blank" rel="noreferrer" className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center hover:bg-blue-700 transition-colors duration-300">
                  <FaTwitter />
                </a>
              )}
              {socials.instagram && (
                <a href={socials.instagram} target="_blank" rel="noreferrer" className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center hover:bg-blue-700 transition-colors duration-300">
                  <FaInstagram />
                </a>
              )}
              {socials.linkedin && (
                <a href={socials.linkedin} target="_blank" rel="noreferrer" className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center hover:bg-blue-700 transition-colors duration-300">
                  <FaLinkedin />
                </a>
              )}
            </div>
          </div>

          {/* Footer Links */}
          {footerSections.map((section, index) => (
            <div key={index}>
              <h3 className="text-lg font-semibold mb-4">{section.title}</h3>
              <ul className="space-y-2">
                {section.links.map((link, linkIndex) => (
                  <li key={linkIndex}>
                    <a
                      href={link.href}
                      className="text-gray-300 hover:text-white transition-colors duration-300"
                    >
                      {link.name}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Quick Links */}
        <div className="border-t border-gray-800 mt-12 pt-8">
          <h3 className="text-lg font-semibold mb-6 text-center">Quick Links</h3>
          <div className="flex flex-wrap justify-center gap-4">
            {quickLinks.map((link, index) => {
              const IconComponent = link.icon;
              return (
                <a
                  key={index}
                  href={link.href}
                  className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 px-4 py-2 rounded-lg transition-all duration-300 hover:scale-105"
                >
                  <IconComponent className="text-blue-400" />
                  <span>{link.name}</span>
                </a>
              );
            })}
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-gray-800">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="text-gray-300 text-sm mb-4 md:mb-0">
              © 2024 AKWANDA.rw. All rights reserved.
            </div>
            <div className="flex flex-wrap gap-6 text-sm">
              <a href="#privacy" className="text-gray-300 hover:text-white transition-colors duration-300">
                Privacy Policy
              </a>
              <a href="#terms" className="text-gray-300 hover:text-white transition-colors duration-300">
                Terms of Service
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Back to Top Button */}
      <button
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        className="fixed bottom-6 right-6 w-12 h-12 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-110 flex items-center justify-center"
      >
        ↑
      </button>
    </footer>
  );
};

export default Footer;
