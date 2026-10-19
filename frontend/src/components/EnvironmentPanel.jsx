import React from 'react'
import { Wind, Waves, Navigation, AlertTriangle } from 'lucide-react'

const QUALITY_LABEL = {
  live: 'Live',
  estimated: 'Estimated',
  simulated: 'Simulated',
}

function QualityTag({ value }) {
  if (!value) return null
  const style =
    value === 'live'
      ? 'bg-green-900/60 text-green-200'
      : value === 'estimated'
        ? 'bg-amber-900/60 text-amber-200'
        : 'bg-red-900/60 text-red-200'
  return (
    <span className={`ml-2 px-1.5 py-0.5 rounded text-[10px] uppercase tracking-wide ${style}`}>
      {QUALITY_LABEL[value] || value}
    </span>
  )
}

function EnvironmentPanel({ data }) {
  if (!data) return null

  const quality = data.data_quality || {}
  const warnings = data.warnings || []

  return (
    <div className="mt-4 bg-navy-700 rounded-lg p-4">
      <h2 className="text-sm font-semibold text-ocean-300 uppercase tracking-wider mb-3">
        Environmental Conditions
      </h2>

      {warnings.length > 0 && (
        <div
          role="alert"
          className={`mb-3 p-3 rounded-lg border text-xs space-y-1.5 ${
            data.is_simulated
              ? 'bg-red-900/60 border-red-500 text-red-100'
              : 'bg-amber-900/40 border-amber-500 text-amber-100'
          }`}
        >
          {warnings.map((w, i) => (
            <div key={i} className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
              <span className={i === 0 && data.is_simulated ? 'font-semibold' : ''}>{w}</span>
            </div>
          ))}
        </div>
      )}

      <div className="space-y-3">
        <div className="flex items-start gap-3">
          <Wind className="w-5 h-5 text-ocean-400 mt-0.5" />
          <div className="flex-1">
            <div className="text-xs text-navy-300">
              Wind
              <QualityTag value={quality.wind} />
            </div>
            <div className="text-sm font-medium">
              {data.wind.speed_knots} kts from {data.wind.direction_degrees}°
            </div>
            <div className="text-xs text-navy-400">{data.wind.description}</div>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <Navigation className="w-5 h-5 text-ocean-400 mt-0.5" />
          <div className="flex-1">
            <div className="text-xs text-navy-300">
              Current
              <QualityTag value={quality.current} />
            </div>
            <div className="text-sm font-medium">
              {data.current.speed_knots} kts toward {data.current.direction_degrees}°
            </div>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <Waves className="w-5 h-5 text-ocean-400 mt-0.5" />
          <div className="flex-1">
            <div className="text-xs text-navy-300">
              Waves
              <QualityTag value={quality.waves} />
            </div>
            <div className="text-sm font-medium">
              {data.waves.height_meters}m - {data.waves.description}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-3 pt-3 border-t border-navy-600">
        <div className={`text-xs ${data.is_simulated ? 'text-red-300 font-semibold' : 'text-navy-400'}`}>
          Source: {data.data_source}
        </div>
      </div>
    </div>
  )
}

export default EnvironmentPanel
