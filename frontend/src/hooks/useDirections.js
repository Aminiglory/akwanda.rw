import { useCallback, useState } from 'react';

// Hook to handle in-app Google Maps directions rendering
// Uses browser geolocation for origin and Google Maps DirectionsService
export function useDirections() {
  const [directions, setDirections] = useState(null);
  const [loadingDirections, setLoadingDirections] = useState(false);
  const [directionsErrorKey, setDirectionsErrorKey] = useState(null);

  const clearDirections = useCallback(() => {
    setDirections(null);
    setDirectionsErrorKey(null);
  }, []);

  const getDirections = useCallback((destination) => {
    if (!destination || destination.lat == null || destination.lng == null) {
      setDirectionsErrorKey('map.directions.invalidDestination');
      return;
    }

    const accessToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN?.trim() || 'pk.eyJ1IjoiYW5zd2Vyam9obnNvbjYiLCJhIjoiY21qbnlkOXRlMnpwZTNlcXp0dDlpemNueCJ9.aa3QMnrPR9XxsI9tFhq4Q';

    if (!accessToken) {
      setDirectionsErrorKey('map.directions.unavailable');
      return;
    }

    if (!navigator.geolocation) {
      setDirectionsErrorKey('map.directions.noGeolocation');
      return;
    }

    setLoadingDirections(true);
    setDirectionsErrorKey(null);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const origin = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };

        try {
          const url =
            `https://api.mapbox.com/directions/v5/mapbox/driving/` +
            `${origin.lng},${origin.lat};${destination.lng},${destination.lat}` +
            `?geometries=geojson&overview=full&access_token=${encodeURIComponent(accessToken)}`;

          const res = await fetch(url);
          const data = await res.json().catch(() => null);

          const coords = data?.routes?.[0]?.geometry?.coordinates;
          if (!res.ok || !Array.isArray(coords) || coords.length < 2) {
            setDirectionsErrorKey('map.directions.failed');
            setDirections(null);
          } else {
            setDirections({
              type: 'Feature',
              geometry: {
                type: 'LineString',
                coordinates: coords,
              },
              properties: {
                distance: data?.routes?.[0]?.distance,
                duration: data?.routes?.[0]?.duration,
              },
            });
          }
        } catch (_) {
          setDirectionsErrorKey('map.directions.failed');
          setDirections(null);
        } finally {
          setLoadingDirections(false);
        }
      },
      () => {
        setLoadingDirections(false);
        setDirectionsErrorKey('map.directions.denied');
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 5 * 60 * 1000,
      }
    );
  }, []);

  return {
    directions,
    loadingDirections,
    directionsErrorKey,
    getDirections,
    clearDirections,
  };
}
