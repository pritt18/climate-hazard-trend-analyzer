import React from 'react';
import { Flame, FileText, Download, BookOpen, Database, CheckCircle2, AlertCircle } from 'lucide-react';

export default function Navbar({
  health,
  onOpenMethodology,
  onExportCSV,
  onExportPDF,
  hasData,
  isExporting
}) {
  return (
    <header className="sticky top-0 z-50 bg-slate-900/90 backdrop-blur-md border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-orange-500/20">
            <Flame className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-lg font-bold tracking-tight text-white m-0">
                Climate Hazard Trend Analyzer
              </h1>
              <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-orange-500/10 text-orange-400 border border-orange-500/20">
                ERA5 Historical
              </span>
            </div>
            <p className="text-xs text-slate-400 hidden sm:block m-0">
              Long-term hazard frequency, intensity & statistical trend intelligence
            </p>
          </div>
        </div>

        {/* Actions & Status */}
        <div className="flex items-center space-x-2 sm:space-x-3">
          {/* Database & Health status */}
          <div className="hidden md:flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700/60 text-xs text-slate-300">
            <Database className="w-3.5 h-3.5 text-slate-400" />
            <span>NoSQL Cache:</span>
            {health?.mongodb_connected ? (
              <span className="flex items-center text-emerald-400 font-medium">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse mr-1"></span>
                MongoDB
              </span>
            ) : (
              <span className="flex items-center text-amber-400 font-medium">
                <span className="w-2 h-2 rounded-full bg-amber-400 mr-1"></span>
                In-Memory
              </span>
            )}
          </div>

          {/* Methodology Button */}
          <button
            onClick={onOpenMethodology}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition"
            title="View Climatological Methodology & Formulas"
          >
            <BookOpen className="w-3.5 h-3.5 text-orange-400" />
            <span className="hidden sm:inline">Methodology</span>
          </button>

          {/* Export Dropdown / Buttons */}
          {hasData && (
            <div className="flex items-center space-x-1.5">
              <button
                onClick={onExportCSV}
                disabled={isExporting}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition disabled:opacity-50"
                title="Download Analysis & Events CSV"
              >
                <Download className="w-3.5 h-3.5 text-emerald-400" />
                <span className="hidden sm:inline">CSV</span>
              </button>
              <button
                onClick={onExportPDF}
                disabled={isExporting}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-orange-600 hover:bg-orange-500 text-white text-xs font-medium shadow-md shadow-orange-600/20 transition disabled:opacity-50"
                title="Download Publication-Ready PDF Report"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>PDF Report</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
