import React from 'react'
import { Target, Download, ArrowRight } from 'lucide-react'

function PredictionPanel({ predictions, onExport }) {
  if (!predictions || predictions.length === 0) return null
  
  return (
    <div className="mt-4 bg-navy-700 rounded-lg p-4">
      <h2 className="text-sm font-semibold text-ocean-300 uppercase tracking-wider mb-3 flex items-center gap-2">
        <Target className="w-4 h-4" />
        Drift Predictions
      </h2>
      
      <div className="space-y-2">
        {predictions.map((pred) => (
          <div 
            key={pred.hour}
            className="flex items-center justify-between bg-navy-800 rounded-md p-2"
          >
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono bg-ocean-600 px-2 py-0.5 rounded">
                T+{pred.hour}h
              </span>
              <ArrowRight className="w-3 h-3 text-navy-400" />
            </div>
            <div className="text-right">
              <div className="text-xs font-mono text-white">
                {pred.latitude.toFixed(4)}, {pred.longitude.toFixed(4)}
              </div>
              <div className="text-xs text-navy-400">
                {pred.distance_km} km drift
              </div>
            </div>
          </div>
        ))}
      </div>
      
      <button
        onClick={onExport}
        className="mt-4 w-full flex items-center justify-center gap-2 bg-navy-600 hover:bg-navy-500 text-white py-2 px-4 rounded-lg transition-colors text-sm"
      >
        <Download className="w-4 h-4" />
        Export Search Zones (GeoJSON)
      </button>
    </div>
  )
}

export default PredictionPanel
