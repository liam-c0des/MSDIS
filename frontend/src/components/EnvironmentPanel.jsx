import React from 'react'
import { Wind, Waves, Navigation } from 'lucide-react'

function EnvironmentPanel({ data }) {
  if (!data) return null
  
  return (
    <div className="mt-4 bg-navy-700 rounded-lg p-4">
      <h2 className="text-sm font-semibold text-ocean-300 uppercase tracking-wider mb-3">
        Environmental Conditions
      </h2>
      
      <div className="space-y-3">
        <div className="flex items-start gap-3">
          <Wind className="w-5 h-5 text-ocean-400 mt-0.5" />
          <div className="flex-1">
            <div className="text-xs text-navy-300">Wind</div>
            <div className="text-sm font-medium">
              {data.wind.speed_knots} kts @ {data.wind.direction_degrees}°
            </div>
            <div className="text-xs text-navy-400">{data.wind.description}</div>
          </div>
        </div>
        
        <div className="flex items-start gap-3">
          <Navigation className="w-5 h-5 text-ocean-400 mt-0.5" />
          <div className="flex-1">
            <div className="text-xs text-navy-300">Current</div>
            <div className="text-sm font-medium">
              {data.current.speed_knots} kts @ {data.current.direction_degrees}°
            </div>
          </div>
        </div>
        
        <div className="flex items-start gap-3">
          <Waves className="w-5 h-5 text-ocean-400 mt-0.5" />
          <div className="flex-1">
            <div className="text-xs text-navy-300">Waves</div>
            <div className="text-sm font-medium">
              {data.waves.height_meters}m - {data.waves.description}
            </div>
          </div>
        </div>
      </div>
      
      <div className="mt-3 pt-3 border-t border-navy-600">
        <div className="text-xs text-navy-400">
          Source: {data.data_source}
        </div>
      </div>
    </div>
  )
}

export default EnvironmentPanel
