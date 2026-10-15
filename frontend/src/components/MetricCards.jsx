import React from 'react';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Flame,
  Calendar,
  AlertTriangle,
  Zap,
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
      <div className="bg-gradient-to-r from-orange-50 via-white to-amber-50 border border-orange-200 rounded-2xl p-5 sm:p-6 shadow-sm relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center space-x-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-orange-100 text-orange-800 border border-orange-200 flex items-center space-x-1">
                <Flame className="w-3 h-3 text-orange-600" />
                <span>Executive Climatological Insight</span>
              </span>
              {cached && (
                <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center space-x-1">
                  <Zap className="w-3 h-3 text-emerald-600" />
                  <span>Cached (Sub-10ms)</span>
                </span>
              )}
            </div>

            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight leading-snug m-0">
              {summary.headline}
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed m-0 font-medium">
              {summary.subheadline}
            </p>
          </div>

          {/* Quick Relative Change Badge */}
          <div className="flex items-center space-x-3 shrink-0">
            <div className={`p-4 rounded-xl border flex items-center space-x-3 shadow-sm ${
              isUp
                ? 'bg-rose-50 border-rose-200 text-rose-900'
                : isDown
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                : 'bg-slate-100 border-slate-200 text-slate-700'
            }`}>
              {isUp ? (
                <TrendingUp className="w-7 h-7 text-rose-600" />
              ) : isDown ? (
                <TrendingDown className="w-7 h-7 text-emerald-600" />
              ) : (
                <Minus className="w-7 h-7 text-slate-500" />
              )}
              <div>
                <div className="text-2xl font-black font-mono leading-none">
                  {trend.percent_change_since_baseline > 0 ? '+' : ''}
                  {trend.percent_change_since_baseline}%
                </div>
                <div className="text-[11px] font-semibold opacity-75 mt-0.5">
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
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 text-xs mb-2">
            <span className="flex items-center space-x-1.5 font-semibold text-slate-700">
              <Scale className="w-3.5 h-3.5 text-orange-600" />
              <span>Mann-Kendall Test</span>
            </span>
            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
              trend.is_statistically_significant
                ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                : 'bg-slate-100 text-slate-600'
            }`}>
              {trend.is_statistically_significant ? 'Sig. (p < 0.05)' : 'Not Significant'}
            </span>
          </div>
          <div>
            <div className="text-xl font-black font-mono text-slate-900">
              {trend.trend_direction}
            </div>
            <div className="text-[11px] text-slate-500 mt-1 flex justify-between">
              <span>p-value: <b className="text-slate-800 font-mono">{trend.mann_kendall_p.toFixed(4)}</b></span>
              <span>τ: <b className="text-slate-800 font-mono">{trend.kendall_tau > 0 ? '+' : ''}{trend.kendall_tau.toFixed(2)}</b></span>
            </div>
          </div>
        </div>

        {/* Metric 2: Longest Hazard Event */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 text-xs mb-2">
            <span className="flex items-center space-x-1.5 font-semibold text-slate-700">
              <Calendar className="w-3.5 h-3.5 text-rose-600" />
              <span>Longest Event</span>
            </span>
            <span className="text-[10px] text-slate-400 font-medium">Duration</span>
          </div>
          <div>
            <div className="text-xl font-black font-mono text-slate-900 flex items-baseline space-x-1">
              <span>{summary.longest_event ? summary.longest_event.duration_days : 0}</span>
              <span className="text-xs font-normal text-slate-500">consecutive days</span>
            </div>
            <div className="text-[11px] text-slate-500 mt-1 truncate">
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
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 text-xs mb-2">
            <span className="flex items-center space-x-1.5 font-semibold text-slate-700">
              <Flame className="w-3.5 h-3.5 text-amber-600" />
              <span>Threshold & Peak</span>
            </span>
            <span className="text-[10px] text-slate-400 font-medium">{percentile_threshold}th Pctl</span>
          </div>
          <div>
            <div className="text-xl font-black font-mono text-slate-900 flex items-baseline space-x-2">
              <span>{threshold_value}{unitStr}</span>
              <span className="text-xs font-normal text-slate-500">
                (Peak: <b className="text-orange-600">{summary.all_time_peak_value}{unitStr}</b>)
              </span>
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              Baseline trigger threshold
            </div>
          </div>
        </div>

        {/* Metric 4: Total Events & Days */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 text-xs mb-2">
            <span className="flex items-center space-x-1.5 font-semibold text-slate-700">
              <AlertTriangle className="w-3.5 h-3.5 text-blue-600" />
              <span>Total Volume</span>
            </span>
            <span className="text-[10px] text-slate-400 font-medium">{data.start_year}–{data.end_year}</span>
          </div>
          <div>
            <div className="text-xl font-black font-mono text-slate-900 flex items-baseline space-x-1.5">
              <span>{summary.total_events}</span>
              <span className="text-xs text-slate-500 font-normal">events</span>
              <span className="text-slate-300">/</span>
              <span>{summary.total_hazard_days}</span>
              <span className="text-xs text-slate-500 font-normal">days</span>
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              Average duration: <b>{summary.average_duration_days} days</b>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
