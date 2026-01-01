import { useEffect, useMemo, useRef, useState } from 'react';
import Map, { Marker, NavigationControl } from 'react-map-gl';
import { applyGoogleLikeStyle } from '../utils/mapboxGoogleLikeStyle';

export default function EnhancedMap({ properties, selectedProperty, onPropertySelect }) {
  const mapRef = useRef(null);
  const [activeFilter, setActiveFilter] = useState('all');
  
  // Filter properties based on active filter
  const filteredProperties = properties.filter(property => {
    if (activeFilter === 'all') return true;
    return property.type === activeFilter;
  });

  const mapboxAccessToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN?.trim() || 'pk.eyJ1IjoiYW5zd2Vyam9obnNvbjYiLCJhIjoiY21qbnlkOXRlMnpwZTNlcXp0dDlpemNueCJ9.aa3QMnrPR9XxsI9tFhq4Q';

  const bounds = useMemo(() => {
    const points = (filteredProperties || [])
      .map((p) => ({
        lat: Number(p.lat),
        lng: Number(p.lng),
      }))
      .filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng));

    if (!points.length) return null;

    let minLng = points[0].lng;
    let maxLng = points[0].lng;
    let minLat = points[0].lat;
    let maxLat = points[0].lat;

    for (const p of points) {
      minLng = Math.min(minLng, p.lng);
      maxLng = Math.max(maxLng, p.lng);
      minLat = Math.min(minLat, p.lat);
      maxLat = Math.max(maxLat, p.lat);
    }

    return [
      [minLng, minLat],
      [maxLng, maxLat],
    ];
  }, [filteredProperties]);

  // Fit bounds when filtered properties change
  useEffect(() => {
    const map = mapRef.current?.getMap?.();
    if (!map || !bounds) return;
    map.fitBounds(bounds, { padding: 50, duration: 600 });
  }, [bounds]);

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

      <Map
        ref={mapRef}
        initialViewState={{ latitude: -1.9403, longitude: 29.8739, zoom: 12 }}
        mapboxAccessToken={mapboxAccessToken}
        mapStyle="mapbox://styles/mapbox/navigation-day-v1"
        onLoad={(evt) => applyGoogleLikeStyle(evt.target)}
        attributionControl={false}
        reuseMaps
        style={{ height: '100%', width: '100%' }}
      >
        <NavigationControl position="bottom-right" showCompass={false} />

        {filteredProperties.map((property) => {
          const lat = Number(property.lat);
          const lng = Number(property.lng);
          if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
          const isSelected = selectedProperty && ((selectedProperty.id || selectedProperty._id) === (property.id || property._id));

          return (
            <Marker key={property.id} longitude={lng} latitude={lat} anchor="bottom">
              <button
                type="button"
                onClick={() => onPropertySelect?.(property)}
                className="cursor-pointer"
                style={{ transform: 'translateY(-6px)' }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="26" height="38" viewBox="0 0 32 48" fill="none">
                  <path
                    d="M16 2C10 2 5 7 5 13c0 8 11 18 11 18s11-10 11-18C27 7 22 2 16 2z"
                    fill={isSelected ? '#b91c1c' : '#FF5A5F'}
                  />
                  <circle cx="16" cy="13" r="4" fill="white" />
                </svg>
              </button>
            </Marker>
          );
        })}
      </Map>
    </div>
  );
}
