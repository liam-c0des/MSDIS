import React, { useEffect, useMemo } from 'react'
import { MapContainer, TileLayer, Marker, Polygon, Polyline, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_PUBLIC_KEY
const MAPBOX_STYLE = 'cmmh0oyub003k01s8hrk30nlc'

const createIcon = (color, size = 12) => {
  return L.divIcon({
    className: 'custom-marker',
    html: `<div style="
      width: ${size}px;
      height: ${size}px;
      background-color: ${color};
      border: 2px solid white;
      border-radius: 50%;
      box-shadow: 0 2px 4px rgba(0,0,0,0.3);
    "></div>`,
    iconSize: [size, size],
    iconAnchor: [size/2, size/2]
  })
}

const lastKnownIcon = createIcon('#ff6b35', 16)
const predictionIcon = createIcon('#0080b8', 10)
const searchAssetIcon = createIcon('#10b981', 18)

function MapUpdater({ center }) {
  const map = useMap()
  
  useEffect(() => {
    if (center) {
      map.flyTo(center, 10, { duration: 1 })
    }
  }, [center, map])
  
  return null
}

const formatCoords = (lat, lon) => {
  const latAbs = Math.abs(lat).toFixed(4);
  const lonAbs = Math.abs(lon).toFixed(4);
  const latSign = lat < 0 ? '-' : '';
  const lonSign = lon < 0 ? '-' : '';
  const latDir = lat >= 0 ? 'N' : 'S';
  const lonDir = lon >= 0 ? 'E' : 'W';
  return `${latSign}${latAbs}°${latDir}, ${lonSign}${lonAbs}°${lonDir}`;
};

function MapView({ simulationData, searchAsset }) {
  const defaultCenter = [3.2028, 73.2207]
  
  const center = useMemo(() => {
    if (searchAsset) {
      return [searchAsset.latitude, searchAsset.longitude]
    }
    if (simulationData?.input) {
      return [simulationData.input.latitude, simulationData.input.longitude]
    }
    return defaultCenter
  }, [simulationData, searchAsset])
  
  const getZoneColor = (probability) => {
    if (probability >= 0.8) return { fillColor: '#ff6b35', color: '#ff6b35' }
    if (probability >= 0.6) return { fillColor: '#ffc857', color: '#ffc857' }
    return { fillColor: '#0080b8', color: '#0080b8' }
  }
  
  const trajectoryPoints = useMemo(() => {
    if (!simulationData?.predictions) return []
    
    const points = [[simulationData.input.latitude, simulationData.input.longitude]]
    simulationData.predictions.forEach(pred => {
      points.push([pred.latitude, pred.longitude])
    })
    return points
  }, [simulationData])

  const mapboxUrl = MAPBOX_TOKEN 
    ? `https://api.mapbox.com/v4/mapbox.mapbox-streets-v8/{z}/{x}/{y}.png?access_token=${MAPBOX_TOKEN}`
    : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'

  const tileLayerAttribution = MAPBOX_TOKEN
    ? '&copy; <a href="https://www.mapbox.com/">Mapbox</a> &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a>'
    : '&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors'

  return (
    <MapContainer
      center={defaultCenter}
      zoom={7}
      className="h-full w-full"
      zoomControl={true}
    >
      <TileLayer
        attribution={tileLayerAttribution}
        url={mapboxUrl}
        maxZoom={MAPBOX_TOKEN ? 22 : 19}
        tms={false}
      />
      
      <MapUpdater center={center} />
      
      {simulationData && (
        <>
          {simulationData.probability_zones?.slice().reverse().map((zone, idx) => {
            const positions = zone.coordinates.map(coord => [coord[1], coord[0]])
            const colors = getZoneColor(zone.probability)
            
            return (
              <Polygon
                key={`zone-${zone.hour}-${idx}`}
                positions={positions}
                pathOptions={{
                  ...colors,
                  fillOpacity: 0.25,
                  weight: 2
                }}
              >
                <Popup>
                  <div className="text-sm">
                    <strong>Search Area T+{zone.hour}h</strong><br />
                    <span className="text-ocean-400 font-bold">Total Area: {(Math.PI * Math.pow(zone.radius_km, 2)).toFixed(2)} km²</span><br />
                    Radius: {zone.radius_km} km<br />
                    Probability: {Math.round(zone.probability * 100)}%
                  </div>
                </Popup>
              </Polygon>
            )
          })}
          
          {trajectoryPoints.length > 1 && (
            <Polyline
              positions={trajectoryPoints}
              pathOptions={{
                color: '#0080b8',
                weight: 2,
                dashArray: '5, 10',
                opacity: 0.8
              }}
            />
          )}
          
          <Marker 
            position={[simulationData.input.latitude, simulationData.input.longitude]}
            icon={lastKnownIcon}
          >
            <Popup>
              <div className="text-sm">
                <strong>Last Known Position</strong><br />
                {simulationData.input.object_name}<br />
                {formatCoords(simulationData.input.latitude, simulationData.input.longitude)}
              </div>
            </Popup>
          </Marker>
          
          {simulationData.predictions?.map((pred, idx) => (
            <Marker
              key={`pred-${pred.hour}`}
              position={[pred.latitude, pred.longitude]}
              icon={predictionIcon}
            >
              <Popup>
                <div className="text-sm">
                  <strong>Predicted Position T+{pred.hour}h</strong><br />
                  {formatCoords(pred.latitude, pred.longitude)}<br />
                  Drift: {pred.distance_km} km<br />
                  Heading: {pred.heading}°<br />
                  Speed: {pred.speed_kts} kts
                </div>
              </Popup>
            </Marker>
          ))}
        </>
      )}

      {searchAsset && (
        <Marker 
          position={[searchAsset.latitude, searchAsset.longitude]}
          icon={searchAssetIcon}
        >
          <Popup>
            <div className="text-sm">
              <strong>Search Vessel Position</strong><br />
              {formatCoords(searchAsset.latitude, searchAsset.longitude)}<br />
              <span className="text-[#10b981] font-bold">Currently conducting search</span>
            </div>
          </Popup>
        </Marker>
      )}
    </MapContainer>
  )
}

export default MapView
