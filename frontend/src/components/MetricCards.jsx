import React from 'react';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Flame,
  Calendar,
  AlertTriangle,
  Zap,
  CheckCircle,
  HelpCircle,
  Scale
} from 'lucide-react';

export default function MetricCards({ data }) {
  if (!data) return null;

  const { summary, trend, threshold_value, units, percentile_threshold, cached } = data;
  const unitStr = units === 'fahrenheit' ? '°F' : '°C';

  const isUp = trend.percent_change_since_baseline > 0;
  const isDown = trend.percent_change_since_baseline < 0;

  return (
    <div className="space-y-4">
      {/* Executive Headline Banner */}
      <div className="bg-gradient-to-r from-orange-950/60 via-slate-900 to-slate-900 border border-orange-500/30 rounded-2xl p-5 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-64 h-full bg-gradient-to-l from-orange-500/5 to-transparent pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-orange-500/20 text-orange-300 border border-orange-500/30 flex items-center space-x-1">
                <Flame className="w-3 h-3 text-orange-400" />
                <span>Executive Climatological Insight</span>
              </span>
              {cached && (
                <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center space-x-1">
                  <Zap className="w-3 h-3 text-emerald-400" />
                  <span>Cached (Sub-10ms)</span>
                </span>
              )}
            </div>

            <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight leading-snug m-0">
              {summary.headline}
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed m-0">
              {summary.subheadline}
            </p>
          </div>

          {/* Quick Relative Change Badge */}
          <div className="flex items-center space-x-3 shrink-0">
            <div className={`p-4 rounded-xl border flex items-center space-x-3 ${
              isUp
                ? 'bg-rose-950/40 border-rose-500/40 text-rose-300'
                : isDown
                ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                : 'bg-slate-800/80 border-slate-700 text-slate-300'
            }`}>
              {isUp ? (
                <TrendingUp className="w-7 h-7 text-rose-400" />
              ) : isDown ? (
                <TrendingDown className="w-7 h-7 text-emerald-400" />
              ) : (
                <Minus className="w-7 h-7 text-slate-400" />
              )}
              <div>
                <div className="text-2xl font-black font-mono leading-none">
                  {trend.percent_change_since_baseline > 0 ? '+' : ''}
                  {trend.percent_change_since_baseline}%
                </div>
                <div className="text-[11px] font-medium opacity-80">
                  Relative Frequency Change
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Grid of 4 Core Statistical Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Metric 1: Mann-Kendall Test */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-md flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
            <span className="flex items-center space-x-1.5 font-medium">
              <Scale className="w-3.5 h-3.5 text-orange-400" />
              <span>Mann-Kendall Test</span>
            </span>
            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
              trend.is_statistically_significant
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                : 'bg-slate-800 text-slate-400'
            }`}>
              {trend.is_statistically_significant ? 'Significant (p < 0.05)' : 'Not Significant'}
            </span>
          </div>
          <div>
            <div className="text-xl font-bold font-mono text-white">
              {trend.trend_direction}
            </div>
            <div className="text-[11px] text-slate-400 mt-1 flex justify-between">
              <span>p-value: <b className="text-slate-200 font-mono">{trend.mann_kendall_p.toFixed(4)}</b></span>
              <span>τ (tau): <b className="text-slate-200 font-mono">{trend.kendall_tau > 0 ? '+' : ''}{trend.kendall_tau.toFixed(2)}</b></span>
            </div>
          </div>
        </div>

        {/* Metric 2: Longest Hazard Event */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-md flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
            <span className="flex items-center space-x-1.5 font-medium">
              <Calendar className="w-3.5 h-3.5 text-rose-400" />
              <span>Longest Event Recorded</span>
            </span>
            <span className="text-[10px] text-slate-400">Duration</span>
          </div>
          <div>
            <div className="text-xl font-bold font-mono text-white flex items-baseline space-x-1">
              <span>{summary.longest_event ? summary.longest_event.duration_days : 0}</span>
              <span className="text-sm font-normal text-slate-400">consecutive days</span>
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              {summary.longest_event ? (
                <span>
                  Started <b>{summary.longest_event.start_date}</b> • Peak <b>{summary.longest_event.peak_value}{unitStr}</b>
                </span>
              ) : (
                'None recorded'
              )}
            </div>
          </div>
        </div>

        {/* Metric 3: Threshold & Peak */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-md flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
            <span className="flex items-center space-x-1.5 font-medium">
              <Flame className="w-3.5 h-3.5 text-amber-400" />
              <span>Threshold & Peak Temp</span>
            </span>
            <span className="text-[10px] text-slate-400">{percentile_threshold}th Pctl</span>
          </div>
          <div>
            <div className="text-xl font-bold font-mono text-white flex items-baseline space-x-2">
              <span>{threshold_value}{unitStr}</span>
              <span className="text-xs font-normal text-slate-400">
                (Peak: <b className="text-orange-400">{summary.all_time_peak_value}{unitStr}</b>)
              </span>
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              Climatological baseline trigger value
            </div>
          </div>
        </div>

        {/* Metric 4: Total Events & Days */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-md flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
            <span className="flex items-center space-x-1.5 font-medium">
              <AlertTriangle className="w-3.5 h-3.5 text-cyan-400" />
              <span>Total Hazard Volume</span>
            </span>
            <span className="text-[10px] text-slate-400">{data.start_year}–{data.end_year}</span>
          </div>
          <div>
            <div className="text-xl font-bold font-mono text-white flex items-baseline space-x-1.5">
              <span>{summary.total_events}</span>
              <span className="text-xs text-slate-400 font-normal">events</span>
              <span className="text-slate-600">/</span>
              <span>{summary.total_hazard_days}</span>
              <span className="text-xs text-slate-400 font-normal">days</span>
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              Average duration: <b>{summary.average_duration_days} days</b> per event
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
