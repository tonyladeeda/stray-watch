import React, { useEffect } from 'react';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet.heat';
import 'leaflet/dist/leaflet.css';

// 1. Create a helper component that hooks into the Leaflet map instance
function HeatmapLayer({ points }) {
  const map = useMap();

  useEffect(() => {
    if (!points || points.length === 0) return;

    // Create the heatmap layer with custom styling
    const heat = L.heatLayer(points, {
      radius: 25,
      blur: 15,
      maxZoom: 13,
      gradient: { 
        0.4: 'blue', 
        0.6: 'cyan', 
        0.7: 'lime', 
        0.8: 'yellow', 
        1.0: 'red' 
      } // Hotter colors (red) for clusters
    }).addTo(map);

    // Cleanup when component unmounts or data changes
    return () => {
      map.removeLayer(heat);
    };
  }, [map, points]);

  return null;
}

// 2. Export the main Map Widget
export default function MapWidget({ sightings }) {
  // Center map on Los Angeles by default
  const defaultCenter = [34.0522, -118.2437];

  // Filter out sightings that don't have GPS coordinates yet
  // Format needed for heatmap: [latitude, longitude, intensity]
  const heatPoints = sightings
    .filter(s => s.latitude && s.longitude)
    .map(s => [s.latitude, s.longitude, 1.0]);

  return (
    <div className="rounded-xl overflow-hidden shadow-sm border border-slate-100 relative z-0">
      <MapContainer 
        center={defaultCenter} 
        zoom={11} 
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