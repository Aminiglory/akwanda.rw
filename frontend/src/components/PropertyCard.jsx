import React from 'react';
import { Link } from 'react-router-dom';
import { FaHeart, FaMapMarkerAlt, FaBed, FaBath, FaRulerCombined, FaEdit, FaTrash } from 'react-icons/fa';

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
  onEditHref
}) => {
  const {
    title,
    image,
    location,
    price,
    status,
    bookings,
    bedrooms,
    bathrooms,
    area
  } = listing || {};

  return (
    <div className="bg-white rounded-xl shadow-md hover:shadow-lg transition-all border border-gray-100 overflow-hidden">
      {image ? (
        <div className="relative">
          <img
            loading="lazy"
            src={image}
            alt={title}
            className="w-full h-44 md:h-48 object-cover"
            onError={(e) => { e.currentTarget.style.display = 'none'; }}
          />
          {status === 'active' && (
            <span className="absolute top-3 left-3 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-orange-500 text-white shadow">Hot</span>
          )}
          <button
            type="button"
            onClick={(e) => { e.stopPropagation?.(); onToggleWishlist && onToggleWishlist(); }}
            className={`absolute top-3 right-3 w-9 h-9 rounded-full bg-white/90 hover:bg-white flex items-center justify-center shadow ${listing?.wishlisted || wishlisted ? 'text-red-500' : 'text-gray-600 hover:text-red-500'}`}
            aria-label="Wishlist"
            aria-pressed={!!(listing?.wishlisted || wishlisted)}
          >
            <FaHeart />
          </button>
        </div>
      ) : null}
      <div className="p-5">
        <div className="flex items-start justify-between mb-1">
          <h4 className="font-semibold text-gray-900 line-clamp-1">{title}</h4>
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(status)}`}>{status}</span>
        </div>
        <div className="flex items-center text-gray-600 text-sm mb-1">
          <FaMapMarkerAlt className="mr-1" />
          <span className="line-clamp-1">{location}</span>
        </div>
        {listing?.host && (
          <div className="text-xs text-gray-500 mb-3">Hosted by <span className="font-medium text-gray-700">{listing.host}</span></div>
        )}
        <div className="text-sm text-gray-600 mb-4">{bookings || 0} bookings</div>
        <div className="grid grid-cols-3 gap-3 text-sm">
          <div className="flex items-center gap-2">
            <FaBed className="text-gray-400" />
            <div>
              <div className="text-gray-900 font-semibold">{bedrooms ?? '-'}</div>
              <div className="text-gray-500 text-xs">Bedrooms</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <FaBath className="text-gray-400" />
            <div>
              <div className="text-gray-900 font-semibold">{bathrooms ?? '-'}</div>
              <div className="text-gray-500 text-xs">Bathrooms</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <FaRulerCombined className="text-gray-400" />
            <div>
              <div className="text-gray-900 font-semibold">{area ?? '-'}</div>
              <div className="text-gray-500 text-xs">Area</div>
            </div>
          </div>
        </div>
        <div className="mt-4 flex items-center justify-between">
          <div className="text-teal-600 font-extrabold text-xl">RWF {(price ?? 0).toLocaleString()}</div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={onView} className="px-3 py-2 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors text-sm">
              View Details
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
