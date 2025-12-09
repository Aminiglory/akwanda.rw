import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { useEffect, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import MarkerClusterGroup from 'react-leaflet-cluster';

// Fix for default marker icons in Next.js
const createClusterCustomIcon = (cluster) => {
  return L.divIcon({
    html: `<span class="cluster-badge">${cluster.getChildCount()}</span>`,
    className: 'custom-marker-cluster',
    iconSize: L.point(40, 40, true),
  });
};
const customIcon = L.icon({
  iconUrl: '/marker-icon.png', // Add your custom marker icon
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -32]
});

export default function EnhancedMap({ properties, selectedProperty, onPropertySelect }) {
  const [map, setMap] = useState(null);
  const [activeFilter, setActiveFilter] = useState('all');
  
  // Filter properties based on active filter
  const filteredProperties = properties.filter(property => {
    if (activeFilter === 'all') return true;
    return property.type === activeFilter;
  });

  // Fit bounds when filtered properties change
  useEffect(() => {
    if (map && filteredProperties.length > 0) {
      const bounds = L.latLngBounds(
        filteredProperties.map(prop => [prop.lat, prop.lng])
      );
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [map, filteredProperties]);

  return (
    <div className="relative h-full w-full">
      {/* Map Filters */}
      <div className="absolute top-4 left-4 z-[1000] bg-white shadow-lg rounded-lg p-2 flex gap-2">
        {['all', 'hotel', 'apartment', 'villa'].map(type => (
          <button
            key={type}
            onClick={() => setActiveFilter(type)}
            className={`px-3 py-1 rounded-md text-sm font-medium ${
              activeFilter === type 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-100 hover:bg-gray-200'
            }`}
          >
            {type.charAt(0).toUpperCase() + type.slice(1)}
          </button>
        ))}
      </div>

      <MapContainer
        center={[-1.9403, 29.8739]} // Default to Rwanda center
        zoom={12}
        style={{ height: '100%', width: '100%' }}
        whenCreated={setMap}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        
        <MarkerClusterGroup
          chunkedLoading
          iconCreateFunction={createClusterCustomIcon}
          maxClusterRadius={40}
          spiderfyOnMaxZoom={true}
          showCoverageOnHover={false}
        >
          {filteredProperties.map(property => (
            <Marker
              key={property.id}
              position={[property.lat, property.lng]}
              icon={customIcon}
              eventHandlers={{
                click: () => onPropertySelect(property),
              }}
            >
              <Popup>
                <div className="w-48">
                  <img 
                    src={property.images?.[0] || '/placeholder.jpg'} 
                    alt={property.name}
                    className="w-full h-24 object-cover rounded-t-lg"
                  />
                  <div className="p-2">
                    <h3 className="font-bold text-sm">{property.name}</h3>
                    <p className="text-xs text-gray-600">${property.price} / night</p>
                    <div className="flex items-center mt-1">
                      <span className="text-yellow-500">★</span>
                      <span className="text-xs ml-1">
                        {property.rating || 'N/A'}
                      </span>
                    </div>
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}
        </MarkerClusterGroup>
      </MapContainer>
    </div>
  );
}
