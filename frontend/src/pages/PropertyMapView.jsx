import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { GoogleMap, OverlayView, useLoadScript } from '@react-google-maps/api';
import { FaBed, FaBath, FaMapMarkerAlt, FaArrowLeft, FaStar } from 'react-icons/fa';
import { useLocale } from '../contexts/LocaleContext';

const toRad = (value) => (value * Math.PI) / 180;

const distanceInKm = (lat1, lon1, lat2, lon2) => {
  if (
    lat1 == null || lon1 == null ||
    lat2 == null || lon2 == null ||
    Number.isNaN(lat1) || Number.isNaN(lon1) ||
    Number.isNaN(lat2) || Number.isNaN(lon2)
  ) {
    return null;
  }
  const R = 6371; // km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const PropertyMapView = () => {
  const { formatCurrencyRWF, t } = useLocale() || {};
  const location = useLocation();
  const navigate = useNavigate();
  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
  });
  const initialFocused = location.state?.focusedProperty || null;
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedProperty, setSelectedProperty] = useState(initialFocused);
  const [mapCenter, setMapCenter] = useState(null);
  const [activeFilters, setActiveFilters] = useState({
    type: 'all',
    minPrice: 0,
    maxPrice: 1000000,
  });

  const getMarkerLabel = (property) => (
    String(property.title || '').trim() || (t ? t('map.unnamedProperty') : 'Property')
  );

  // Fetch properties from API or use passed properties
  useEffect(() => {
    const fetchProperties = async () => {
      try {
        // If properties are passed via state (from listing page)
        if (location.state?.properties) {
          const incomingProps = location.state.properties;
          setProperties(incomingProps);

          if (incomingProps.length > 0) {
            // Center on focused property if available, otherwise on average of all
            if (location.state.focusedProperty) {
              const fp = location.state.focusedProperty;
              const focused = incomingProps.find(
                (p) => (p.id || p._id) === (fp.id || fp._id)
              ) || fp;
              if (focused.latitude != null && focused.longitude != null) {
                setMapCenter({ lat: Number(focused.latitude), lng: Number(focused.longitude) });
              }
            } else {
              const first = incomingProps[0];
              if (first && first.latitude != null && first.longitude != null) {
                setMapCenter({ lat: Number(first.latitude), lng: Number(first.longitude) });
              }
            }
          }

          if (location.state.focusedProperty) {
            const fp = location.state.focusedProperty;
            const focused = incomingProps.find(
              (p) => (p.id || p._id) === (fp.id || fp._id)
            ) || fp;
            setSelectedProperty(focused);
          }

          setLoading(false);
          return;
        } else {
          // Otherwise, fetch all properties with coordinates
          const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/properties?fields=id,title,price,images,bedrooms,bathrooms,type,rating,latitude,longitude`);
          const data = await response.json();
          const list = Array.isArray(data?.properties) ? data.properties : Array.isArray(data) ? data : [];
          setProperties(list);
          if (list.length > 0) {
            const first = list[0];
            if (first && first.latitude != null && first.longitude != null) {
              setMapCenter({ lat: Number(first.latitude), lng: Number(first.longitude) });
            }
          }
        }
      } catch (error) {
        console.error('Error fetching properties:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProperties();
  }, [location.state]);

  const handleMarkerClick = (property) => {
    navigate(`/apartment/${property.id}`);
  };

  const handleMarkerHover = (property) => {
    setSelectedProperty(property);
  };

  const handleMarkerLeave = () => {
    setSelectedProperty(null);
  };

  const handleClosePopup = () => {
    setSelectedProperty(null);
  };

  const handleBackToListing = () => {
    navigate(-1); // Go back to previous page
  };

  // Filter properties based on active filters
  const filteredProperties = properties.filter(property => {
    if (activeFilters.type !== 'all' && property.type && property.type !== activeFilters.type) {
      return false;
    }
    const price = Number(property.price || 0);
    if (Number.isFinite(price)) {
      if (price < activeFilters.minPrice || price > activeFilters.maxPrice) {
        return false;
      }
    }
    return true;
  });

  let distanceLabel = null;
  if (mapCenter && selectedProperty && selectedProperty.latitude != null && selectedProperty.longitude != null) {
    const d = distanceInKm(
      mapCenter.lat,
      mapCenter.lng,
      Number(selectedProperty.latitude),
      Number(selectedProperty.longitude)
    );
    if (d != null && Number.isFinite(d)) {
      distanceLabel = d.toFixed(1);
    }
  }

  if (loading || !isLoaded) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="relative h-screen w-full">
      {/* Header */}
      <header className="absolute top-0 left-0 right-0 z-10 bg-white shadow-md p-4 flex justify-between items-center">
        <button 
          onClick={handleBackToListing}
          className="flex items-center text-blue-600 hover:text-blue-800"
        >
          <FaArrowLeft className="mr-2" /> {t ? t('map.backToListings') : 'Back to Listings'}
        </button>
        <h1 className="text-xl font-bold">{t ? t('map.title') : 'Properties on Map'}</h1>
        <div className="w-8"></div> {/* For balance */}
      </header>

      {/* Map Container (Google Maps) */}
      <div className="h-full w-full pt-16">
        {mapCenter && (
          <GoogleMap
            center={mapCenter}
            zoom={13}
            mapContainerStyle={{ height: '100%', width: '100%' }}
            options={{
              disableDefaultUI: false,
              clickableIcons: false,
            }}
          >
            {filteredProperties.map((property) => {
              if (property.latitude == null || property.longitude == null) return null;
              const isSelected = selectedProperty && ((selectedProperty.id || selectedProperty._id) === (property.id || property._id));
              const label = getMarkerLabel(property);
              return (
                <OverlayView
                  key={property.id}
                  position={{ lat: Number(property.latitude), lng: Number(property.longitude) }}
                  mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
                >
                  <div
                    onMouseEnter={() => handleMarkerHover(property)}
                    onMouseLeave={handleMarkerLeave}
                    onClick={() => handleMarkerClick(property)}
                    className="cursor-pointer"
                    style={{
                      transform: 'translate(-50%, -100%)',
                    }}
                  >
                    <div
                      style={{
                        backgroundColor: isSelected ? '#b91c1c' : '#1d4ed8',
                        color: '#ffffff',
                        padding: isSelected ? '6px 18px' : '4px 14px',
                        borderRadius: 9999,
                        fontWeight: 700,
                        fontSize: isSelected ? 13 : 12,
                        boxShadow: '0 10px 25px rgba(15,23,42,0.55)',
                        whiteSpace: 'nowrap',
                        border: '1px solid rgba(255,255,255,0.85)',
                      }}
                    >
                      {label}
                    </div>
                  </div>
                </OverlayView>
              );
            })}
          </GoogleMap>
        )}
      </div>

      {/* Property Details Panel */}
      {selectedProperty && (
        <div className="absolute bottom-0 left-0 right-0 z-20 bg-white shadow-lg rounded-t-xl overflow-hidden transition-transform duration-300 transform">
          <div className="p-4">
            <div className="flex justify-between items-center mb-2">
              <h2 className="text-xl font-bold">{selectedProperty.title}</h2>
              <button 
                onClick={handleClosePopup}
                className="text-gray-500 hover:text-gray-700"
              >
                ×
              </button>
            </div>
            <div className="flex items-center text-gray-600 text-sm mb-2">
              <FaMapMarkerAlt className="mr-1" />
              <span>{selectedProperty.location || selectedProperty.address || (t ? t('map.addressNotAvailable') : 'Address not available')}</span>
            </div>
            {distanceLabel && (
              <div className="text-xs text-gray-500 mb-3">
                <span className="font-medium">{distanceLabel} km</span>{' '}
                {t ? t('map.fromCenter') : 'from center'}
              </div>
            )}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center">
                <span className="text-yellow-500 flex items-center">
                  <FaStar className="mr-1" />
                  {selectedProperty.rating || '4.5'}
                </span>
              </div>
              <span className="font-bold text-lg text-blue-600">
                {formatCurrencyRWF ? formatCurrencyRWF(selectedProperty.price) : `RWF ${selectedProperty.price?.toLocaleString()}`}
                <span className="text-gray-500 text-sm font-normal"> / night</span>
              </span>
            </div>
            <div className="flex items-center text-gray-500 text-sm mb-4">
              <span className="flex items-center mr-4">
                <FaBed className="mr-1" /> {selectedProperty.bedrooms || 1} {t ? t('map.bedsLabel') : 'Beds'}
              </span>
              <span className="flex items-center">
                <FaBath className="mr-1" /> {selectedProperty.bathrooms || 1} {t ? t('map.bathsLabel') : 'Baths'}
              </span>
            </div>
            <div className="flex flex-col sm:flex-row sm:space-x-3 space-y-2 sm:space-y-0">
              <Link
                to={`/apartment/${selectedProperty.id}`}
                className="flex-1 bg-blue-600 text-white text-center py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                {t ? t('map.viewDetails') : 'View Details'}
              </Link>
              <button className="px-4 py-2 border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 transition-colors">
                {t ? t('map.bookNow') : 'Book Now'}
              </button>
              {selectedProperty.latitude != null && selectedProperty.longitude != null && (
                <a
                  href={`https://www.google.com/maps/dir/?api=1&destination=${selectedProperty.latitude},${selectedProperty.longitude}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm text-center"
                >
                  {t ? t('map.getDirections') : 'Get directions'}
                </a>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Filters Panel */}
      <div className="absolute top-20 left-4 z-10 bg-white p-4 rounded-lg shadow-lg w-64">
        <h3 className="font-semibold mb-3">{t ? t('map.filtersTitle') : 'Filters'}</h3>
        
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">{t ? t('map.propertyType') : 'Property Type'}</label>
          <select 
            className="w-full p-2 border rounded-md"
            value={activeFilters.type}
            onChange={(e) => setActiveFilters({...activeFilters, type: e.target.value})}
          >
            <option value="all">{t ? t('map.typeAll') : 'All Types'}</option>
            <option value="apartment">{t ? t('map.typeApartment') : 'Apartment'}</option>
            <option value="house">{t ? t('map.typeHouse') : 'House'}</option>
            <option value="villa">{t ? t('map.typeVilla') : 'Villa'}</option>
            <option value="hotel">{t ? t('map.typeHotel') : 'Hotel'}</option>
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {(t ? t('map.priceRangeLabel') : 'Price Range:')} {formatCurrencyRWF ? formatCurrencyRWF(activeFilters.minPrice) : `RWF ${activeFilters.minPrice?.toLocaleString()}`} - {formatCurrencyRWF ? formatCurrencyRWF(activeFilters.maxPrice) : `RWF ${activeFilters.maxPrice?.toLocaleString()}`}
          </label>
          <div className="flex space-x-2">
            <input
              type="range"
              min="0"
              max="1000000"
              step="10000"
              value={activeFilters.minPrice}
              onChange={(e) => setActiveFilters({...activeFilters, minPrice: parseInt(e.target.value)})}
              className="w-full"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default PropertyMapView;
