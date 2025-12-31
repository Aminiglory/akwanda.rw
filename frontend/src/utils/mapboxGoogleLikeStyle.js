export function applyGoogleLikeStyle(map) {
  if (!map || typeof map.getStyle !== 'function') return;

  const safeSetPaint = (layerId, prop, value) => {
    if (!map.getLayer(layerId)) return;
    try {
      map.setPaintProperty(layerId, prop, value);
    } catch {
      // ignore paint errors for layers that don't support this prop
    }
  };

  const style = map.getStyle?.();

  // Hide traffic overlays (green / red tubes) so roads look like base Google Maps
  if (style && Array.isArray(style.layers)) {
    style.layers.forEach((layer) => {
      const id = layer && layer.id;
      if (!id || typeof id !== 'string') return;
      if (id.toLowerCase().includes('traffic')) {
        try {
          map.setLayoutProperty(id, 'visibility', 'none');
        } catch {
          // ignore
        }
      }
    });
  }

  // Land & water
  ['background'].forEach((id) => {
    safeSetPaint(id, 'background-color', '#E8F3E8');
  });

  ['land', 'landcover', 'landuse', 'park'].forEach((id) => {
    safeSetPaint(id, 'fill-color', '#E8F3E8');
  });

  ['landuse-residential', 'landuse-commercial'].forEach((id) => {
    safeSetPaint(id, 'fill-color', '#F2EFE9');
  });

  ['park', 'landcover-wood', 'landcover-grass'].forEach((id) => {
    safeSetPaint(id, 'fill-color', '#CDECCF');
  });

  ['water', 'waterway'].forEach((id) => {
    safeSetPaint(id, 'fill-color', '#AADAFF');
    safeSetPaint(id, 'line-color', '#8BC5F7');
  });

  // Roads
  ['road-motorway', 'road-motorway-trunk'].forEach((id) => {
    safeSetPaint(id, 'line-color', '#F7D87C');
    safeSetPaint(id, 'line-outline-color', '#E6C766');
  });

  ['road-trunk', 'road-primary'].forEach((id) => {
    safeSetPaint(id, 'line-color', '#FFFFFF');
    safeSetPaint(id, 'line-outline-color', '#DADADA');
  });

  ['road-secondary'].forEach((id) => {
    safeSetPaint(id, 'line-color', '#F5F5F5');
    safeSetPaint(id, 'line-outline-color', '#D6D6D6');
  });

  ['road-tertiary'].forEach((id) => {
    safeSetPaint(id, 'line-color', '#EFEFEF');
    safeSetPaint(id, 'line-outline-color', '#D0D0D0');
  });

  ['road-street', 'road-residential', 'road-minor'].forEach((id) => {
    safeSetPaint(id, 'line-color', '#FFFFFF');
    safeSetPaint(id, 'line-outline-color', '#E0E0E0');
  });

  // Railways
  ['railway', 'road-rail'].forEach((id) => {
    safeSetPaint(id, 'line-color', '#B0B0B0');
  });

  // Administrative boundaries
  ['admin-0-boundary'].forEach((id) => {
    safeSetPaint(id, 'line-color', '#9E9E9E');
  });

  ['admin-1-boundary'].forEach((id) => {
    safeSetPaint(id, 'line-color', '#C9C9C9');
  });

  // Labels (text colors & halos)
  const labelPaint = [
    ['country-label', '#202124'],
    ['state-label', '#3C4043'],
    ['settlement-major-label', '#3C4043'],
    ['settlement-minor-label', '#5F6368'],
    ['settlement-subdivision-label', '#5F6368'],
    ['road-label', '#5F6368'],
    ['road-label-small', '#5F6368'],
    ['road-label-medium', '#5F6368'],
    ['road-label-large', '#5F6368'],
    ['water-label', '#1A73E8'],
  ];

  labelPaint.forEach(([id, color]) => {
    if (!map.getLayer(id)) return;
    try {
      map.setPaintProperty(id, 'text-color', color);
      map.setPaintProperty(id, 'text-halo-color', '#FFFFFF');
      map.setPaintProperty(id, 'text-halo-width', 1.2);
    } catch {
      // ignore
    }
  });
}
