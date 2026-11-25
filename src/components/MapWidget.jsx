import React, { useEffect } from 'react';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet.heat';
import 'leaflet/dist/leaflet.css';

function HeatmapLayer({ points }) {
  const map = useMap();

  useEffect(() => {
    if (!points || points.length === 0) return;

    const heat = L.heatLayer(points, {
      radius: 25,
      blur: 15,
      maxZoom: 13,
      gradient: {
        0.3: '#692F64',
        0.55: '#E88B44',
        0.8: '#F59E0B',
        1.0: '#E11D48',
      },
    }).addTo(map);

    return () => {
      map.removeLayer(heat);
    };
  }, [map, points]);

  return null;
}

export default function MapWidget({ sightings = [] }) {
  // Default center covering Greater Southern California (LA, OC, IE, SD corridor)
  const defaultCenter = [33.8358, -117.9143];

  const heatPoints = (sightings || [])
    .filter((s) => s.latitude && s.longitude)
    .map((s) => [s.latitude, s.longitude, 1.0]);

  return (
    <div className="rounded-xl overflow-hidden shadow-sm border border-socal-sand-border relative z-0">
      <MapContainer
        center={defaultCenter}
        zoom={9}
        style={{ height: '350px', width: '100%', zIndex: 0 }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <HeatmapLayer points={heatPoints} />
      </MapContainer>
    </div>
  );
}