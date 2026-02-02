import React, { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { FaFacebook, FaTwitter, FaInstagram, FaLinkedin, FaPhone, FaEnvelope, FaMapMarkerAlt, FaBed, FaBuffer, FaCar, FaMountain, FaPlane, FaVoicemail } from 'react-icons/fa';
import { useLocale } from '../contexts/LocaleContext';
import { useAuth } from '../contexts/AuthContext';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const Footer = () => {
  const location = useLocation();
  const [site, setSite] = useState(() => {
    try {
      const raw = localStorage.getItem('siteSettings');
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });
  const { t } = useLocale() || {};
  const { user } = useAuth() || {};
  const [hasFlights, setHasFlights] = useState(null);

  useEffect(() => {
    console.log('[Footer] mount');
    const handler = (e) => {
      console.log('[Footer] siteSettingsUpdated event', { hasDetail: !!e.detail });
      setSite(e.detail || null);
    };
    window.addEventListener('siteSettingsUpdated', handler);
    return () => window.removeEventListener('siteSettingsUpdated', handler);
  }, []);

  // Check if user has flights
  useEffect(() => {
    if (!user || user.userType !== 'host') {
      setHasFlights(false);
      return;
    }
    (async () => {
      try {
        const res = await fetch(`${API_URL}/api/flights/owner/has-flights`, { credentials: 'include' });
        if (res.ok) {
          const data = await res.json();
          setHasFlights(data.hasFlights || false);
        } else {
          setHasFlights(false);
        }
      } catch {
        setHasFlights(false);
      }
    })();
  }, [user?.id, user?.userType]);

  const companyEmail = site?.companyEmail || 'info@akwanda.rw';
  const phone = site?.phone || '0781714167';
  const adminEmail = site?.adminEmail || companyEmail;
  const adminPhone = site?.adminPhone || phone;
  const telHref = useMemo(() => {
    const raw = String(adminPhone || '').trim();
    const normalized = raw.replace(/[\s()-]/g, '');
    return `tel:${normalized}`;
  }, [adminPhone]);
  const mailHref = useMemo(() => {
    const raw = String(adminEmail || '').trim().toLowerCase();
    return `mailto:${raw}`;
  }, [adminEmail]);
  const year = useMemo(() => new Date().getFullYear(), []);
  const tr = (key, fallback) => {
    if (!t) return fallback;
    const v = t(key);
    const last = String(key || '').split('.').pop();
    if (!v) return fallback;
    if (String(v) === String(key)) return fallback;
    if (String(v) === String(last)) return fallback;
    return v;
  };
  const socials = {
    facebook: site?.facebook || '',
    twitter: site?.twitter || '',
    instagram: site?.instagram || '',
    linkedin: site?.linkedin || ''
  };
  const footerSections = [
    {
      title: tr('footer.support', 'Support'),
      links: [
        { name: tr('footer.contactUs', 'Contact Us'), href: "/support#contact" },
        { name: tr('footer.submitTicket', 'Submit Ticket'), href: "/support#ticket" },
        { name: tr('footer.trackTicket', 'Track Ticket'), href: "/support#track" },
        { name: tr('footer.faqs', 'FAQs'), href: "/support#faq" }
      ]
    }
  ];

  // Treat owner dashboards as any of the host management routes
  const isInAnyOwnerDashboard = () => {
    const path = location.pathname || '';
    return (
      path.startsWith('/dashboard') ||
      path.startsWith('/group-home') ||
      path.startsWith('/user-dashboard') ||
      path.startsWith('/owner/') ||
      path.startsWith('/vehicles-group-home')
    );
  };

  const quickLinks = [
    { icon: FaBuffer, name: t ? t('footer.listProperty') : "List Property", href: "/upload-property" },
    ...(user?.userType === 'host' && isInAnyOwnerDashboard()
      ? [
          { icon: FaBed, name: t ? t('footer.manageStays') : 'Manage Stays', href: '/dashboard' },
          { icon: FaCar, name: 'Vehicles', href: '/vehicles-group-home' },
          { icon: FaMountain, name: 'Attractions', href: '/owner/attractions' },
          { 
            icon: FaPlane, 
            name: 'Flights', 
            href: '/owner/flights'
          }
        ]
      : [])
  ];

  return (
    <footer className="bg-gray-900 text-white">
      {/* Main Footer Content */}
      <div className="max-w-6xl mx-auto px-4 py-12 md:py-16">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-8">
          {/* Brand Section */}
          <div className="min-w-0 lg:max-w-xl">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-white mb-4 break-words">{t ? t('brand') : 'AkwandaTravels.com'}</h2>
              <p className="text-white-300 leading-relaxed">
                Rwanda's home grown booking platform that connects guest with amazing hosts across the country.
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
                <a href={telHref} className="text-gray-300 hover:text-white">{adminPhone}</a>
              </div>
              <div className="flex items-center">
                <FaVoicemail className="text-blue-400 mr-3" />
                <a href={mailHref} className="text-gray-300 hover:text-white">{adminEmail}</a>
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

          {/* Footer Links - wrapped to reduce height on small screens */}
          <div className="min-w-0 lg:w-72">
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
        </div>

        {/* Quick Links */}
        <div className="border-t border-gray-800 mt-12 pt-8">
          <h3 className="text-lg font-semibold mb-6 text-center">{t ? t('footer.quickLinks') : 'Quick Links'}</h3>
          <div className="flex flex-wrap justify-center gap-3 sm:gap-4">
            {quickLinks.map((link, index) => {
              const IconComponent = link.icon;
              const openInNewTab = link.href && link.href.startsWith('/owner/');
              return (
                <a
                  key={index}
                  href={link.href}
                  {...(openInNewTab ? { target: '_blank', rel: 'noreferrer' } : {})}
                  className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 px-3 py-1.5 text-sm md:px-4 md:py-2 md:text-base rounded-lg transition-all duration-300 hover:scale-105"
                >
                  <IconComponent className="text-blue-400" />
                  <span>{link.name}</span>
                </a>
              );
            })}
          </div>
        </div>
      </div>

      {/* Bottom Bar without global search */}
      <div className="border-t border-gray-800">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="text-gray-300 text-sm">
              {t ? t('footer.bottomCopyright', year) : `© ${year} AkwandaTravels.com. All rights reserved.`}
            </div>
            <div className="flex flex-wrap gap-6 text-sm justify-center md:justify-end">
              <a href="/support" className="text-gray-300 hover:text-white transition-colors duration-300">
                {t ? t('footer.privacy') : 'Privacy Policy'}
              </a>
              <a href="/support" className="text-gray-300 hover:text-white transition-colors duration-300">
                {t ? t('footer.terms') : 'Terms of Service'}
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
