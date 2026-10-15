import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 60000,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const checkHealth = async () => {
  const response = await apiClient.get('/health');
  return response.data;
};

export const getPresets = async () => {
  const response = await apiClient.get('/presets');
  return response.data.presets;
};

export const searchLocations = async (query) => {
  if (!query || query.trim().length < 2) return [];
  const response = await apiClient.get('/locations/search', {
    params: { q: query.trim() },
  });
  return response.data;
};

export const analyzeHazard = async (params) => {
  const response = await apiClient.post('/analyze', params);
  return response.data;
};

export const downloadCSV = async (params) => {
  const response = await apiClient.post('/export/csv', params, {
    responseType: 'blob',
  });
  const url = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute(
    'download',
    `climate_hazard_${params.hazard_type}_${params.start_year}_${params.end_year}.csv`
  );
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};

export const downloadPDF = async (params) => {
  const response = await apiClient.post('/export/pdf', params, {
    responseType: 'blob',
  });
  const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute(
    'download',
    `climate_hazard_report_${params.hazard_type}_${params.start_year}_${params.end_year}.pdf`
  );
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};

export default apiClient;
