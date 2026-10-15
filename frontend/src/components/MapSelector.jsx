import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { MapPin, Compass } from 'lucide-react';

const customIcon = L.divIcon({
  className: 'custom-map-marker',
  html: `
    <div style="
      background: #ea580c;
      width: 28px;
      height: 28px;
      border-radius: 50% 50% 50% 0;
      transform: rotate(-45deg);
      border: 2px solid #ffffff;
      box-shadow: 0 4px 10px rgba(0,0,0,0.3);
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
  isCollapsed
}) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerRef = useRef(null);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [latitude, longitude],
        zoom: 4,
        zoomControl: true,
        attributionControl: false,
      });

      // Crisp CartoDB Voyager light tile layer
      L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        maxZoom: 19,
        subdomains: 'abcd',
      }).addTo(map);

      L.control.attribution({ position: 'bottomright', prefix: false })
        .addAttribution('&copy; <a href="https://carto.com/" target="_blank">CARTO</a> &copy; <a href="https://osm.org" target="_blank">OSM</a>')
        .addTo(map);

      const marker = L.marker([latitude, longitude], {
        icon: customIcon,
        draggable: true,
      }).addTo(map);

      marker.bindPopup(`<b>${locationName || 'Selected Location'}</b><br/>${latitude.toFixed(2)}°, ${longitude.toFixed(2)}°`);

      marker.on('dragend', (e) => {
        const { lat, lng } = e.target.getLatLng();
        onSelectCoords(parseFloat(lat.toFixed(4)), parseFloat(lng.toFixed(4)));
      });

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

  useEffect(() => {
    if (mapInstanceRef.current) {
      setTimeout(() => {
        mapInstanceRef.current.invalidateSize();
      }, 200);
    }
  }, [isCollapsed]);

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
      <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
        <div className="flex items-center space-x-2">
          <Compass className="w-4 h-4 text-orange-600" />
          <h3 className="text-sm font-semibold text-slate-800 m-0">
            Geospatial Target Map
          </h3>
          <span className="text-[11px] px-2 py-0.5 rounded bg-slate-200/60 text-slate-600 border border-slate-200">
            Click map to pick coordinates
          </span>
        </div>
        <div className="flex items-center space-x-1.5 text-xs font-mono font-semibold text-orange-700 bg-orange-50 border border-orange-200 px-2.5 py-1 rounded-lg">
          <MapPin className="w-3.5 h-3.5" />
          <span>{latitude.toFixed(2)}°, {longitude.toFixed(2)}°</span>
        </div>
      </div>

      <div className="relative w-full h-[260px] sm:h-[300px] bg-slate-100">
        <div ref={mapContainerRef} className="w-full h-full" />
        <div className="absolute bottom-2 left-2 z-[400] bg-white/95 backdrop-blur-sm border border-slate-200 rounded-lg px-2.5 py-1 text-[11px] text-slate-700 pointer-events-none shadow-md">
          <span>Lat: <b>{latitude.toFixed(3)}</b> | Lon: <b>{longitude.toFixed(3)}</b></span>
        </div>
      </div>
    </div>
  );
}
