# Climate Hazard Trend Analyzer

[![Python](https://img.shields.io/badge/Python-3.11+-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.110+-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3.4+-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![MongoDB](https://img.shields.io/badge/MongoDB-7.0+-47A248?style=for-the-badge&logo=mongodb&logoColor=white)](https://mongodb.com)
[![Leaflet](https://img.shields.io/badge/Leaflet-1.9+-199900?style=for-the-badge&logo=leaflet&logoColor=white)](https://leafletjs.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](https://opensource.org/licenses/MIT)

A full-stack geospatial climate intelligence platform designed to ingest historical weather observations, detect multi-decadal trends in climate hazards (heatwaves, droughts, and extreme rainfall events), and quantify statistical significance through non-parametric time series analytics.

---

## Table of Contents
1. [Key Features](#key-features)
2. [System Architecture](#system-architecture)
3. [Climate Hazard Detection Logic](#climate-hazard-detection-logic)
4. [Statistical Trend Analysis Methodology](#statistical-trend-analysis-methodology)
5. [Data Ingestion, Cleaning & NoSQL Caching](#data-ingestion-cleaning--nosql-caching)
6. [Tech Stack](#tech-stack)
7. [Getting Started](#getting-started)
   - [Prerequisites](#prerequisites)
   - [Local Development Setup](#local-development-setup)
   - [Running with Docker Compose](#running-with-docker-compose)
   - [Running the Test Suite](#running-the-test-suite)
8. [API Documentation](#api-documentation)
9. [Export Capabilities (PDF & CSV)](#export-capabilities-pdf--csv)
10. [Assumptions & Scientific Scope](#assumptions--scientific-scope)
11. [AI Tools Transparency Statement](#ai-tools-transparency-statement)
12. [Future Roadmap](#future-roadmap)

---

## Key Features

- **Domain-Specific Heatwave Detection:** Implements World Meteorological Organization (WMO) and IPCC ETCCDI standards—evaluating the 95th percentile baseline climatology with 3+ consecutive day clustering and cumulative heat excess calculation.
- **Interactive Geospatial Map UI:** Interactive Leaflet map with click-to-pinpoint coordinate selection, drag-and-drop targeting, and instant fly-to navigation.
- **Statistical Significance Engine:**
  - Ordinary Least Squares (OLS) Linear Regression (slope per year, slope per decade, $R^2$, and $p$-value).
  - Non-Parametric Mann-Kendall Monotonic Trend Test with tie corrections ($S$, $\text{Var}(S)$, $Z$, and two-tailed $p$-value).
  - Sen's Non-Parametric Median Slope Estimator (resilient against outlier years).
  - 5-Year Centered Rolling Averages to filter out ENSO (El Niño / La Niña) multi-year oscillations.
- **Dual-Tier NoSQL Database Caching:**
  - Tier 1: MongoDB persistent collections for raw weather series and computed hazard metrics with 30-day TTL indexes.
  - Tier 2: Resilient in-memory LRU fallback ensuring high availability even if MongoDB is offline.
  - Sub-10ms response times for repeated queries.
- **Publication-Ready Export Engine:**
  - Download comprehensive CSV data logs with annual aggregations and detected events.
  - Generate automated PDF assessment reports formatted with executive summaries, metrics matrices, and statistical tables via ReportLab.
- **Multi-Hazard Architecture:** Primary focus on Heatwaves, modularly extensible to Meteorological Dry Spells (Droughts) and Extreme Precipitation (Heavy Rainfall).

---

## System Architecture

```
┌────────────────────────────────────────────────────────────────────────┐
│                          REACT 19 FRONTEND                             │
│  - Interactive Leaflet Map (Click-to-Pinpoint Geospatial Target)       │
│  - Chart.js Visualizations (Frequency, Duration, Intensity, Anomaly)   │
│  - Geocoding Search & Benchmark Preset Selectors                       │
│  - Detected Hazard Events Catalog (Sorting, Filter, Pagination)        │
└───────────────────────────────────▲────────────────────────────────────┘
                                    │ HTTP / REST (Axios)
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                         FASTAPI BACKEND                                │
│  - Route Handlers & Input Sanitization (Pydantic v2 Models)           │
│  - Rate Limiting (SlowAPI: 60 req/min)                                 │
│  - CORS & Async Non-blocking Request Lifecycle                         │
└───────┬───────────────────────────┬────────────────────────────┬───────┘
        │                           │                            │
        ▼                           ▼                            ▼
┌─────────────────┐       ┌─────────────────┐          ┌─────────────────┐
│ WEATHER CLIENT  │       │ HAZARD DETECTOR │          │ TREND ANALYZER  │
│ - Open-Meteo    │       │ - WMO P95 Logic │          │ - Mann-Kendall  │
│   ERA5 Archive  │       │ - Consecutive   │          │ - Sen's Slope   │
│ - Retry/Backoff │       │   Clustering    │          │ - OLS Linear    │
│ - Gap Imputation│       │ - Heat Excess   │          │   Regression    │
└───────┬─────────┘       └─────────────────┘          └─────────────────┘
        │
        ▼
┌────────────────────────────────────────────────────────────────────────┐
│                   DUAL-TIER NoSQL CACHE ENGINE                         │
│  Primary: MongoDB NoSQL Store (Indexed by coordinate hash + TTL)       │
│  Fallback: In-Memory Resilient Cache (Zero-configuration fallback)     │
└────────────────────────────────────────────────────────────────────────┘
```

---

## Climate Hazard Detection Logic

### 1. Climatological Baseline ($P_{95}$)
Climate vulnerability is inherently regional. An absolute 35°C temperature constitutes a health emergency in London or Oslo, but a routine summer day in Phoenix or Cairo. Following WMO guidelines, the baseline threshold ($P_{95}$) is calculated from the empirical distribution of daily maximum temperatures ($T_{\text{max}}$) over the selected historical period:

$$P_{95} = \text{percentile}\left(T_{\text{max}}, 95\right)$$

### 2. Event Clustering Criteria
An individual **Heatwave Event** is flagged when daily maximum temperatures equal or exceed the 95th percentile threshold for at least 3 consecutive days:

$$\text{Event} = \left\{ t \in [t_{\text{start}}, t_{\text{end}}] \;\middle|\; T_{\text{max}}(t) \ge P_{95} \land (t_{\text{end}} - t_{\text{start}} + 1) \ge 3 \right\}$$

### 3. Hazard Intensity (Cumulative Heat Excess)
Beyond duration, biological strain depends on cumulative excess heat. The platform calculates the **Heatwave Magnitude Index / Cumulative Degree Days**:

$$\text{Intensity} = \sum_{t=t_{\text{start}}}^{t_{\text{end}}} \left( T_{\text{max}}(t) - P_{95} \right)$$

### 4. Severity Classification
- **Moderate:** 3 to 4 consecutive days with $T_{\text{max}} \ge P_{95}$.
- **Severe:** 5 to 7 consecutive days.
- **Extreme:** 8+ consecutive days OR peak temperature $\ge 98\text{th}$ percentile ($P_{98}$).

---

## Statistical Trend Analysis Methodology

Climate time series frequently exhibit high interannual variance and non-normal distributions due to macro-climatic patterns (such as ENSO and PDO). Relying exclusively on linear regression can produce misleading conclusions. This platform deploys a dual-method statistical approach:

### 1. Mann-Kendall Monotonic Trend Test
A non-parametric test assessing whether there is a monotonic upward or downward trend over time without assuming normal distribution:

$$S = \sum_{k=1}^{n-1} \sum_{j=k+1}^n \text{sgn}\left(x_j - x_k\right)$$

Where:
$$\text{sgn}(\theta) = \begin{cases} +1 & \text{if } \theta > 0 \\ 0 & \text{if } \theta = 0 \\ -1 & \text{if } \theta < 0 \end{cases}$$

Variance of $S$ with tie adjustments:
$$\text{Var}(S) = \frac{n(n-1)(2n+5) - \sum_{i=1}^m t_i(t_i-1)(2t_i+5)}{18}$$

Standardized test statistic $Z$:
$$Z = \begin{cases} \frac{S-1}{\sqrt{\text{Var}(S)}} & \text{if } S > 0 \\ 0 & \text{if } S = 0 \\ \frac{S+1}{\sqrt{\text{Var}(S)}} & \text{if } S < 0 \end{cases}$$

A two-tailed $p$-value is derived using the cumulative standard normal distribution $\Phi(|Z|)$. Trends are classified as statistically significant at $\alpha = 0.05$ ($p < 0.05$).

### 2. Sen's Slope Estimator
The robust non-parametric slope is calculated as the median of all pairwise slopes:

$$\beta_{\text{Sen}} = \text{median}\left( \frac{x_j - x_k}{j - k} \right), \quad \forall \; 1 \le k < j \le n$$

### 3. Relative Change (%)
Compares the average annual frequency between the baseline decade and the most recent period:

$$\Delta\% = \frac{\bar{Y}_{\text{recent}} - \bar{Y}_{\text{baseline}}}{\max(\bar{Y}_{\text{baseline}}, 0.05)} \times 100\%$$

---

## Data Ingestion, Cleaning & NoSQL Caching

### 1. Data Source
Historical daily reanalysis data is ingested from the **European Centre for Medium-Range Weather Forecasts (ECMWF) ERA5 Atmospheric Reanalysis** via the Open-Meteo Historical Archive API (0.25° spatial grid, spanning from 1940 to present).

### 2. Real-World Data Cleaning Pipeline
- **Temporal Alignment:** Verifies continuous daily chronological sequences; detects and indexes leap years.
- **Missing Data Imputation:** In the presence of sensor dropouts or API null values, linear interpolation with bidirectional filling (`bfill` + `ffill`) is applied to avoid artificial step functions.
- **Physical Boundary Validation:** Discards and clamps physically impossible sensor artifacts ($T_{\text{max}} > 65^\circ\text{C}$ or $T_{\text{max}} < -90^\circ\text{C}$, precipitation $< 0\text{mm}$).
- **Spatial Precision Snapping:** Coordinates are rounded to 2 decimal places (~1.1 km) to optimize spatial cache hits while preserving meteorological accuracy.

### 3. NoSQL Caching Architecture
- **MongoDB NoSQL Store:** Stores raw weather time series (`raw_weather` collection) and computed hazard aggregations (`hazard_analysis` collection).
- **Sub-10ms Latency:** Repeat queries for identical coordinates and date ranges return in under 10ms from the local MongoDB instance.
- **Automatic Fallback:** If MongoDB is unreachable, the system automatically transitions to an in-memory cache, ensuring zero downtime.

---

## Tech Stack

### Backend
- **Python 3.11+**
- **FastAPI:** High-performance async web framework with automatic OpenAPI documentation.
- **Pydantic v2:** Strict schema validation and data sanitization.
- **Pandas & NumPy:** Vectorized climatological series operations and percentiles.
- **SciPy:** Statistical distributions, linear regression, and Mann-Kendall calculations.
- **Motor & PyMongo:** Async MongoDB client driver.
- **SlowAPI:** Rate-limiting middleware (60 req/min).
- **ReportLab:** Generation of publication-quality PDF assessment reports.
- **PyTest:** Unit and integration test suite.

### Frontend
- **React 19 & Vite 8:** Fast modern frontend framework and bundler.
- **Tailwind CSS 3.4:** Responsive UI styling with custom climate hazard palette.
- **Leaflet & OpenStreetMap / CartoDB:** Interactive geospatial coordinate selection map.
- **Chart.js & React-Chartjs-2:** Interactive time-series line, bar, and rolling-trend charts.
- **Lucide React:** Modern UI iconography.
- **Axios:** REST client with automatic blob streaming for exports.

---

## Getting Started

### Prerequisites
- **Python:** 3.11 or higher
- **Node.js:** 18 or higher (v20+ recommended)
- **MongoDB:** (Optional) Running on port `27017` (in-memory fallback is automatically used if MongoDB is not running)

### Local Development Setup

#### 1. Clone the repository
```bash
git clone https://github.com/pritt18/climate-hazard-trend-analyzer.git
cd climate-hazard-trend-analyzer
```

#### 2. Backend Setup
```bash
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# Windows:
.\venv\Scripts\activate
# Linux/macOS:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Create .env from template
cp .env.example .env

# Run FastAPI development server
python run.py
```
The backend API is now running at `http://127.0.0.1:8000`. Interactive Swagger UI is accessible at `http://127.0.0.1:8000/docs`.

#### 3. Frontend Setup
In a new terminal window:
```bash
cd frontend

# Install npm dependencies
npm install

# Start Vite development server
npm run dev
```
The frontend is now accessible at `http://localhost:5173`.

---

### Running with Docker Compose

To launch the full stack (FastAPI Backend, React Frontend, and MongoDB) with a single command:

```bash
docker compose up --build
```
- **Frontend Dashboard:** `http://localhost:3000`
- **Backend API:** `http://localhost:8000`
- **Interactive Swagger Docs:** `http://localhost:8000/docs`
- **MongoDB:** `localhost:27017`

---

### Running the Test Suite

The backend includes a comprehensive automated test suite covering API contracts, climate percentile logic, and the Mann-Kendall implementation:

```bash
cd backend
.\venv\Scripts\pytest tests -v
```

Expected output:
```text
backend/tests/test_api.py::test_health_endpoint PASSED                   [ 12%]
backend/tests/test_api.py::test_presets_endpoint PASSED                  [ 25%]
backend/tests/test_api.py::test_invalid_request_validation PASSED        [ 37%]
backend/tests/test_hazard_detector.py::test_detect_heatwaves PASSED      [ 50%]
backend/tests/test_hazard_detector.py::test_heatwave_units_conversion PASSED [ 62%]
backend/tests/test_trend_analyzer.py::test_mann_kendall_monotonic_upward PASSED [ 75%]
backend/tests/test_trend_analyzer.py::test_mann_kendall_flat PASSED      [ 87%]
backend/tests/test_trend_analyzer.py::test_trend_analysis_pipeline PASSED [100%]
======================== 8 passed in 2.1s ========================
```

---

## API Documentation

### Key Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | System health check and MongoDB connection status. |
| `GET` | `/api/presets` | List of global benchmark cities with pre-set coordinates. |
| `GET` | `/api/locations/search?q={query}` | Autocomplete geocoding search powered by Open-Meteo. |
| `POST` | `/api/analyze` | Main endpoint: Computes hazard detection and statistical trends. |
| `POST` | `/api/export/csv` | Generates and downloads a structured CSV data report. |
| `POST` | `/api/export/pdf` | Generates and downloads a styled PDF executive assessment. |

#### Sample Request (`POST /api/analyze`)
```json
{
  "latitude": 33.45,
  "longitude": -112.07,
  "location_name": "Phoenix, Arizona, USA",
  "hazard_type": "heatwave",
  "start_year": 1990,
  "end_year": 2023,
  "percentile_threshold": 95.0,
  "min_duration_days": 3,
  "units": "celsius"
}
```

#### Sample Response (`200 OK`)
```json
{
  "location_name": "Phoenix, Arizona, USA",
  "latitude": 33.45,
  "longitude": -112.07,
  "hazard_type": "heatwave",
  "start_year": 1990,
  "end_year": 2023,
  "percentile_threshold": 95.0,
  "threshold_value": 42.8,
  "units": "celsius",
  "summary": {
    "headline": "Heatwaves have increased by 73.7% in this region since 1990.",
    "subheadline": "Averaged 1.9 events/yr (1990–1999) vs 3.3 events/yr (2014–2023); trend is not statistically significant (p = 0.062).",
    "total_events": 85,
    "total_hazard_days": 468,
    "average_duration_days": 5.5,
    "all_time_peak_value": 49.2,
    "threshold_value": 42.8,
    "longest_event": {
      "event_id": "hw_2023_a9b1c2d3",
      "year": 2023,
      "start_date": "2023-07-08",
      "end_date": "2023-07-31",
      "duration_days": 24,
      "peak_value": 48.9,
      "mean_value": 46.1,
      "intensity_score": 79.2,
      "severity": "Extreme"
    }
  },
  "trend": {
    "linear_slope_per_decade": 0.455,
    "linear_slope_per_year": 0.0455,
    "linear_intercept": -88.1,
    "r_squared": 0.1042,
    "linear_p_value": 0.0625,
    "mann_kendall_s": 142.0,
    "mann_kendall_var_s": 5780.0,
    "mann_kendall_z": 1.868,
    "mann_kendall_p": 0.0617,
    "kendall_tau": 0.253,
    "sens_slope": 0.0455,
    "trend_direction": "No Significant Trend",
    "is_statistically_significant": false,
    "percent_change_since_baseline": 73.7,
    "baseline_period_label": "1990–1999",
    "recent_period_label": "2014–2023",
    "baseline_annual_mean": 1.9,
    "recent_annual_mean": 3.3
  },
  "cached": true,
  "created_at": "2026-10-15T21:43:00Z"
}
```

---

## Export Capabilities (PDF & CSV)

The platform includes two export formats:
1. **CSV Export:** Contains metadata headers, full annual time series (event counts, cumulative hazard days, max durations, 5-year rolling counts), and an itemized catalog of every detected individual event.
2. **Executive PDF Report:** Built with ReportLab, formatting:
   - Location metadata and geographic coordinates
   - Key Takeaways callout box
   - Summary indicators table
   - Statistical rigor matrix (Linear Slope, $R^2$, Mann-Kendall $Z$, $p$-value, Kendall's $\tau$, Sen's Slope)
   - Top 5 longest and most severe hazard events on record

---

## Assumptions & Scientific Scope

1. **Reanalysis vs In-Situ Weather Stations:** ERA5 data assimilates satellite observations, numerical models, and surface sensors on a 0.25° grid (~28 km). Microclimatic phenomena—such as hyper-localized Urban Heat Island (UHI) canyons—may vary from grid-cell averages.
2. **Climatological Baseline Choice:** Percentiles are derived from the requested time horizon (e.g. 1990–2023). In standard meteorological practice, fixed 30-year reference normals (e.g. 1961–1990 or 1991–2020) are commonly employed; our architecture allows flexible customized baseline windows.
3. **Statistical Significance Criteria:** Statistical significance is determined using a standard 95% confidence interval ($\alpha = 0.05$). Trends with $p \ge 0.05$ are transparently reported as non-significant, preventing misleading conclusions from raw percentage changes alone.

---

## AI Tools Transparency Statement

In developing this solution, AI coding assistance (specifically **Gemini 3.8 Flash** via the Antigravity pair-programming agent) was utilized for:
- Accelerating boilerplate configuration (FastAPI router definitions, Pydantic schemas, Tailwind layout styling).
- Implementing mathematical reference code for the Mann-Kendall tie-adjustment formulas and Sen's slope algorithm.
- Structuring automated PyTest unit test fixtures for synthetic weather time series.

All architectural designs, climate logic decisions, algorithmic verification, and database integration were designed, tested, and validated to ensure domain rigor and system resilience.

---

## Future Roadmap

With additional development time, the platform could be expanded with:
1. **CMIP6 Climate Projections:** Integrate IPCC SSP2-4.5 and SSP5-8.5 projection models to forecast hazard probabilities through 2050 and 2100.
2. **Spatial GeoTIFF / NetCDF Gridded Raster Heatmaps:** Render 2D spatial hazard intensity heatmaps over regions using Mapbox GL or Deck.gl.
3. **Compound Hazard Indexing:** Quantify compounding climate risks, such as simultaneous heatwaves and droughts ("Hot-Dry Compounds"), which trigger severe agricultural and grid failures.
4. **Automated Cron Ingestion:** Scheduled daily background synchronizations for near-real-time ongoing hazard tracking.

---

## License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.
