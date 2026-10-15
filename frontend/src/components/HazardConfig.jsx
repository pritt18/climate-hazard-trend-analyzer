import React from 'react';
import { Flame, CloudRain, Sun, Play, Settings2, Calendar, Thermometer } from 'lucide-react';

export default function HazardConfig({
  hazardType,
  setHazardType,
  startYear,
  setStartYear,
  endYear,
  setEndYear,
  percentile,
  setPercentile,
  minDays,
  setMinDays,
  units,
  setUnits,
  onRunAnalysis,
  isLoading
}) {
  const currentYear = 2023;

  const handlePresetYears = (s, e) => {
    setStartYear(s);
    setEndYear(e);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-200 flex items-center space-x-2 m-0">
          <Settings2 className="w-4 h-4 text-orange-400" />
          <span>Hazard & Parameters Configuration</span>
        </h3>
        <span className="text-xs text-orange-400 font-medium">Default: Heatwave (95th Pctl)</span>
      </div>

      {/* Hazard Type Selector */}
      <div>
        <label className="block text-xs font-medium text-slate-400 mb-1.5">
          Climate Hazard Type
        </label>
        <div className="grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => setHazardType('heatwave')}
            className={`flex flex-col items-center justify-center py-2.5 px-2 rounded-lg border text-xs font-medium transition ${
              hazardType === 'heatwave'
                ? 'bg-gradient-to-b from-orange-500/20 to-orange-600/30 border-orange-500 text-white shadow-md shadow-orange-500/10'
                : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
            }`}
          >
            <Flame className={`w-4 h-4 mb-1 ${hazardType === 'heatwave' ? 'text-orange-400' : 'text-slate-500'}`} />
            <span>Heatwave</span>
            <span className="text-[10px] text-slate-400">Default (P95, ≥3d)</span>
          </button>

          <button
            type="button"
            onClick={() => setHazardType('drought')}
            className={`flex flex-col items-center justify-center py-2.5 px-2 rounded-lg border text-xs font-medium transition ${
              hazardType === 'drought'
                ? 'bg-gradient-to-b from-amber-500/20 to-amber-600/30 border-amber-500 text-white shadow-md shadow-amber-500/10'
                : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
            }`}
          >
            <Sun className={`w-4 h-4 mb-1 ${hazardType === 'drought' ? 'text-amber-400' : 'text-slate-500'}`} />
            <span>Dry Spells</span>
            <span className="text-[10px] text-slate-400">Drought (≥14d)</span>
          </button>

          <button
            type="button"
            onClick={() => setHazardType('heavy_rainfall')}
            className={`flex flex-col items-center justify-center py-2.5 px-2 rounded-lg border text-xs font-medium transition ${
              hazardType === 'heavy_rainfall'
                ? 'bg-gradient-to-b from-blue-500/20 to-blue-600/30 border-blue-500 text-white shadow-md shadow-blue-500/10'
                : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
            }`}
          >
            <CloudRain className={`w-4 h-4 mb-1 ${hazardType === 'heavy_rainfall' ? 'text-blue-400' : 'text-slate-500'}`} />
            <span>Heavy Rain</span>
            <span className="text-[10px] text-slate-400">Extreme P95</span>
          </button>
        </div>
      </div>

      {/* Time Range Selector */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-xs font-medium text-slate-400 flex items-center space-x-1.5">
            <Calendar className="w-3.5 h-3.5" />
            <span>Time Range: {startYear} – {endYear} ({endYear - startYear + 1} Years)</span>
          </label>
          <div className="flex items-center space-x-1 text-[11px]">
            <button
              type="button"
              onClick={() => handlePresetYears(1990, 2023)}
              className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
            >
              1990–2023
            </button>
            <button
              type="button"
              onClick={() => handlePresetYears(1990, 2020)}
              className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
            >
              1990–2020
            </button>
            <button
              type="button"
              onClick={() => handlePresetYears(1980, 2023)}
              className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
            >
              1980–2023
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <span className="text-[10px] text-slate-500 block mb-0.5">Start Year</span>
            <input
              type="number"
              min="1940"
              max={endYear - 4}
              value={startYear}
              onChange={(e) => setStartYear(parseInt(e.target.value) || 1990)}
              className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700/80 text-xs font-mono text-slate-100 focus:outline-none focus:border-orange-500"
            />
          </div>
          <div>
            <span className="text-[10px] text-slate-500 block mb-0.5">End Year</span>
            <input
              type="number"
              min={startYear + 4}
              max="2024"
              value={endYear}
              onChange={(e) => setEndYear(parseInt(e.target.value) || currentYear)}
              className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700/80 text-xs font-mono text-slate-100 focus:outline-none focus:border-orange-500"
            />
          </div>
        </div>
      </div>

      {/* Percentile Threshold & Consecutive Days */}
      <div className="grid grid-cols-2 gap-3 pt-1 border-t border-slate-800">
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-[11px] font-medium text-slate-400">
              Percentile Threshold
            </label>
            <span className="text-xs font-mono font-semibold text-orange-400">{percentile}th</span>
          </div>
          <input
            type="range"
            min="80"
            max="99"
            step="1"
            value={percentile}
            onChange={(e) => setPercentile(parseFloat(e.target.value))}
            className="w-full accent-orange-500 cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-slate-500">
            <span>80%</span>
            <span>95% (WMO)</span>
            <span>99%</span>
          </div>
        </div>

        <div>
          <label className="block text-[11px] font-medium text-slate-400 mb-1">
            Min Duration (Days)
          </label>
          <input
            type="number"
            min="1"
            max="15"
            value={minDays}
            onChange={(e) => setMinDays(parseInt(e.target.value) || 3)}
            className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700/80 text-xs font-mono text-slate-100 focus:outline-none focus:border-orange-500"
          />
          <span className="text-[10px] text-slate-500">WMO Standard: ≥3 days</span>
        </div>
      </div>

      {/* Units Toggle */}
      <div className="flex items-center justify-between pt-1 border-t border-slate-800 text-xs">
        <span className="text-slate-400 flex items-center space-x-1.5">
          <Thermometer className="w-3.5 h-3.5" />
          <span>Temperature Scale:</span>
        </span>
        <div className="flex items-center bg-slate-950 p-1 rounded-lg border border-slate-800">
          <button
            type="button"
            onClick={() => setUnits('celsius')}
            className={`px-3 py-1 rounded text-xs font-medium transition ${
              units === 'celsius'
                ? 'bg-orange-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Celsius (°C)
          </button>
          <button
            type="button"
            onClick={() => setUnits('fahrenheit')}
            className={`px-3 py-1 rounded text-xs font-medium transition ${
              units === 'fahrenheit'
                ? 'bg-orange-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Fahrenheit (°F)
          </button>
        </div>
      </div>

      {/* Run Analysis Action Button */}
      <button
        type="button"
        onClick={onRunAnalysis}
        disabled={isLoading}
        className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white font-semibold text-sm shadow-lg shadow-orange-600/25 flex items-center justify-center space-x-2 transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
      >
        {isLoading ? (
          <>
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            <span>Processing ERA5 Climatology...</span>
          </>
        ) : (
          <>
            <Play className="w-4 h-4 fill-white" />
            <span>Analyze Climate Hazard Trends</span>
          </>
        )}
      </button>
    </div>
  );
}
