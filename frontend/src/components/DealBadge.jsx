import React from 'react';
import { FaFire, FaClock, FaMobile, FaCalendarAlt, FaBed, FaTag } from 'react-icons/fa';

const DealBadge = ({ deal, size = 'md' }) => {
  if (!deal) return null;

  const getIcon = () => {
    switch (deal.dealType) {
      case 'early_bird': return FaClock;
      case 'last_minute': return FaFire;
      case 'mobile_only': return FaMobile;
      case 'free_cancellation': return FaCalendarAlt;
      case 'long_stay': return FaBed;
      default: return FaTag;
    }
  };

  const Icon = getIcon();
  const sizeClasses = {
    sm: 'text-xs px-2 py-1',
    md: 'text-sm px-3 py-1.5',
    lg: 'text-base px-4 py-2'
  };

  return (
    <div className="inline-flex items-center space-x-2">
      <span
        className={`${sizeClasses[size]} rounded-full text-white font-semibold inline-flex items-center space-x-1`}
        style={{ backgroundColor: deal.badgeColor || '#FF6B6B' }}
      >
        <Icon />
        <span>{deal.title}</span>
      </span>
      {deal.discountType === 'percentage' && (
        <span className="text-2xl font-bold text-green-600">
          {deal.discountValue}% OFF
        </span>
      )}
    </div>
  );
};

export default DealBadge;
