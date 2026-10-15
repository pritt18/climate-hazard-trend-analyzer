import React, { useState, useMemo } from 'react';
import { ArrowUpDown, ChevronLeft, ChevronRight, Calendar } from 'lucide-react';

export default function EventsTable({ events = [], units = 'celsius', hazardType = 'heatwave' }) {
  const [severityFilter, setSeverityFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState('start_date');
  const [sortOrder, setSortOrder] = useState('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 8;

  const unitStr = units === 'fahrenheit' ? '°F' : '°C';

  const filteredEvents = useMemo(() => {
    let list = [...events];
    if (severityFilter !== 'ALL') {
      list = list.filter((e) => e.severity === severityFilter);
    }
    list.sort((a, b) => {
      let valA = a[sortBy];
      let valB = b[sortBy];
      if (typeof valA === 'string') {
        return sortOrder === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }
      return sortOrder === 'asc' ? valA - valB : valB - valA;
    });
    return list;
  }, [events, severityFilter, sortBy, sortOrder]);

  const totalPages = Math.ceil(filteredEvents.length / pageSize) || 1;
  const paginatedEvents = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredEvents.slice(start, start + pageSize);
  }, [filteredEvents, currentPage]);

  const toggleSort = (col) => {
    if (sortBy === col) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(col);
      setSortOrder('desc');
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-sm space-y-4">
      {/* Header & Filter Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
        <div className="flex items-center space-x-2">
          <Calendar className="w-5 h-5 text-orange-600" />
          <div>
            <h3 className="text-base font-bold text-slate-900 m-0">
              Detected Climate Hazard Events Catalog
            </h3>
            <span className="text-xs text-slate-500">
              Showing {filteredEvents.length} of {events.length} detected events
            </span>
          </div>
        </div>

        {/* Severity Filter Tabs */}
        <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs">
          <span className="px-2 text-slate-400 font-medium hidden sm:inline">Filter:</span>
          {['ALL', 'Extreme', 'Severe', 'Moderate'].map((sev) => (
            <button
              key={sev}
              onClick={() => {
                setSeverityFilter(sev);
                setCurrentPage(1);
              }}
              className={`px-2.5 py-1 rounded-lg font-semibold transition ${
                severityFilter === sev
                  ? 'bg-orange-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {sev}
            </button>
          ))}
        </div>
      </div>

      {/* Events Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 text-slate-600 uppercase font-mono tracking-wider border-b border-slate-200">
            <tr>
              <th
                onClick={() => toggleSort('start_date')}
                className="py-3 px-3 cursor-pointer hover:text-slate-900 transition"
              >
                <div className="flex items-center space-x-1">
                  <span>Start Date</span>
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th className="py-3 px-3">End Date</th>
              <th
                onClick={() => toggleSort('duration_days')}
                className="py-3 px-3 cursor-pointer hover:text-slate-900 transition"
              >
                <div className="flex items-center space-x-1">
                  <span>Duration</span>
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th
                onClick={() => toggleSort('peak_value')}
                className="py-3 px-3 cursor-pointer hover:text-slate-900 transition"
              >
                <div className="flex items-center space-x-1">
                  <span>Peak ({unitStr})</span>
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th className="py-3 px-3">Mean ({unitStr})</th>
              <th
                onClick={() => toggleSort('intensity_score')}
                className="py-3 px-3 cursor-pointer hover:text-slate-900 transition"
              >
                <div className="flex items-center space-x-1">
                  <span>Excess Heat</span>
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th className="py-3 px-3 text-right">Severity Level</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-sans">
            {paginatedEvents.map((ev) => (
              <tr key={ev.event_id} className="hover:bg-slate-50/80 transition">
                <td className="py-3 px-3 font-mono font-semibold text-slate-800">
                  {ev.start_date}
                </td>
                <td className="py-3 px-3 font-mono text-slate-500">
                  {ev.end_date}
                </td>
                <td className="py-3 px-3 font-mono font-bold text-slate-900">
                  {ev.duration_days} days
                </td>
                <td className="py-3 px-3 font-mono font-bold text-orange-600">
                  {ev.peak_value}{unitStr}
                </td>
                <td className="py-3 px-3 font-mono text-slate-700">
                  {ev.mean_value}{unitStr}
                </td>
                <td className="py-3 px-3 font-mono text-slate-700">
                  +{ev.intensity_score}
                </td>
                <td className="py-3 px-3 text-right">
                  <span
                    className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase ${
                      ev.severity === 'Extreme'
                        ? 'bg-rose-100 text-rose-800 border border-rose-200'
                        : ev.severity === 'Severe'
                        ? 'bg-amber-100 text-amber-800 border border-amber-200'
                        : 'bg-blue-100 text-blue-800 border border-blue-200'
                    }`}
                  >
                    {ev.severity}
                  </span>
                </td>
              </tr>
            ))}
            {paginatedEvents.length === 0 && (
              <tr>
                <td colSpan="7" className="py-8 text-center text-slate-400 text-xs">
                  No climate hazard events match the current filter criteria.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-slate-100 pt-3 text-xs text-slate-500">
          <div>
            Page <b className="text-slate-800">{currentPage}</b> of <b className="text-slate-800">{totalPages}</b>
          </div>
          <div className="flex items-center space-x-1.5">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
