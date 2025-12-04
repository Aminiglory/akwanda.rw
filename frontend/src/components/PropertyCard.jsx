import React from 'react';
import { Link } from 'react-router-dom';
import { FaHeart, FaMapMarkerAlt, FaBed, FaBath, FaRulerCombined, FaEdit, FaTrash } from 'react-icons/fa';
import { useLocale } from '../contexts/LocaleContext';

const getStatusColor = (status) => {
  switch (status) {
    case 'active':
      return 'bg-green-100 text-green-800';
    case 'inactive':
      return 'bg-gray-100 text-gray-800';
    case 'pending':
      return 'bg-yellow-100 text-yellow-800';
    case 'cancelled':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-blue-100 text-blue-800';
  }
};

const PropertyCard = ({
  listing,
  onDelete,
  onView,
  onEditHref,
  onToggleWishlist,
  highlight,
  variant = 'default'
}) => {
  const { formatCurrencyRWF, t } = useLocale() || {};
  const {
    title,
    image,
    location,
    price,
    status,
    bedrooms,
    bathrooms,
    isPremium,
    isAd,
    rooms,
    hasBreakfastIncluded,
  } = listing || {};

  const highlightText = (text) => {
    const term = String(highlight || '').trim();
    const value = String(text || '');
    if (!term) return value;
    const lower = value.toLowerCase();
    const idx = lower.indexOf(term.toLowerCase());
    if (idx === -1) return value;
    const before = value.slice(0, idx);
    const match = value.slice(idx, idx + term.length);
    const after = value.slice(idx + term.length);
    return (
      <>
        {before}
        <mark className="bg-yellow-200 text-gray-900 px-0.5 rounded">
          {match}
        </mark>
        {after}
      </>
    );
  };

  const isWishlisted = !!(listing && listing.wishlisted);
  const isCompact = variant === 'compact';

  return (
    <div className="bg-white rounded-xl shadow-md hover:shadow-lg transition-all border border-gray-100 overflow-hidden h-full w-full max-w-sm mx-auto flex flex-col">
      <div className="relative bg-gray-100">
        <img
          src={image || ''}
          alt={title}
          className="w-full h-44 md:h-48 object-cover"
          loading="eager"
          decoding="async"
        />
        {isPremium && (
          <span className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-[#f97316] text-white text-[11px] font-semibold shadow">
            Premium
          </span>
        )}
        {!isPremium && isAd && (
          <span className="absolute top-3 left-3 px-2 py-1 rounded-full bg-black/70 text-white text-[10px] font-medium shadow">
            Ad
          </span>
        )}

        <button
          type="button"
          onClick={(e) => { e.stopPropagation?.(); onToggleWishlist && onToggleWishlist(); }}
          className={`absolute top-3 right-3 w-9 h-9 rounded-full bg-white/90 hover:bg-white flex items-center justify-center shadow ${isWishlisted ? 'text-red-500' : 'text-gray-600 hover:text-red-500'}`}
          aria-label="Wishlist"
          aria-pressed={isWishlisted}
        >
          <FaHeart />
        </button>
      </div>
      <div className={`${isCompact ? 'p-4' : 'p-5'} flex-1 flex flex-col`}>
        <div className="flex items-start justify-between mb-1">
          <h4 className="font-semibold text-gray-900 line-clamp-1">{highlightText(title)}</h4>
        </div>
        <div className="flex items-center text-gray-600 text-sm mb-1">
          <FaMapMarkerAlt className="mr-1" />
          <span className="line-clamp-1">{highlightText(location)}</span>
        </div>
        {Array.isArray(rooms) && rooms.length > 0 && (
          <div className="mt-1 mb-3 overflow-x-auto scrollbar-hide">
            <div className="flex gap-2">
              {rooms.slice(0, 6).map((room, idx) => (
                <span
                  key={room._id || room.roomNumber || room.roomType || idx}
                  className="px-2 py-1 rounded-full bg-gray-100 text-[11px] font-medium text-gray-700 whitespace-nowrap"
                >
                  {room.roomNumber || room.name || room.roomType || 'Room'}
                </span>
              ))}
            </div>
          </div>
        )}
        {hasBreakfastIncluded && (
          <div className="mb-3">
            <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-green-50 text-[11px] font-semibold text-green-700 border border-green-200">
              {t ? t('property.breakfastIncluded') : 'Breakfast included'}
            </span>
          </div>
        )}
        <div className="mt-4 flex items-center justify-between flex-none">
          <div className={`text-teal-600 font-extrabold ${isCompact ? 'text-lg' : 'text-xl'}`}>{formatCurrencyRWF ? formatCurrencyRWF(price ?? 0) : `RWF ${(price ?? 0).toLocaleString()}`}</div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={onView} className="px-3 py-2 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors text-sm">
              {t ? t('property.viewDetails') : 'View Details'}
            </button>
            {onEditHref && (
              <Link to={onEditHref} className="p-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors" aria-label="Edit">
                <FaEdit />
              </Link>
            )}
            {onDelete && (
              <button type="button" onClick={onDelete} className="p-2 border border-gray-300 text-red-600 rounded-lg hover:bg-red-50 transition-colors" aria-label="Delete">
                <FaTrash />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PropertyCard;
