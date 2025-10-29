import React from 'react';
import { FaFire, FaClock, FaMobile, FaCalendarAlt, FaBed, FaTag, FaPercent } from 'react-icons/fa';

const PropertyDealBadge = ({ deal, size = 'md', showDiscount = true }) => {
  if (!deal) return null;

  const getIcon = () => {
    switch (deal.dealType) {
      case 'early_bird': return FaClock;
      case 'last_minute': return FaFire;
      case 'mobile_only': return FaMobile;
      case 'free_cancellation': return FaCalendarAlt;
      case 'long_stay': return FaBed;
      case 'flash_sale': return FaFire;
      default: return FaTag;
    }
  };

  const Icon = getIcon();
  
  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-3 py-1',
    lg: 'text-base px-4 py-1.5'
  };

  const iconSizes = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base'
  };

  const getDiscountText = () => {
    if (deal.discountType === 'percentage') {
      return `${deal.discountValue}% OFF`;
    } else if (deal.discountType === 'fixed_amount') {
      return `$${deal.discountValue} OFF`;
    } else if (deal.discountType === 'free_night') {
      return `${deal.discountValue} Free Night${deal.discountValue > 1 ? 's' : ''}`;
    }
    return 'Special Deal';
  };

  return (
    <div className="flex flex-col space-y-1">
      {/* Deal Badge */}
      <div
        className={`${sizeClasses[size]} rounded-md text-white font-bold inline-flex items-center space-x-1 w-fit shadow-md`}
        style={{ backgroundColor: deal.badgeColor || '#FF6B6B' }}
      >
        <Icon className={iconSizes[size]} />
        <span>{deal.title || deal.tagline || 'Special Deal'}</span>
      </div>

      {/* Discount Display */}
      {showDiscount && (
        <div className="flex items-center space-x-1">
          <FaPercent className="text-green-600 text-sm" />
          <span className="text-green-600 font-bold text-sm">
            {getDiscountText()}
          </span>
        </div>
      )}
    </div>
  );
};

export default PropertyDealBadge;
