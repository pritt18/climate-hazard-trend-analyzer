import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { MapPin, Navigation, Compass } from 'lucide-react';

// Fix Leaflet's default marker icon issue with bundlers
const customIcon = L.divIcon({
  className: 'custom-map-marker',
  html: `
    <div style="
      background: #f97316;
      width: 28px;
      height: 28px;
      border-radius: 50% 50% 50% 0;
      transform: rotate(-45deg);
      border: 2px solid #ffffff;
      box-shadow: 0 4px 10px rgba(0,0,0,0.5);
      display: flex;
      align-items: center;
      justify-content: center;
    ">
      <div style="
        width: 10px;
        height: 10px;
        background: #ffffff;
        border-radius: 50%;
        transform: rotate(45deg);
      "></div>
    </div>
  `,
  iconSize: [28, 28],
  iconAnchor: [14, 28],
  popupAnchor: [0, -28],
});

export default function MapSelector({
  latitude,
  longitude,
  locationName,
  onSelectCoords,
  isCollapsed,
  onToggleCollapse
}) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerRef = useRef(null);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      // Initialize Leaflet map
      const map = L.map(mapContainerRef.current, {
        center: [latitude, longitude],
        zoom: 4,
        zoomControl: true,
        attributionControl: false,
      });

      // Sleek dark CartoDB tile layer
      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        maxZoom: 19,
        subdomains: 'abcd',
      }).addTo(map);

      // Attribution small
      L.control.attribution({ position: 'bottomright', prefix: false })
        .addAttribution('&copy; <a href="https://carto.com/" target="_blank">CARTO</a> &copy; <a href="https://osm.org" target="_blank">OSM</a>')
        .addTo(map);

      // Marker
      const marker = L.marker([latitude, longitude], {
        icon: customIcon,
        draggable: true,
      }).addTo(map);

      marker.bindPopup(`<b>${locationName || 'Selected Location'}</b><br/>${latitude.toFixed(2)}°, ${longitude.toFixed(2)}°`);

      // Drag event
      marker.on('dragend', (e) => {
        const { lat, lng } = e.target.getLatLng();
        onSelectCoords(parseFloat(lat.toFixed(4)), parseFloat(lng.toFixed(4)));
      });

      // Map click event: moves marker & updates parent coordinates
      map.on('click', (e) => {
        const { lat, lng } = e.latlng;
        marker.setLatLng([lat, lng]);
        marker.bindPopup(`<b>Custom Point</b><br/>${lat.toFixed(2)}°, ${lng.toFixed(2)}°`).openPopup();
        onSelectCoords(parseFloat(lat.toFixed(4)), parseFloat(lng.toFixed(4)));
      });

      mapInstanceRef.current = map;
      markerRef.current = marker;
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Sync map center & marker when coordinates change externally (e.g. from preset or search)
  useEffect(() => {
    if (mapInstanceRef.current && markerRef.current) {
      const currentPos = markerRef.current.getLatLng();
      if (
        Math.abs(currentPos.lat - latitude) > 0.001 ||
        Math.abs(currentPos.lng - longitude) > 0.001
      ) {
        markerRef.current.setLatLng([latitude, longitude]);
        markerRef.current.bindPopup(
          `<b>${locationName || 'Selected Location'}</b><br/>${latitude.toFixed(2)}°, ${longitude.toFixed(2)}°`
        );
        mapInstanceRef.current.flyTo([latitude, longitude], 5, {
          duration: 1.2,
        });
      }
    }
  }, [latitude, longitude, locationName]);

  // Handle map resize on layout changes
  useEffect(() => {
    if (mapInstanceRef.current) {
      setTimeout(() => {
        mapInstanceRef.current.invalidateSize();
      }, 200);
    }
  }, [isCollapsed]);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg">
      <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between bg-slate-900/50">
        <div className="flex items-center space-x-2">
          <Compass className="w-4 h-4 text-orange-400" />
          <h3 className="text-sm font-semibold text-slate-200 m-0">
            Geospatial Target Map
          </h3>
          <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
            Click map to pick coordinates
          </span>
        </div>
        <div className="flex items-center space-x-2 text-xs font-mono text-orange-400 bg-orange-950/40 border border-orange-800/40 px-2.5 py-1 rounded-lg">
          <MapPin className="w-3.5 h-3.5" />
          <span>{latitude.toFixed(2)}°, {longitude.toFixed(2)}°</span>
        </div>
      </div>

      <div className="relative w-full h-[260px] sm:h-[300px] bg-slate-950">
        <div ref={mapContainerRef} className="w-full h-full" />
        <div className="absolute bottom-2 left-2 z-[400] bg-slate-900/90 backdrop-blur-sm border border-slate-700/80 rounded-lg px-2.5 py-1 text-[11px] text-slate-300 pointer-events-none shadow-md">
          <span>Lat: <b>{latitude.toFixed(3)}</b> | Lon: <b>{longitude.toFixed(3)}</b></span>
        </div>
      </div>
    </div>
  );
}
