import React from 'react';
import { X, BookOpen, CheckCircle, Scale, Database, Flame, Info } from 'lucide-react';

export default function MethodologyModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-3xl bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-6 sm:p-8 space-y-6 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-400">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white m-0">
                Climatological Methodology & Scientific Framework
              </h2>
              <p className="text-xs text-slate-400 m-0">
                WMO standards, non-parametric trend detection, and ERA5 data handling
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Sections */}
        <div className="space-y-5 text-xs text-slate-300 leading-relaxed">
          {/* Section 1: Heatwave Definition */}
          <div className="bg-slate-950/70 p-4 rounded-xl border border-slate-800 space-y-2">
            <h3 className="text-sm font-semibold text-orange-400 flex items-center space-x-1.5 m-0">
              <Flame className="w-4 h-4" />
              <span>1. Percentile-Based Heatwave Detection (WMO/IPCC Standard)</span>
            </h3>
            <p>
              Climate vulnerability is local. A 35°C temperature represents an extreme crisis in London, but a routine summer day in Phoenix or Cairo. 
              Therefore, absolute fixed thresholds fail to reflect regional hazards.
            </p>
            <p>
              This platform adheres to the <b>World Meteorological Organization (WMO)</b> and <b>IPCC Expert Team on Climate Change Detection and Indices (ETCCDI)</b> guidelines:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-slate-400">
              <li>
                <b>Threshold (P95):</b> The 95th percentile of daily maximum 2-meter air temperature (Tmax) computed across the historical baseline climatology.
              </li>
              <li>
                <b>Clustering Criteria:</b> An event is triggered when Tmax &ge; P95 for at least <b>3 consecutive days</b>.
              </li>
              <li>
                <b>Cumulative Heat Excess (Intensity):</b> Sum of degree anomalies above the threshold: &Sigma;(Tmax - P95), measuring the total biological and infrastructural heat burden.
              </li>
            </ul>
          </div>

          {/* Section 2: Statistical Rigor (Mann-Kendall & Sen's Slope) */}
          <div className="bg-slate-950/70 p-4 rounded-xl border border-slate-800 space-y-2">
            <h3 className="text-sm font-semibold text-orange-400 flex items-center space-x-1.5 m-0">
              <Scale className="w-4 h-4" />
              <span>2. Statistical Trend Rigor: Mann-Kendall & Sen's Slope</span>
            </h3>
            <p>
              Weather time series are subject to high interannual variability (e.g. ENSO cycles) and often deviate from Gaussian normality. 
              Ordinary Least Squares (OLS) regression alone can be skewed by individual extreme outlier years.
            </p>
            <p>
              We implement the non-parametric <b>Mann-Kendall Monotonic Trend Test</b> and <b>Sen's Slope Estimator</b>:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-slate-400">
              <li>
                <b>S-Statistic:</b> Counts pairwise directional concordance S = &Sigma; sgn(x_j - x_k) with variance tie corrections.
              </li>
              <li>
                <b>Statistical Significance:</b> Standardized Z-score and two-tailed p-value. Trends are confirmed statistically significant if p &lt; 0.05 (95% confidence).
              </li>
              <li>
                <b>Sen's Slope:</b> The median of all slopes between pairs of years, providing a robust trend estimate impervious to single outlier years.
              </li>
            </ul>
          </div>

          {/* Section 3: Data Ingestion & Caching Architecture */}
          <div className="bg-slate-950/70 p-4 rounded-xl border border-slate-800 space-y-2">
            <h3 className="text-sm font-semibold text-orange-400 flex items-center space-x-1.5 m-0">
              <Database className="w-4 h-4" />
              <span>3. Data Ingestion, Cleaning & NoSQL Caching</span>
            </h3>
            <ul className="list-disc pl-5 space-y-1 text-slate-400">
              <li>
                <b>Data Source:</b> European Centre for Medium-Range Weather Forecasts (ECMWF) <b>ERA5 Atmospheric Reanalysis</b> via the Open-Meteo Historical Archive API (0.25° spatial grid, 1940–present).
              </li>
              <li>
                <b>Data Cleaning & Imputation:</b> Linear interpolation and bidirectional fills ensure temporal continuity without artificial step jumps. Unphysical artifacts (T &gt; 65°C or &lt; -90°C) are quarantined.
              </li>
              <li>
                <b>Dual-Tier NoSQL Caching:</b> Raw meteorological series and computed hazard metrics are indexed and stored in MongoDB with 30-day TTLs. Sub-millisecond (sub-10ms) responses on repeated queries prevent API hammering and honor rate limits.
              </li>
            </ul>
          </div>

          {/* Section 4: Assumptions & Scope */}
          <div className="p-3 bg-orange-950/20 border border-orange-500/20 rounded-xl space-y-1 text-slate-400">
            <div className="flex items-center space-x-1 text-orange-300 font-semibold">
              <Info className="w-3.5 h-3.5" />
              <span>Assumptions & Caveats</span>
            </div>
            <p>
              Reanalysis datasets assimilate satellite, weather balloon, and surface station observations. Microclimatic Urban Heat Island (UHI) effects may exhibit localized variations within individual city neighborhoods beyond the 0.25° grid resolution.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end border-t border-slate-800 pt-4">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-medium text-xs transition"
          >
            Close Scientific Overview
          </button>
        </div>
      </div>
    </div>
  );
}
