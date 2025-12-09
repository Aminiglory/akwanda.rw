import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { FaBed, FaBath, FaMapMarkerAlt, FaArrowLeft, FaStar } from 'react-icons/fa';
import { useLocale } from '../contexts/LocaleContext';

// Fix for default marker icons
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

// Fix for default marker icons
const DefaultIcon = L.icon({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  tooltipAnchor: [16, -28],
  shadowSize: [41, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

const PropertyMapView = () => {
  const { formatCurrencyRWF } = useLocale() || {};
  const location = useLocation();
  const navigate = useNavigate();
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedProperty, setSelectedProperty] = useState(null);
  const [bounds, setBounds] = useState(null);
  const [activeFilters, setActiveFilters] = useState({
    type: 'all',
    minPrice: 0,
    maxPrice: 1000000,
  });

  // Fetch properties from API or use passed properties
  useEffect(() => {
    const fetchProperties = async () => {
      try {
        // If properties are passed via state (from listing page)
        if (location.state?.properties) {
          setProperties(location.state.properties);
          if (location.state.properties.length > 0) {
            const bounds = L.latLngBounds(
              location.state.properties.map(p => [p.latitude, p.longitude])
            );
            setBounds(bounds);
          }
        } else {
          // Otherwise, fetch all properties with coordinates
          const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/properties?fields=id,title,price,images,bedrooms,bathrooms,type,rating,latitude,longitude`);
          const data = await response.json();
          setProperties(data);
          if (data.length > 0) {
            const bounds = L.latLngBounds(
              data.map(p => [p.latitude, p.longitude])
            );
            setBounds(bounds);
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
    setSelectedProperty(property);
  };

  const handleClosePopup = () => {
    setSelectedProperty(null);
  };

  const handleBackToListing = () => {
    navigate(-1); // Go back to previous page
  };

  // Filter properties based on active filters
  const filteredProperties = properties.filter(property => {
    if (activeFilters.type !== 'all' && property.type !== activeFilters.type) {
      return false;
    }
    if (property.price < activeFilters.minPrice || property.price > activeFilters.maxPrice) {
      return false;
    }
    return true;
  });

  if (loading) {
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
          <FaArrowLeft className="mr-2" /> Back to Listings
        </button>
        <h1 className="text-xl font-bold">Properties on Map</h1>
        <div className="w-8"></div> {/* For balance */}
      </header>

      {/* Map Container */}
      <div className="h-full w-full pt-16">
        {bounds && (
          <MapContainer 
            center={bounds.getCenter()} 
            zoom={13} 
            style={{ height: '100%', width: '100%' }}
            bounds={bounds}
            boundsOptions={{ padding: [50, 50] }}
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            />
            
            {filteredProperties.map((property) => (
              <Marker 
                key={property.id} 
                position={[property.latitude, property.longitude]}
                eventHandlers={{
                  click: () => handleMarkerClick(property),
                }}
              >
                <Popup>
                  <div className="w-64">
                    {property.images && property.images.length > 0 && (
                      <img 
                        src={property.images[0]} 
                        alt={property.title} 
                        className="w-full h-32 object-cover rounded-t-lg"
                      />
                    )}
                    <div className="p-2">
                      <h3 className="font-semibold text-sm">{property.title}</h3>
                      <div className="flex items-center text-gray-600 text-xs mt-1">
                        <FaMapMarkerAlt className="mr-1" />
                        <span>{property.location || 'Location not specified'}</span>
                      </div>
                      <div className="flex items-center justify-between mt-2">
                        <div className="flex items-center">
                          <span className="text-yellow-500 flex items-center">
                            <FaStar className="mr-1" />
                            {property.rating || '4.5'}
                          </span>
                        </div>
                        <span className="font-bold text-blue-600">
                          {formatCurrencyRWF ? formatCurrencyRWF(property.price) : `RWF ${property.price?.toLocaleString()}`}
                        </span>
                      </div>
                      <div className="flex items-center text-gray-500 text-xs mt-1">
                        <span className="flex items-center mr-3">
                          <FaBed className="mr-1" /> {property.bedrooms || 1}
                        </span>
                        <span className="flex items-center">
                          <FaBath className="mr-1" /> {property.bathrooms || 1}
                        </span>
                      </div>
                      <Link 
                        to={`/apartments/${property.id}`}
                        className="block mt-2 text-center text-sm bg-blue-600 text-white py-1 rounded hover:bg-blue-700 transition-colors"
                      >
                        View Details
                      </Link>
                    </div>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
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
            <div className="flex items-center text-gray-600 text-sm mb-3">
              <FaMapMarkerAlt className="mr-1" />
              <span>{selectedProperty.address || 'Address not available'}</span>
            </div>
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
                <FaBed className="mr-1" /> {selectedProperty.bedrooms || 1} Beds
              </span>
              <span className="flex items-center">
                <FaBath className="mr-1" /> {selectedProperty.bathrooms || 1} Baths
              </span>
            </div>
            <div className="flex space-x-3">
              <Link
                to={`/apartments/${selectedProperty.id}`}
                className="flex-1 bg-blue-600 text-white text-center py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                View Details
              </Link>
              <button className="px-4 py-2 border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 transition-colors">
                Book Now
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Filters Panel */}
      <div className="absolute top-20 left-4 z-10 bg-white p-4 rounded-lg shadow-lg w-64">
        <h3 className="font-semibold mb-3">Filters</h3>
        
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">Property Type</label>
          <select 
            className="w-full p-2 border rounded-md"
            value={activeFilters.type}
            onChange={(e) => setActiveFilters({...activeFilters, type: e.target.value})}
          >
            <option value="all">All Types</option>
            <option value="apartment">Apartment</option>
            <option value="house">House</option>
            <option value="villa">Villa</option>
            <option value="hotel">Hotel</option>
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Price Range: {formatCurrencyRWF ? formatCurrencyRWF(activeFilters.minPrice) : `RWF ${activeFilters.minPrice?.toLocaleString()}`} - {formatCurrencyRWF ? formatCurrencyRWF(activeFilters.maxPrice) : `RWF ${activeFilters.maxPrice?.toLocaleString()}`}
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
