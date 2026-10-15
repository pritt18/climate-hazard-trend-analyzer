import React, { useState, useEffect, useRef } from 'react';
import { Search, MapPin, Globe, Loader2, Check } from 'lucide-react';
import { searchLocations } from '../services/api';

export default function RegionSelector({
  latitude,
  longitude,
  locationName,
  onChangeRegion,
  presets = []
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isOpenDropdown, setIsOpenDropdown] = useState(false);
  const dropdownRef = useRef(null);

  // Debounced geocoding search
  useEffect(() => {
    if (!searchQuery || searchQuery.trim().length < 2) {
      setSearchResults([]);
      setIsOpenDropdown(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const results = await searchLocations(searchQuery);
        setSearchResults(results);
        setIsOpenDropdown(true);
      } catch (err) {
        console.error('Search failed:', err);
      } finally {
        setIsSearching(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Click outside to dismiss dropdown
  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpenDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectSearchResult = (item) => {
    const displayName = `${item.name}${item.admin1 ? ', ' + item.admin1 : ''}, ${item.country || ''}`;
    onChangeRegion({
      name: displayName,
      latitude: parseFloat(item.latitude.toFixed(4)),
      longitude: parseFloat(item.longitude.toFixed(4)),
    });
    setSearchQuery('');
    setIsOpenDropdown(false);
  };

  const handleSelectPreset = (preset) => {
    onChangeRegion({
      name: preset.name,
      latitude: preset.latitude,
      longitude: preset.longitude,
    });
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-200 flex items-center space-x-2 m-0">
          <Globe className="w-4 h-4 text-orange-400" />
          <span>Geographic Region Selection</span>
        </h3>
        <span className="text-xs text-slate-400">Search city or select preset</span>
      </div>

      {/* Search Input with Autocomplete */}
      <div className="relative" ref={dropdownRef}>
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search any global city, state, or region..."
            className="w-full pl-9 pr-9 py-2 rounded-lg bg-slate-950 border border-slate-700/80 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-orange-500 transition"
          />
          {isSearching && (
            <Loader2 className="w-4 h-4 text-orange-400 absolute right-3 top-1/2 -translate-y-1/2 animate-spin" />
          )}
        </div>

        {/* Dropdown Results */}
        {isOpenDropdown && searchResults.length > 0 && (
          <div className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-slate-900 border border-slate-700 rounded-lg shadow-2xl max-h-60 overflow-y-auto">
            {searchResults.map((item) => (
              <button
                key={item.id}
                onClick={() => handleSelectSearchResult(item)}
                className="w-full text-left px-3.5 py-2.5 hover:bg-slate-800/80 border-b border-slate-800 last:border-none flex items-center justify-between text-xs transition"
              >
                <div>
                  <div className="font-medium text-slate-200">
                    {item.name}
                    {item.admin1 && <span className="text-slate-400">, {item.admin1}</span>}
                  </div>
                  <div className="text-[11px] text-slate-400 font-mono">
                    {item.country} • Lat: {item.latitude.toFixed(2)}°, Lon: {item.longitude.toFixed(2)}°
                  </div>
                </div>
                <MapPin className="w-3.5 h-3.5 text-orange-400 shrink-0" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Quick Presets */}
      <div>
        <label className="block text-xs font-medium text-slate-400 mb-2">
          Global Benchmark Regions:
        </label>
        <div className="flex flex-wrap gap-1.5">
          {presets.slice(0, 8).map((preset) => {
            const isSelected =
              Math.abs(preset.latitude - latitude) < 0.05 &&
              Math.abs(preset.longitude - longitude) < 0.05;
            return (
              <button
                key={preset.name}
                onClick={() => handleSelectPreset(preset)}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition flex items-center space-x-1 ${
                  isSelected
                    ? 'bg-orange-600 text-white shadow-sm'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white border border-slate-700/60'
                }`}
              >
                <span>{preset.name.split(',')[0]}</span>
                {isSelected && <Check className="w-3 h-3 ml-0.5" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Manual Lat/Lon Coordinates Inputs */}
      <div className="grid grid-cols-2 gap-3 pt-1 border-t border-slate-800">
        <div>
          <label className="block text-[11px] font-medium text-slate-400 mb-1">
            Latitude (-90° to 90°)
          </label>
          <input
            type="number"
            step="0.01"
            min="-90"
            max="90"
            value={latitude}
            onChange={(e) =>
              onChangeRegion({
                name: `Custom (${e.target.value}°, ${longitude}°)`,
                latitude: parseFloat(e.target.value) || 0,
                longitude,
              })
            }
            className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700/80 text-xs font-mono text-slate-100 focus:outline-none focus:border-orange-500"
          />
        </div>
        <div>
          <label className="block text-[11px] font-medium text-slate-400 mb-1">
            Longitude (-180° to 180°)
          </label>
          <input
            type="number"
            step="0.01"
            min="-180"
            max="180"
            value={longitude}
            onChange={(e) =>
              onChangeRegion({
                name: `Custom (${latitude}°, ${e.target.value}°)`,
                latitude,
                longitude: parseFloat(e.target.value) || 0,
              })
            }
            className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700/80 text-xs font-mono text-slate-100 focus:outline-none focus:border-orange-500"
          />
        </div>
      </div>
    </div>
  );
}
