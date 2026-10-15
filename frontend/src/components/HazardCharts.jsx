import React, { useState } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Bar, Line } from 'react-chartjs-2';
import { BarChart3, LayoutGrid } from 'lucide-react';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

export default function HazardCharts({ data }) {
  const [activeTab, setActiveTab] = useState('frequency');

  if (!data || !data.annual_metrics || data.annual_metrics.length === 0) {
    return null;
  }

  const { annual_metrics, trend, units, hazard_type, threshold_value } = data;
  const unitStr = units === 'fahrenheit' ? '°F' : '°C';
  const years = annual_metrics.map((m) => m.year);

  // Clean light theme options for Chart.js
  const commonOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index',
      intersect: false,
    },
    plugins: {
      legend: {
        position: 'top',
        labels: {
          color: '#334155',
          font: { family: 'Inter', size: 11, weight: '600' },
          usePointStyle: true,
          boxWidth: 8,
        },
      },
      tooltip: {
        backgroundColor: '#ffffff',
        titleColor: '#0f172a',
        bodyColor: '#334155',
        borderColor: '#e2e8f0',
        borderWidth: 1,
        padding: 10,
        boxPadding: 4,
        usePointStyle: true,
        shadowColor: 'rgba(0,0,0,0.1)',
        shadowBlur: 10,
      },
    },
    scales: {
      x: {
        grid: { color: '#f1f5f9' },
        ticks: { color: '#64748b', font: { family: 'JetBrains Mono', size: 10 } },
      },
      y: {
        grid: { color: '#f1f5f9' },
        ticks: { color: '#64748b', font: { family: 'JetBrains Mono', size: 10 } },
      },
    },
  };

  const frequencyChartData = {
    labels: years,
    datasets: [
      {
        type: 'bar',
        label: 'Annual Event Count',
        data: annual_metrics.map((m) => m.event_count),
        backgroundColor: 'rgba(234, 88, 12, 0.75)',
        borderColor: '#ea580c',
        borderWidth: 1,
        borderRadius: 4,
        yAxisID: 'y',
      },
      {
        type: 'line',
        label: '5-Year Rolling Average',
        data: annual_metrics.map((m) => m.rolling_5y_count),
        borderColor: '#d97706',
        backgroundColor: 'rgba(217, 119, 6, 0.1)',
        borderWidth: 2.5,
        tension: 0.35,
        pointRadius: 2.5,
        pointHoverRadius: 5,
        fill: false,
        yAxisID: 'y',
      },
    ],
  };

  const durationChartData = {
    labels: years,
    datasets: [
      {
        type: 'bar',
        label: 'Total Hazard Days',
        data: annual_metrics.map((m) => m.total_hazard_days),
        backgroundColor: 'rgba(239, 68, 68, 0.7)',
        borderColor: '#dc2626',
        borderWidth: 1,
        borderRadius: 4,
      },
      {
        type: 'line',
        label: 'Max Duration (Days)',
        data: annual_metrics.map((m) => m.max_duration_days),
        borderColor: '#0284c7',
        backgroundColor: 'rgba(2, 132, 199, 0.1)',
        borderWidth: 2,
        tension: 0.3,
        pointRadius: 3,
        fill: false,
      },
    ],
  };

  const intensityChartData = {
    labels: years,
    datasets: [
      {
        type: 'line',
        label: `Mean Intensity (${unitStr}-days excess)`,
        data: annual_metrics.map((m) => m.mean_intensity),
        borderColor: '#ea580c',
        backgroundColor: 'rgba(234, 88, 12, 0.15)',
        fill: true,
        tension: 0.3,
        borderWidth: 2,
        pointRadius: 3,
      },
    ],
  };

  const temperatureChartData = {
    labels: years,
    datasets: [
      {
        type: 'line',
        label: `Annual Max Temp (${unitStr})`,
        data: annual_metrics.map((m) => m.annual_max_temp),
        borderColor: '#ef4444',
        backgroundColor: 'rgba(239, 68, 68, 0.08)',
        borderWidth: 2,
        tension: 0.25,
        pointRadius: 2.5,
      },
      {
        type: 'line',
        label: `Annual Mean Temp (${unitStr})`,
        data: annual_metrics.map((m) => m.annual_mean_temp),
        borderColor: '#059669',
        backgroundColor: 'rgba(5, 150, 105, 0.08)',
        borderWidth: 1.5,
        borderDash: [4, 4],
        tension: 0.25,
        pointRadius: 2,
      },
    ],
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-sm space-y-4">
      {/* Header with Navigation Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
        <div className="flex items-center space-x-2">
          <BarChart3 className="w-5 h-5 text-orange-600" />
          <div>
            <h3 className="text-base font-bold text-slate-900 m-0">
              Interactive Hazard Visualizations
            </h3>
            <span className="text-xs text-slate-500">
              Linear trend slope: <b className="text-orange-600 font-mono">{trend.linear_slope_per_decade > 0 ? '+' : ''}{trend.linear_slope_per_decade} events/decade</b> (R² = {trend.r_squared})
            </span>
          </div>
        </div>

        {/* Tab Controls */}
        <div className="flex flex-wrap items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs">
          <button
            onClick={() => setActiveTab('frequency')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition ${
              activeTab === 'frequency'
                ? 'bg-orange-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Frequency & 5Y Trend
          </button>
          <button
            onClick={() => setActiveTab('duration')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition ${
              activeTab === 'duration'
                ? 'bg-orange-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Duration & Days
          </button>
          <button
            onClick={() => setActiveTab('intensity')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition ${
              activeTab === 'intensity'
                ? 'bg-orange-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Excess Intensity
          </button>
          <button
            onClick={() => setActiveTab('temperature')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition ${
              activeTab === 'temperature'
                ? 'bg-orange-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Temperature Anomaly
          </button>
          <button
            onClick={() => setActiveTab('grid')}
            className={`px-2.5 py-1.5 rounded-lg font-semibold transition flex items-center space-x-1 ${
              activeTab === 'grid'
                ? 'bg-white text-orange-600 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
            title="View 2x2 Multi-Chart Grid"
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">2x2 Grid</span>
          </button>
        </div>
      </div>

      {/* Active Tab View */}
      {activeTab === 'frequency' && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Annual count of detected {hazard_type}s with 5-year centered moving average</span>
            <span className="font-mono font-semibold text-orange-700">Sen's Slope: {trend.sens_slope > 0 ? '+' : ''}{trend.sens_slope}/yr</span>
          </div>
          <div className="h-[320px] sm:h-[380px] w-full">
            <Bar data={frequencyChartData} options={commonOptions} />
          </div>
        </div>
      )}

      {activeTab === 'duration' && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Cumulative hazard days per year and maximum consecutive duration</span>
            <span className="font-mono font-semibold text-sky-700">Avg Duration: {data.summary.average_duration_days} days</span>
          </div>
          <div className="h-[320px] sm:h-[380px] w-full">
            <Bar data={durationChartData} options={commonOptions} />
          </div>
        </div>
      )}

      {activeTab === 'intensity' && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Mean cumulative temperature anomaly above {threshold_value}{unitStr} threshold</span>
            <span className="font-mono font-semibold text-orange-700">Threshold: {threshold_value}{unitStr}</span>
          </div>
          <div className="h-[320px] sm:h-[380px] w-full">
            <Line data={intensityChartData} options={commonOptions} />
          </div>
        </div>
      )}

      {activeTab === 'temperature' && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Annual peak temperature and annual mean temperature trajectory</span>
            <span className="font-mono font-semibold text-rose-700">All-Time Peak: {data.summary.all_time_peak_value}{unitStr}</span>
          </div>
          <div className="h-[320px] sm:h-[380px] w-full">
            <Line data={temperatureChartData} options={commonOptions} />
          </div>
        </div>
      )}

      {activeTab === 'grid' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-slate-50/70 p-3.5 rounded-xl border border-slate-200">
            <h4 className="text-xs font-bold text-slate-800 mb-2">1. Annual Frequency & 5Y Trend</h4>
            <div className="h-[240px]">
              <Bar data={frequencyChartData} options={commonOptions} />
            </div>
          </div>
          <div className="bg-slate-50/70 p-3.5 rounded-xl border border-slate-200">
            <h4 className="text-xs font-bold text-slate-800 mb-2">2. Duration & Total Hazard Days</h4>
            <div className="h-[240px]">
              <Bar data={durationChartData} options={commonOptions} />
            </div>
          </div>
          <div className="bg-slate-50/70 p-3.5 rounded-xl border border-slate-200">
            <h4 className="text-xs font-bold text-slate-800 mb-2">3. Excess Intensity Score</h4>
            <div className="h-[240px]">
              <Line data={intensityChartData} options={commonOptions} />
            </div>
          </div>
          <div className="bg-slate-50/70 p-3.5 rounded-xl border border-slate-200">
            <h4 className="text-xs font-bold text-slate-800 mb-2">4. Annual Peak & Mean Temperatures</h4>
            <div className="h-[240px]">
              <Line data={temperatureChartData} options={commonOptions} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
