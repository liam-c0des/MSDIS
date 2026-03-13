# Poseidon Watch - Environmental Data Sources

## Overview
The Poseidon Watch application integrates data from multiple authoritative sources to provide accurate maritime environmental conditions for drift prediction and search and rescue operations.

---

## Data Sources by Component

### 1. **Wind & Weather Data**
**Source:** OpenWeatherMap API
- **URL:** `https://api.openweathermap.org/data/2.5/weather`
- **Data Provided:**
  - Wind speed (in knots)
  - Wind direction (in degrees)
  - Cloud coverage
- **Implementation:** `drift_model.py` → `get_real_environmental_data()` method
- **Requirements:** `OPENWEATHERMAP_API_KEY` environment variable
- **Fallback:** Mock data if API unavailable

---

### 2. **Wave Data**
**Source:** NOAA WaveWatch III via ERDDAP REST API
- **URL:** `https://coastwatch.pfeg.noaa.gov/erddap/griddap/NOAA_WaveWatch_III_wave_data.json`
- **Dataset:** NOAA_WaveWatch_III_wave_data
- **Data Provided:**
  - Significant wave height (meters)
  - Mean wave direction (degrees)
  - Real-time observations
- **Implementation:** `drift_model.py` → `get_wave_data()` method
- **Requirements:** None (open access via ERDDAP)
- **Resolution:** Updates available at regular intervals
- **Fallback:** Estimated from wind data if NOAA unavailable

---

### 3. **Ocean Current Data**
**Source:** Copernicus Marine Service
- **Dataset ID:** `cmems_mod_glo_phy-cur_anfc_0.083deg_PT6H-i`
- **Data Provided:**
  - Eastward current component (uo)
  - Northward current component (vo)
  - Surface layer (0-1m depth)
- **Implementation:** `drift_model.py` → `get_copernicus_current()` method
- **Requirements:** 
  - `COPERNICUS_USERNAME` environment variable
  - `COPERNICUS_PASSWORD` environment variable
- **Resolution:** 0.083 degrees (~9.2 km)
- **Update Frequency:** 6-hourly (PT6H)
- **Fallback:** Input current parameters if unavailable

---

### 4. **Mock/Fallback Data**
**Source:** Procedurally Generated (Location-Based Seeding)
- **Label Displayed:** "Environmental Data"
- **Use Case:** When real API data is unavailable
- **Implementation:** `drift_model.py` → `get_mock_environmental_data()` method
- **Characteristics:**
  - Deterministic (same location = same values)
  - Realistic ranges for maritime conditions
  - Used for testing and demonstrations

---

## Data Priority Hierarchy

The system uses the following priority order for environmental data:

```
1. OpenWeatherMap (Real-time wind data)
   ↓ (if unavailable)
2. Mock data (location-based seeding)

3. NOAA WaveWatch III (Wave heights)
   ↓ (if unavailable)
4. Estimated from wind data

5. Copernicus Marine Service (Ocean currents)
   ↓ (if unavailable)
6. User-provided input current parameters
```

---

## Environment Variables Required

To use real data sources, configure these environment variables:

```bash
# OpenWeatherMap API (https://openweathermap.org/api)
OPENWEATHERMAP_API_KEY=your_api_key_here

# Copernicus Marine Service (https://data.marine.copernicus.eu/)
COPERNICUS_USERNAME=your_username
COPERNICUS_PASSWORD=your_password

# Flask session security
SECRET_KEY=your_secret_key_here
```

---

## Data Accuracy & Limitations

### Wind Data (OpenWeatherMap)
- **Accuracy:** ±1-2 knots typical
- **Update Frequency:** Real-time
- **Coverage:** Global
- **Limitations:** Based on nearest weather station

### Wave Data (NOAA WaveWatch III)
- **Accuracy:** ±0.3m typical
- **Update Frequency:** Regular intervals
- **Coverage:** Global ocean areas
- **Limitations:** Offshore only, may not resolve coastal features

### Current Data (Copernicus Marine Service)
- **Accuracy:** ±0.05 m/s typical
- **Resolution:** 0.083 degrees (~9.2 km)
- **Update Frequency:** 6-hourly
- **Limitations:** Surface layer only, requires authentication

---

## Field Definitions

| Field | Unit | Source | Description |
|-------|------|--------|-------------|
| Wind Speed | knots | OpenWeatherMap | Surface wind speed |
| Wind Direction | degrees | OpenWeatherMap | From which direction (0°=North, 90°=East) |
| Wave Height | meters | NOAA WaveWatch III | Significant wave height (Hs) |
| Wave Direction | degrees | NOAA WaveWatch III | Mean wave direction |
| Current Speed | knots | Copernicus / Input | Surface current magnitude |
| Current Direction | degrees | Copernicus / Input | Current flow direction |

---

## Data Source Attribution

When displaying environmental data, the system attributes data as follows:

- **Real Data:** `"OpenWeatherMap (Updated: YYYY-MM-DD HH:MM UTC)"`
- **Mock Data:** `"Environmental Data"`
- **Wave Data:** Integrated from NOAA WaveWatch III
- **Current Data:** Copernicus Marine Service

---

## References

- **OpenWeatherMap API:** https://openweathermap.org/api
- **NOAA ERDDAP:** https://coastwatch.pfeg.noaa.gov/erddap/
- **Copernicus Marine Service:** https://marine.copernicus.eu/
- **WaveWatch III:** https://polar.ncei.noaa.gov/products/wavewatch-3-global-wave-model

