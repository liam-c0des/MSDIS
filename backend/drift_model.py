import numpy as np
from scipy.stats import norm
import math
import requests
import os
from datetime import datetime, timedelta

class DriftSimulator:
    def __init__(self):
        self.earth_radius_km = 6371.0
        self.openweather_api_key = os.environ.get('OPENWEATHERMAP_API_KEY')
        self.copernicus_username = os.environ.get('COPERNICUS_USERNAME')
        self.copernicus_password = os.environ.get('COPERNICUS_PASSWORD')
        self._setup_copernicus()
    
    def _setup_copernicus(self):
        """Setup Copernicus credentials if available (non-interactive)"""
        if self.copernicus_username and self.copernicus_password:
            try:
                # Store credentials in environment for non-interactive use
                os.environ['COPERNICUSMARINE_USERNAME'] = self.copernicus_username
                os.environ['COPERNICUSMARINE_PASSWORD'] = self.copernicus_password
                # Remove interactive credential prompt by creating a credentials file silently
                self.copernicus_available = True
            except Exception as e:
                print(f"Copernicus setup warning: {str(e)}")
                self.copernicus_available = False
        else:
            self.copernicus_available = False
    
    def get_wave_data(self, lat, lon, time=None):
        """Fetch wave data from NOAA WaveWatch III via ERDDAP REST API
        
        Args:
            lat: Latitude (degrees)
            lon: Longitude (degrees)
            time: ISO 8601 datetime string (optional, defaults to latest available)
            
        Returns:
            dict: {"significant_wave_height_m": float, "mean_wave_direction_deg": float, "timestamp": str}
                  or None if unavailable
        """
        try:
            # NOAA ERDDAP WaveWatch III dataset
            # Dataset ID: NOAA_WaveWatch_III_wave_data
            base_url = "https://coastwatch.pfeg.noaa.gov/erddap/griddap/NOAA_WaveWatch_III_wave_data.json"
            
            # Use current time if not specified
            if time is None:
                now = datetime.utcnow()
                time = now.isoformat() + "Z"
            
            # ERDDAP REST API parameters
            # Fetch within a small bounding box for nearest point
            params = {
                "time": f'"{time}"',
                "latitude": f'({lat-0.1})({lat+0.1})',
                "longitude": f'({lon-0.1})({lon+0.1})',
                "variables": "Hsig,Dirpw"  # Hsig: significant wave height, Dirpw: peak wave direction
            }
            
            # Build query string manually for proper formatting
            query_string = f'?time={params["time"]}&latitude={params["latitude"]}&longitude={params["longitude"]}&variables={params["variables"]}'
            url = base_url + query_string
            
            response = requests.get(url, timeout=5)
            response.raise_for_status()
            data = response.json()
            
            if not data.get('table') or not data['table'].get('rows'):
                return None
            
            # Extract values from the first (nearest) row
            rows = data['table']['rows']
            if not rows:
                return None
            
            # Row format: [time, latitude, longitude, Hsig, Dirpw]
            row = rows[0]
            hsig = float(row[3]) if row[3] is not None else None
            dirpw = float(row[4]) if row[4] is not None else None
            
            if hsig is None or dirpw is None:
                return None
            
            return {
                "significant_wave_height_m": round(hsig, 2),
                "mean_wave_direction_deg": round(dirpw, 1),
                "timestamp": row[0]
            }
        except Exception as e:
            print(f"NOAA wave data fetch error: {str(e)}")
            return None
    
    def get_copernicus_current(self, lat, lon):
        """Fetch surface current vectors (uo, vo) from Copernicus Marine Service
        
        Returns:
            dict: {"eastward_m_s": float, "northward_m_s": float, "timestamp": str}
                  or None if unavailable
        """
        if not self.copernicus_available:
            return None
        
        try:
            import copernicusmarine
            import xarray as xr
            
            # Use current time (or latest available forecast)
            now = datetime.utcnow()
            start_time = (now - timedelta(days=1)).strftime('%Y-%m-%d')
            end_time = now.strftime('%Y-%m-%d')
            
            # Request a small bounding box around the point
            # Copernicus has ~0.083 degree resolution
            dataset = copernicusmarine.get_data(
                dataset_id="cmems_mod_glo_phy-cur_anfc_0.083deg_PT6H-i",
                variables=["uo", "vo"],
                minimum_longitude=lon - 0.1,
                maximum_longitude=lon + 0.1,
                minimum_latitude=lat - 0.1,
                maximum_latitude=lat + 0.1,
                start_date=start_time,
                end_date=end_time,
                depth_start=0,
                depth_end=1,
                force_download=False
            )
            
            # Extract the data - find nearest grid point
            if dataset is None:
                return None
            
            # Get values for uo (eastward) and vo (northward) at 0-1m depth
            uo_data = dataset['uo']
            vo_data = dataset['vo']
            
            # Find nearest point and take latest time
            uo_val = float(uo_data.sel(latitude=lat, longitude=lon, depth=0, method='nearest').isel(time=-1).values)
            vo_val = float(vo_data.sel(latitude=lat, longitude=lon, depth=0, method='nearest').isel(time=-1).values)
            
            return {
                "eastward_m_s": round(uo_val, 4),
                "northward_m_s": round(vo_val, 4),
                "timestamp": now.isoformat()
            }
        except Exception as e:
            print(f"Copernicus current fetch error: {str(e)}")
            return None
    
    def get_real_environmental_data(self, lat, lon):
        """Fetch real weather data from OpenWeatherMap API"""
        if not self.openweather_api_key:
            return None
        
        try:
            url = "https://api.openweathermap.org/data/2.5/weather"
            params = {
                "lat": lat,
                "lon": lon,
                "appid": self.openweather_api_key,
                "units": "metric"
            }
            
            response = requests.get(url, params=params, timeout=5)
            response.raise_for_status()
            data = response.json()
            
            if data.get('cod') != 200:
                return None
            
            # Extract wind data
            wind_speed_ms = data.get('wind', {}).get('speed', 0)
            wind_direction = data.get('wind', {}).get('deg', 0)
            
            # Convert m/s to knots (1 m/s = 1.944 knots)
            wind_speed_knots = wind_speed_ms * 1.944
            
            # Estimate wave height from wind speed and cloud coverage
            # Higher wind = higher waves (simplified model)
            clouds = data.get('clouds', {}).get('all', 0)
            base_wave = 0.2 + (wind_speed_knots / 20) * 2.5
            wave_height = max(0.5, min(base_wave, 4.0))
            
            # OpenWeatherMap gives NO ocean current data. This is a rough
            # wind-driven estimate only, flagged as "estimated" below.
            # Wind direction is meteorological (blowing FROM), so the
            # estimated current is set relative to the downwind direction.
            # No random jitter: the same inputs must give the same answer.
            current_speed = wind_speed_knots * 0.12
            wind_toward = (wind_direction + 180) % 360
            current_direction = (wind_toward + 45) % 360

            return {
                "wind": {
                    "speed_knots": round(wind_speed_knots, 1),
                    "direction_degrees": round(wind_direction, 1) if wind_direction else 0,
                    "description": self._wind_description(wind_speed_knots)
                },
                "current": {
                    "speed_knots": round(current_speed, 2),
                    "direction_degrees": round(current_direction, 1)
                },
                "waves": {
                    "height_meters": round(wave_height, 1),
                    "description": self._wave_description(wave_height)
                },
                "data_source": f"OpenWeatherMap (Updated: {datetime.utcnow().strftime('%Y-%m-%d %H:%M UTC')})",
                "data_quality": {
                    "wind": "live",
                    "current": "estimated",
                    "waves": "estimated"
                }
            }
        except Exception as e:
            print(f"OpenWeatherMap API error: {str(e)}")
            return None
        
    def get_mock_environmental_data(self, lat, lon):
        np.random.seed(int(abs(lat * 1000 + lon * 100)) % 2**31)
        
        wind_speed = 5 + np.random.random() * 15
        wind_direction = np.random.random() * 360
        
        current_speed = 0.2 + np.random.random() * 0.8
        current_direction = (wind_direction + 30 + np.random.random() * 60) % 360
        
        wave_height = 0.5 + np.random.random() * 2.5
        
        return {
            "wind": {
                "speed_knots": round(wind_speed, 1),
                "direction_degrees": round(wind_direction, 1),
                "description": self._wind_description(wind_speed)
            },
            "current": {
                "speed_knots": round(current_speed, 2),
                "direction_degrees": round(current_direction, 1)
            },
            "waves": {
                "height_meters": round(wave_height, 1),
                "description": self._wave_description(wave_height)
            },
            "data_source": "SIMULATED DATA (random test values, not real conditions)",
            "data_quality": {
                "wind": "simulated",
                "current": "simulated",
                "waves": "simulated"
            }
        }
    
    def _wind_description(self, speed_knots):
        if speed_knots < 4:
            return "Light air"
        elif speed_knots < 7:
            return "Light breeze"
        elif speed_knots < 11:
            return "Gentle breeze"
        elif speed_knots < 17:
            return "Moderate breeze"
        elif speed_knots < 22:
            return "Fresh breeze"
        elif speed_knots < 28:
            return "Strong breeze"
        else:
            return "Near gale"
    
    def _wave_description(self, height_m):
        if height_m < 0.5:
            return "Calm"
        elif height_m < 1.25:
            return "Slight"
        elif height_m < 2.5:
            return "Moderate"
        elif height_m < 4:
            return "Rough"
        else:
            return "Very rough"
    
    def propagate_position_euler(self, lat, lon, hours, wind_speed, wind_dir,
                                 current_speed, current_dir, leeway_rate, leeway_angle,
                                 use_copernicus=True, copernicus_current=None):
        """Propagate position using Euler integration with optional Copernicus currents

        Args:
            lat, lon: Starting position (degrees)
            hours: Simulation time (hours)
            wind_speed: Wind speed (knots)
            wind_dir: Direction the wind blows TOWARD (degrees, 0=North).
                      Convert meteorological "from" values before calling.
            current_speed: Current speed (knots)
            current_dir: Direction the current flows TOWARD (degrees)
            leeway_rate: Leeway rate factor
            leeway_angle: Leeway angle (degrees)
            use_copernicus: Use Copernicus current vectors if available
            copernicus_current: Pre-fetched Copernicus vectors (skips a new download)

        Returns:
            tuple: (final_lat, final_lon)
        """
        # Get Copernicus current vectors if available
        if use_copernicus and copernicus_current is None:
            copernicus_current = self.get_copernicus_current(lat, lon)
        
        # Calculate wind drift component
        wind_drift_speed_knots = wind_speed * leeway_rate
        wind_drift_dir = (wind_dir + leeway_angle) % 360
        
        # Convert wind drift to m/s
        wind_drift_speed_ms = wind_drift_speed_knots * 0.51444  # 1 knot = 0.51444 m/s
        
        # Convert current speed to m/s
        current_speed_ms = current_speed * 0.51444
        
        # Initialize position (in degrees)
        current_lat = lat
        current_lon = lon
        
        # Time step: 1 hour (3600 seconds)
        dt = 3600.0  # seconds
        num_steps = int(hours)
        
        for step in range(num_steps):
            # Wind drift velocity components (m/s)
            wind_drift_rad = math.radians(wind_drift_dir)
            wind_u = wind_drift_speed_ms * math.sin(wind_drift_rad)
            wind_v = wind_drift_speed_ms * math.cos(wind_drift_rad)
            
            # Ocean current velocity components (m/s)
            if copernicus_current:
                # Use Copernicus vectors directly
                ocean_u = copernicus_current['eastward_m_s']
                ocean_v = copernicus_current['northward_m_s']
            else:
                # Use input current direction/speed
                current_rad = math.radians(current_dir)
                ocean_u = current_speed_ms * math.sin(current_rad)
                ocean_v = current_speed_ms * math.cos(current_rad)
            
            # Total velocity (wind + ocean current)
            total_u = wind_u + ocean_u
            total_v = wind_v + ocean_v
            
            # Euler integration: dx = v * dt
            # Convert velocity (m/s) to degrees per second
            # 1 degree latitude ≈ 111320 meters
            # 1 degree longitude ≈ 111320 * cos(latitude) meters
            
            lat_rad = math.radians(current_lat)
            cos_lat = math.cos(lat_rad)
            
            dlat_dt = total_v / 111320.0  # degrees/second
            dlon_dt = total_u / (111320.0 * cos_lat)  # degrees/second
            
            # Update position
            current_lat += dlat_dt * dt
            current_lon += dlon_dt * dt
        
        return current_lat, current_lon
    
    def calculate_drift(self, lat, lon, hours, wind_speed, wind_dir,
                       current_speed, current_dir, leeway_rate, leeway_angle):
        """Straight-line drift. wind_dir and current_dir are both the
        direction of travel (TOWARD), in degrees from north."""
        wind_drift_speed = wind_speed * leeway_rate
        wind_drift_dir = (wind_dir + leeway_angle) % 360
        
        wind_drift_km = wind_drift_speed * 1.852 * hours
        current_drift_km = current_speed * 1.852 * hours
        
        wind_rad = math.radians(wind_drift_dir)
        current_rad = math.radians(current_dir)
        
        total_east = (wind_drift_km * math.sin(wind_rad) + 
                     current_drift_km * math.sin(current_rad))
        total_north = (wind_drift_km * math.cos(wind_rad) + 
                      current_drift_km * math.cos(current_rad))
        
        lat_change = total_north / 111.32
        lon_change = total_east / (111.32 * math.cos(math.radians(lat)))
        
        new_lat = lat + lat_change
        new_lon = lon + lon_change
        
        return new_lat, new_lon
    
    def get_wave_adjusted_uncertainty(self, wave_height_m):
        """Calculate uncertainty increase factor based on wave height
        
        Higher waves = more uncertainty in drift prediction
        
        Args:
            wave_height_m: Significant wave height in meters
            
        Returns:
            float: Uncertainty multiplier (>= 1.0)
        """
        if wave_height_m is None or wave_height_m <= 0:
            return 1.0
        
        # Wave height impact on uncertainty
        # Rough sea (>2.5m) significantly increases uncertainty
        if wave_height_m < 1.0:
            return 1.0  # Calm: baseline uncertainty
        elif wave_height_m < 2.0:
            return 1.15  # Slight: +15%
        elif wave_height_m < 3.0:
            return 1.35  # Moderate: +35%
        elif wave_height_m < 4.0:
            return 1.6   # Rough: +60%
        else:
            return 2.0   # Very rough: +100%
    
    def get_wave_adjusted_drift_magnitude(self, base_speed_knots, wave_height_m, leeway_rate):
        """Adjust drift magnitude based on wave conditions
        
        High waves can modify drift speed slightly
        
        Args:
            base_speed_knots: Base drift speed in knots
            wave_height_m: Significant wave height in meters
            leeway_rate: Leeway factor for the object
            
        Returns:
            float: Adjusted drift speed in knots
        """
        if wave_height_m is None or wave_height_m <= 0:
            return base_speed_knots
        
        # Wave-induced drift is minimal but measurable
        # Typical: wave height contributes ~5-15% additional drift for objects in water
        wave_drift_knots = wave_height_m * 0.05 * leeway_rate
        
        return base_speed_knots + wave_drift_knots
    
    def generate_probability_zone(self, center_lat, center_lon, hours, 
                                 uncertainty_factor=0.15, wave_height_m=None):
        # Apply wave-based uncertainty multiplier
        wave_uncertainty_multiplier = self.get_wave_adjusted_uncertainty(wave_height_m)
        adjusted_uncertainty = uncertainty_factor * wave_uncertainty_multiplier
        
        base_radius_km = 2.0 + (hours * 1.5) * adjusted_uncertainty
        
        points = []
        for angle in range(0, 360, 15):
            rad = math.radians(angle)
            
            radius = base_radius_km
            
            lat_offset = radius * math.cos(rad) / 111.32
            lon_offset = radius * math.sin(rad) / (111.32 * math.cos(math.radians(center_lat)))
            
            points.append([
                round(center_lon + lon_offset, 6),
                round(center_lat + lat_offset, 6)
            ])
        
        points.append(points[0])
        
        return {
            "coordinates": points,
            "radius_km": round(base_radius_km, 2)
        }
    
    def run_simulation(self, lat, lon, hours, leeway_rate, leeway_angle, use_copernicus_currents=True, vessel_speed=0):
        # ... (keep existing logic)
        # Try to get real data first, fall back to mock if unavailable
        env_data = self.get_real_environmental_data(lat, lon)
        if env_data is None:
            env_data = self.get_mock_environmental_data(lat, lon)
        
        # Fetch wave data from NOAA
        wave_data = self.get_wave_data(lat, lon)
        wave_height = wave_data['significant_wave_height_m'] if wave_data else None
        
        quality = env_data['data_quality']
        if wave_data:
            quality['waves'] = 'live'

        wind_speed = env_data['wind']['speed_knots']
        # Wind data is meteorological: direction_degrees is where the wind
        # blows FROM. An object drifts downwind, so flip it 180 degrees to
        # get the direction of travel. (Bug fix: drift used to go upwind.)
        wind_dir = (env_data['wind']['direction_degrees'] + 180) % 360
        current_speed = env_data['current']['speed_knots']
        current_dir = env_data['current']['direction_degrees']

        # Fetch Copernicus currents once per simulation, not once per time step
        copernicus_current = None
        if use_copernicus_currents and self.copernicus_available:
            copernicus_current = self.get_copernicus_current(lat, lon)
        if copernicus_current:
            u = copernicus_current['eastward_m_s']
            v = copernicus_current['northward_m_s']
            env_data['current'] = {
                "speed_knots": round(math.hypot(u, v) / 0.51444, 2),
                "direction_degrees": round((math.degrees(math.atan2(u, v)) + 360) % 360, 1)
            }
            quality['current'] = 'live'
        
        # Incorporate vessel speed into the drift model
        # For a vessel moving under its own power, we add its velocity vector
        # (This is a simplified model where we assume vessel maintains starting heading)
        # However, typically "drift" implies the vessel is disabled.
        # If speed > 0, we consider it the speed at the time of disappearance.
        
        # Adjust wind speed based on waves (slight increase)
        if wave_height:
            wind_speed = self.get_wave_adjusted_drift_magnitude(wind_speed, wave_height, leeway_rate)
        
        # Store wave data in environmental data
        if wave_data:
            env_data['waves'] = {
                "height_meters": wave_data['significant_wave_height_m'],
                "direction_degrees": wave_data['mean_wave_direction_deg'],
                "description": self._wave_description(wave_data['significant_wave_height_m'])
            }
        
        time_steps = [1, 3, 6, 12, 24]
        time_steps = [t for t in time_steps if t <= hours]
        if hours not in time_steps:
            time_steps.append(hours)
        time_steps.sort()
        
        predictions = []
        probability_zones = []
        
        # Calculate heading for each prediction point relative to previous point
        prev_lat, prev_lon = lat, lon
        
        for t in time_steps:
            # Use Euler integration with optional Copernicus currents
            if copernicus_current:
                pred_lat, pred_lon = self.propagate_position_euler(
                    lat, lon, t,
                    wind_speed, wind_dir,
                    current_speed, current_dir,
                    leeway_rate, leeway_angle,
                    use_copernicus=True,
                    copernicus_current=copernicus_current
                )
            else:
                # Fall back to traditional calculation
                pred_lat, pred_lon = self.calculate_drift(
                    lat, lon, t,
                    wind_speed, wind_dir,
                    current_speed, current_dir,
                    leeway_rate, leeway_angle
                )
            
            # Add distance covered by vessel speed if applicable
            if vessel_speed > 0:
                # Convert knots to km per hour (1 knot = 1.852 km/h)
                speed_kmh = vessel_speed * 1.852
                dist_vessel = speed_kmh * t
                # For simplicity, we assume the vessel was moving in the same direction as the drift
                # This is a common assumption for last known movement
                # But more accurately, we'd need a heading. Since we don't have one from user,
                # we adjust the drift distance directly or use the calculated drift direction.
                
            # Calculate heading from the absolute starting position to this prediction point
            delta_lon = math.radians(pred_lon - lon)
            lat1_rad = math.radians(lat)
            lat2_rad = math.radians(pred_lat)
            
            y = math.sin(delta_lon) * math.cos(lat2_rad)
            x = (math.cos(lat1_rad) * math.sin(lat2_rad) -
                 math.sin(lat1_rad) * math.cos(lat2_rad) * math.cos(delta_lon))
            
            heading = (math.degrees(math.atan2(y, x)) + 360) % 360
            
            # Calculate total distance including vessel's own speed
            base_dist = self._haversine(lat, lon, pred_lat, pred_lon)
            total_dist = base_dist + (vessel_speed * 1.852 * t)
            
            predictions.append({
                "hour": t,
                "latitude": round(pred_lat, 6),
                "longitude": round(pred_lon, 6),
                "distance_km": round(total_dist, 2),
                "heading": round(heading, 1),
                "speed_kts": vessel_speed
            })
            
            # Generate probability zone with wave-adjusted uncertainty
            zone_data = self.generate_probability_zone(pred_lat, pred_lon, t, wave_height_m=wave_height)
            
            base_prob = 0.95 - (t * 0.02)
            probability_zones.append({
                "hour": t,
                "probability": round(max(0.5, base_prob), 2),
                "coordinates": zone_data["coordinates"],
                "radius_km": zone_data["radius_km"],
                "center": {"latitude": round(pred_lat, 6), "longitude": round(pred_lon, 6)}
            })
        
        env_data['is_simulated'] = quality['wind'] == 'simulated'
        env_data['warnings'] = self._build_warnings(quality)

        return {
            "environmental_data": env_data,
            "predictions": predictions,
            "probability_zones": probability_zones
        }

    def _build_warnings(self, quality):
        """Plain-language warnings so an operator knows what is real and what is not."""
        warnings = []
        if quality['wind'] == 'simulated':
            warnings.append(
                "SIMULATED DATA: no live weather feed. Wind, current and waves are "
                "random test values. Do NOT use this prediction for a real search."
            )
            return warnings
        if quality['current'] != 'live':
            warnings.append(
                "Current is estimated from wind speed, not measured. "
                "Treat the drift track as approximate."
            )
        if quality['waves'] != 'live':
            warnings.append("Wave height is estimated from wind speed, not measured.")
        warnings.append(
            "Search zones use a fixed-growth circle and placeholder probabilities, "
            "not a validated SAR error model."
        )
        return warnings
    
    def _haversine(self, lat1, lon1, lat2, lon2):
        lat1_rad = math.radians(lat1)
        lat2_rad = math.radians(lat2)
        delta_lat = math.radians(lat2 - lat1)
        delta_lon = math.radians(lon2 - lon1)
        
        a = (math.sin(delta_lat/2)**2 + 
             math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(delta_lon/2)**2)
        c = 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))
        
        return self.earth_radius_km * c
