import React, { useEffect, useMemo, useState } from 'react';
import Map, { Marker, NavigationControl } from 'react-map-gl';

export default function MapboxLocationPicker({
  latitude,
  longitude,
  zoom = 13,
  onChange,
  scrollZoom = true,
  draggable = true,
  className,
  mapStyle = 'mapbox://styles/mapbox/navigation-day-v1',
}) {
  const accessToken =
    import.meta.env.VITE_MAPBOX_ACCESS_TOKEN ||
    'pk.eyJ1IjoiYW5zd2Vyam9obnNvbjYiLCJhIjoiY21qbnlkOXRlMnpwZTNlcXp0dDlpemNueCJ9.aa3QMnrPR9XxsI9tFhq4Qpk.eyJ1IjoiYW5zd2Vyam9obnNvbjYiLCJhIjoiY21qbnlkOXRlMnpwZTNlcXp0dDlpemNueCJ9.aa3QMnrPR9XxsI9tFhq4Q';

  const safeLat = typeof latitude === 'number' ? latitude : -1.9536;
  const safeLng = typeof longitude === 'number' ? longitude : 30.0606;

  const [viewState, setViewState] = useState({
    latitude: safeLat,
    longitude: safeLng,
    zoom,
    bearing: 0,
    pitch: 0,
  });

  useEffect(() => {
    setViewState((prev) => ({
      ...prev,
      latitude: safeLat,
      longitude: safeLng,
      zoom: prev?.zoom ?? zoom,
    }));
  }, [safeLat, safeLng, zoom]);

  const pin = useMemo(
    () => (
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="36" viewBox="0 0 32 48" fill="none">
        <path
          d="M16 2C10 2 5 7 5 13c0 8 11 18 11 18s11-10 11-18C27 7 22 2 16 2z"
          fill="#FF5A5F"
        />
        <circle cx="16" cy="13" r="4" fill="white" />
      </svg>
    ),
    []
  );

  return (
    <Map
      {...viewState}
      onMove={(evt) => setViewState(evt.viewState)}
      onClick={(evt) => {
        const { lng, lat } = evt.lngLat;
        onChange?.({ lat, lng });
      }}
      mapboxAccessToken={accessToken}
      mapStyle={mapStyle}
      attributionControl={false}
      scrollZoom={scrollZoom}
      reuseMaps
      className={className}
    >
      <NavigationControl position="bottom-right" showCompass={false} />

      <Marker
        longitude={safeLng}
        latitude={safeLat}
        anchor="bottom"
        draggable={draggable}
        onDragEnd={(evt) => {
          const { lng, lat } = evt.lngLat;
          onChange?.({ lat, lng });
        }}
      >
        <div style={{ transform: 'translateY(-6px)' }}>{pin}</div>
      </Marker>
    </Map>
  );
}
