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
    if (!window.google || !window.google.maps) {
      setDirectionsErrorKey('map.directions.unavailable');
      return;
    }

    if (!destination || destination.lat == null || destination.lng == null) {
      setDirectionsErrorKey('map.directions.invalidDestination');
      return;
    }

    if (!navigator.geolocation) {
      setDirectionsErrorKey('map.directions.noGeolocation');
      return;
    }

    setLoadingDirections(true);
    setDirectionsErrorKey(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const origin = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };

        const service = new window.google.maps.DirectionsService();

        service.route(
          {
            origin,
            destination,
            travelMode: window.google.maps.TravelMode.DRIVING,
          },
          (result, status) => {
            if (status === window.google.maps.DirectionsStatus.OK && result) {
              setDirections(result);
            } else {
              setDirectionsErrorKey('map.directions.failed');
            }
            setLoadingDirections(false);
          }
        );
      },
      () => {
        setLoadingDirections(false);
        setDirectionsErrorKey('map.directions.denied');
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
