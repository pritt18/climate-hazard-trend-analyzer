import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import RegionSelector from './components/RegionSelector';
import MapSelector from './components/MapSelector';
import HazardConfig from './components/HazardConfig';
import MetricCards from './components/MetricCards';
import HazardCharts from './components/HazardCharts';
import EventsTable from './components/EventsTable';
import MethodologyModal from './components/MethodologyModal';
import {
  checkHealth,
  getPresets,
  analyzeHazard,
  downloadCSV,
  downloadPDF
} from './services/api';
import { AlertCircle, RefreshCw, Sparkles, ShieldCheck } from 'lucide-react';

export default function App() {
  // Region & Target
  const [latitude, setLatitude] = useState(33.45);
  const [longitude, setLongitude] = useState(-112.07);
  const [locationName, setLocationName] = useState('Phoenix, Arizona, USA');

  // Hazard Configuration
  const [hazardType, setHazardType] = useState('heatwave');
  const [startYear, setStartYear] = useState(1990);
  const [endYear, setEndYear] = useState(2023);
  const [percentile, setPercentile] = useState(95.0);
  const [minDays, setMinDays] = useState(3);
  const [units, setUnits] = useState('celsius');

  // Dashboard State
  const [analysisData, setAnalysisData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState(null);
  const [health, setHealth] = useState(null);
  const [presets, setPresets] = useState([]);
  const [isMethodologyOpen, setIsMethodologyOpen] = useState(false);

  // Initialize and run default analysis
  useEffect(() => {
    async function init() {
      try {
        const [h, p] = await Promise.all([
          checkHealth().catch(() => null),
          getPresets().catch(() => []),
        ]);
        if (h) setHealth(h);
        if (p && p.length > 0) setPresets(p);
      } catch (e) {
        console.warn('Init check failed:', e);
      }

      // Automatically trigger initial analysis for Phoenix, AZ
      executeAnalysis(33.45, -112.07, 'Phoenix, Arizona, USA', 'heatwave', 1990, 2023, 95.0, 3, 'celsius');
    }
    init();
  }, []);

  const executeAnalysis = async (
    lat = latitude,
    lon = longitude,
    locName = locationName,
    hzType = hazardType,
    sYear = startYear,
    eYear = endYear,
    pctl = percentile,
    mDays = minDays,
    u = units
  ) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await analyzeHazard({
        latitude: lat,
        longitude: lon,
        location_name: locName,
        hazard_type: hzType,
        start_year: sYear,
        end_year: eYear,
        percentile_threshold: pctl,
        min_duration_days: mDays,
        units: u,
      });
      setAnalysisData(result);
    } catch (err) {
      console.error('Hazard analysis error:', err);
      const msg =
        err.response?.data?.detail ||
        err.message ||
        'Failed to compute climate hazard analysis. Please check network connection.';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegionChange = (newRegion) => {
    setLatitude(newRegion.latitude);
    setLongitude(newRegion.longitude);
    setLocationName(newRegion.name);
  };

  const handleMapCoordSelect = (lat, lng) => {
    setLatitude(lat);
    setLongitude(lng);
    setLocationName(`Coordinates (${lat.toFixed(2)}°, ${lng.toFixed(2)}°)`);
  };

  const handleExportCSV = async () => {
    if (!analysisData) return;
    setIsExporting(true);
    try {
      await downloadCSV({
        latitude,
        longitude,
        location_name: locationName,
        hazard_type: hazardType,
        start_year: startYear,
        end_year: endYear,
        percentile_threshold: percentile,
        min_duration_days: minDays,
        units,
      });
    } catch (err) {
      alert('CSV export failed: ' + (err.message || 'unknown error'));
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportPDF = async () => {
    if (!analysisData) return;
    setIsExporting(true);
    try {
      await downloadPDF({
        latitude,
        longitude,
        location_name: locationName,
        hazard_type: hazardType,
        start_year: startYear,
        end_year: endYear,
        percentile_threshold: percentile,
        min_duration_days: minDays,
        units,
      });
    } catch (err) {
      alert('PDF report generation failed: ' + (err.message || 'unknown error'));
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Top Navbar */}
      <Navbar
        health={health}
        onOpenMethodology={() => setIsMethodologyOpen(true)}
        onExportCSV={handleExportCSV}
        onExportPDF={handleExportPDF}
        hasData={Boolean(analysisData)}
        isExporting={isExporting}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Layout Grid: Controls Left, Visualizations & Data Right */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Controls Column (5 cols on lg) */}
          <div className="lg:col-span-5 space-y-5">
            {/* 1. Region Selector (City Search + Presets + Lat/Lon) */}
            <RegionSelector
              latitude={latitude}
              longitude={longitude}
              locationName={locationName}
              onChangeRegion={handleRegionChange}
              presets={presets}
            />

            {/* 2. Interactive Leaflet Map (Bonus Challenge) */}
            <MapSelector
              latitude={latitude}
              longitude={longitude}
              locationName={locationName}
              onSelectCoords={handleMapCoordSelect}
            />

            {/* 3. Hazard & Time Horizon Parameters */}
            <HazardConfig
              hazardType={hazardType}
              setHazardType={setHazardType}
              startYear={startYear}
              setStartYear={setStartYear}
              endYear={endYear}
              setEndYear={setEndYear}
              percentile={percentile}
              setPercentile={setPercentile}
              minDays={minDays}
              setMinDays={setMinDays}
              units={units}
              setUnits={setUnits}
              onRunAnalysis={() =>
                executeAnalysis(
                  latitude,
                  longitude,
                  locationName,
                  hazardType,
                  startYear,
                  endYear,
                  percentile,
                  minDays,
                  units
                )
              }
              isLoading={isLoading}
            />
          </div>

          {/* Analytics & Visualization Column (7 cols on lg) */}
          <div className="lg:col-span-7 space-y-6">
            {/* Error Message */}
            {error && (
              <div className="p-4 rounded-xl bg-rose-950/50 border border-rose-500/50 text-rose-200 flex items-start space-x-3 shadow-lg">
                <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                <div className="flex-1 text-xs">
                  <div className="font-semibold text-rose-300 text-sm">Analysis Pipeline Error</div>
                  <p className="mt-1 leading-relaxed text-rose-200/90">{error}</p>
                  <button
                    onClick={() =>
                      executeAnalysis(
                        latitude,
                        longitude,
                        locationName,
                        hazardType,
                        startYear,
                        endYear,
                        percentile,
                        minDays,
                        units
                      )
                    }
                    className="mt-2.5 px-3 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-medium flex items-center space-x-1 transition"
                  >
                    <RefreshCw className="w-3.5 h-3.5 mr-1" />
                    <span>Retry Ingestion</span>
                  </button>
                </div>
              </div>
            )}

            {/* Loading Indicator */}
            {isLoading && (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center shadow-xl space-y-4">
                <div className="relative w-16 h-16 mx-auto">
                  <div className="absolute inset-0 rounded-full border-4 border-orange-500/20 animate-ping" />
                  <div className="relative w-16 h-16 rounded-full border-4 border-orange-500 border-t-transparent animate-spin" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white m-0">
                    Ingesting & Analyzing ERA5 Climate Series...
                  </h3>
                  <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                    Computing 95th percentile baseline climatology, consecutive heat clusters, linear regression slopes, and Mann-Kendall monotonic test statistics.
                  </p>
                </div>
              </div>
            )}

            {/* Analysis Content */}
            {!isLoading && analysisData && (
              <>
                {/* 1. Executive Summary & Core Metric Cards */}
                <MetricCards data={analysisData} />

                {/* 2. Interactive Chart.js Visualizations */}
                <HazardCharts data={analysisData} />

                {/* 3. Detected Events Catalog Table */}
                <EventsTable
                  events={analysisData.events}
                  units={analysisData.units}
                  hazardType={analysisData.hazard_type}
                />
              </>
            )}
          </div>
        </div>
      </main>

      {/* Methodology Scientific Overview Modal */}
      <MethodologyModal
        isOpen={isMethodologyOpen}
        onClose={() => setIsMethodologyOpen(false)}
      />

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-950 py-6 mt-12 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>Climate Hazard Trend Analyzer • ERA5 Reanalysis • Open-Meteo API</span>
          </div>
          <div className="text-slate-400 flex items-center space-x-4">
            <span>WMO ETCCDI Heatwave Standard</span>
            <span>•</span>
            <span>Mann-Kendall & Sen's Slope</span>
            <span>•</span>
            <span>MongoDB Dual-Tier Cache</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
