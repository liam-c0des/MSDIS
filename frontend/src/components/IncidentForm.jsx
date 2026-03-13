import React, { useState, useEffect } from 'react'
import { MapPin, Clock, Loader2, Search, Anchor } from 'lucide-react'
import axios from 'axios'

function parseCoordinates(input) {
  const s = input.trim()
  if (!s) return null

  // DMS: 4° 10' 31.8" N, 73° 30' 33.5" E
  const dmsRe = /(-?\d+)\s*°\s*(\d+)\s*[''′]\s*(\d+(?:\.\d+)?)\s*["″"]\s*([NSns])\s*[,\s]+\s*(-?\d+)\s*°\s*(\d+)\s*[''′]\s*(\d+(?:\.\d+)?)\s*["″"]\s*([EWew])/
  let m = s.match(dmsRe)
  if (m) {
    const lat = (parseInt(m[1]) + parseInt(m[2]) / 60 + parseFloat(m[3]) / 3600) * (/[Ss]/.test(m[4]) ? -1 : 1)
    const lon = (parseInt(m[5]) + parseInt(m[6]) / 60 + parseFloat(m[7]) / 3600) * (/[Ww]/.test(m[8]) ? -1 : 1)
    return { lat, lon, format: 'DMS' }
  }

  // DDM: 4° 10.530' N, 73° 30.558' E
  const ddmRe = /(-?\d+)\s*°\s*(\d+(?:\.\d+)?)\s*[''′]\s*([NSns])\s*[,\s]+\s*(-?\d+)\s*°\s*(\d+(?:\.\d+)?)\s*[''′]\s*([EWew])/
  m = s.match(ddmRe)
  if (m) {
    const lat = (parseInt(m[1]) + parseFloat(m[2]) / 60) * (/[Ss]/.test(m[3]) ? -1 : 1)
    const lon = (parseInt(m[4]) + parseFloat(m[5]) / 60) * (/[Ww]/.test(m[6]) ? -1 : 1)
    return { lat, lon, format: 'DDM' }
  }

  // DD with direction: 4.1755° N, 73.5093° E
  const ddDirRe = /(-?\d+(?:\.\d+)?)\s*°?\s*([NSns])\s*[,\s]+\s*(-?\d+(?:\.\d+)?)\s*°?\s*([EWew])/
  m = s.match(ddDirRe)
  if (m) {
    const lat = parseFloat(m[1]) * (/[Ss]/.test(m[2]) ? -1 : 1)
    const lon = parseFloat(m[3]) * (/[Ww]/.test(m[4]) ? -1 : 1)
    return { lat, lon, format: 'DD' }
  }

  // Signed decimal: 4.1755, 73.5093
  const signedRe = /^(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)$/
  m = s.match(signedRe)
  if (m) {
    return { lat: parseFloat(m[1]), lon: parseFloat(m[2]), format: 'Signed Decimal' }
  }

  return null
}

const FORMAT_BADGE = {
  DD:              { label: 'Decimal Degrees',     color: 'bg-blue-700 text-blue-100' },
  DMS:             { label: 'Deg Min Sec',          color: 'bg-indigo-700 text-indigo-100' },
  DDM:             { label: 'Deg Decimal Min',      color: 'bg-violet-700 text-violet-100' },
  'Signed Decimal':{ label: 'Signed Decimal',       color: 'bg-sky-700 text-sky-100' },
}

function IncidentForm({ onSubmit, loading }) {
  const [objectTypes, setObjectTypes] = useState({})
  const [coordInput, setCoordInput] = useState('4.1705, 73.5100')
  const [searchCoordInput, setSearchCoordInput] = useState('')
  const [formData, setFormData] = useState({
    hours: '12',
    object_type: 'small_fishing_dhoni',
    vessel_speed: '0',
  })
  const [validationError, setValidationError] = useState('')

  useEffect(() => {
    axios.get('/api/object-types')
      .then(res => setObjectTypes(res.data))
      .catch(err => console.error('Failed to load object types:', err))
  }, [])

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    setValidationError('')
  }

  const parsed = parseCoordinates(coordInput)
  const isCoordError = coordInput.trim().length > 3 && !parsed

  const parsedSearch = parseCoordinates(searchCoordInput)
  const isSearchCoordError = searchCoordInput.trim().length > 3 && !parsedSearch

  const handleSubmit = (e) => {
    e.preventDefault()

    if (!parsed) {
      setValidationError('Invalid coordinates. Please enter in any supported format.')
      return
    }

    const speed = parseFloat(formData.vessel_speed) || 0

    onSubmit({
      latitude: parsed.lat,
      longitude: parsed.lon,
      hours: parseInt(formData.hours),
      object_type: formData.object_type,
      vessel_speed: speed,
      search_asset: parsedSearch ? {
        latitude: parsedSearch.lat,
        longitude: parsedSearch.lon
      } : null
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 mb-8">
      <div className="bg-[#1035AC] rounded-lg p-4 border border-[#1035AC]/30">
        <h2 className="text-sm font-semibold text-white uppercase tracking-wider mb-3 flex items-center gap-2">
          <MapPin className="w-4 h-4" />
          Incident Details
        </h2>

        <div className="space-y-3">
          <div>
            <label className="block text-xs text-blue-100 mb-1">Object Type</label>
            <select
              name="object_type"
              value={formData.object_type}
              onChange={handleChange}
              className="w-full bg-[#0a1e5e] border border-[#1035AC]/50 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-white/30 appearance-none cursor-pointer"
            >
              {Object.entries(objectTypes).map(([key, value]) => (
                <option key={key} value={key} className="bg-[#0a1e5e] text-white">
                  {value.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs text-blue-100 mb-1">Coordinates</label>
            <div className="relative">
              <input
                type="text"
                value={coordInput}
                onChange={e => { setCoordInput(e.target.value); setValidationError('') }}
                placeholder='e.g. 4.1705, 73.5100  or  4° 10′ 31.8″ N, 73° 30′ 33.5″ E'
                className={`w-full bg-[#0a1e5e] border rounded-md px-3 py-2 pr-8 text-sm text-white placeholder-blue-300/40 focus:outline-none focus:ring-2 transition-colors ${
                  isCoordError
                    ? 'border-red-500 focus:ring-red-500/30'
                    : 'border-[#1035AC]/50 focus:ring-white/30'
                }`}
              />
              {coordInput && (
                <button
                  type="button"
                  onClick={() => { setCoordInput(''); setValidationError('') }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-blue-300/50 hover:text-white transition-colors"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>

            {isCoordError && (
              <p className="text-xs text-red-400 mt-1">Invalid format — try: 4.17, 73.51 or DMS/DDM</p>
            )}

            {parsed && FORMAT_BADGE[parsed.format] && (
              <div className="flex items-center gap-2 mt-1.5">
                <span className="text-xs text-blue-200/60">Detected:</span>
                <span className={`text-xs px-2 py-0.5 rounded font-semibold ${FORMAT_BADGE[parsed.format].color}`}>
                  {FORMAT_BADGE[parsed.format].label}
                </span>
                <span className="text-xs text-blue-200/50 font-mono">
                  {parsed.lat.toFixed(4)}, {parsed.lon.toFixed(4)}
                </span>
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs text-blue-100 mb-1">Vessel Speed (kts)</label>
            <input
              type="number"
              name="vessel_speed"
              value={formData.vessel_speed}
              onChange={handleChange}
              step="0.1"
              min="0"
              required
              className="w-full bg-[#0a1e5e] border border-[#1035AC]/50 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-white/30"
            />
            <div className="text-xs text-blue-200/60 mt-1">Speed in knots</div>
          </div>
        </div>
      </div>

      <div className="bg-[#1035AC] rounded-lg p-4 border border-[#1035AC]/30">
        <h2 className="text-sm font-semibold text-white uppercase tracking-wider mb-3 flex items-center gap-2">
          <Anchor className="w-4 h-4" />
          Search Asset (Optional)
        </h2>

        <div>
          <label className="block text-xs text-blue-100 mb-1">Coordinates</label>
          <div className="relative">
            <input
              type="text"
              value={searchCoordInput}
              onChange={e => setSearchCoordInput(e.target.value)}
              placeholder='e.g. 4.1, 73.4  or  4° 10′ 31.8″ N, 73° 30′ 33.5″ E'
              className={`w-full bg-[#0a1e5e] border rounded-md px-3 py-2 pr-8 text-sm text-white placeholder-blue-300/40 focus:outline-none focus:ring-2 transition-colors ${
                isSearchCoordError
                  ? 'border-red-500 focus:ring-red-500/30'
                  : 'border-[#1035AC]/50 focus:ring-white/30'
              }`}
            />
            {searchCoordInput && (
              <button
                type="button"
                onClick={() => setSearchCoordInput('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-blue-300/50 hover:text-white transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>

          {isSearchCoordError && (
            <p className="text-xs text-red-400 mt-1">Invalid format — try: 4.1, 73.4 or DMS/DDM</p>
          )}

          {parsedSearch && FORMAT_BADGE[parsedSearch.format] && (
            <div className="flex items-center gap-2 mt-1.5">
              <span className="text-xs text-blue-200/60">Detected:</span>
              <span className={`text-xs px-2 py-0.5 rounded font-semibold ${FORMAT_BADGE[parsedSearch.format].color}`}>
                {FORMAT_BADGE[parsedSearch.format].label}
              </span>
              <span className="text-xs text-blue-200/50 font-mono">
                {parsedSearch.lat.toFixed(4)}, {parsedSearch.lon.toFixed(4)}
              </span>
            </div>
          )}
        </div>
        <div className="text-xs text-blue-200/60 mt-2 italic">Add search vessel's current position</div>
      </div>

      <div className="bg-[#1035AC] rounded-lg p-4 border border-[#1035AC]/30">
        <h2 className="text-sm font-semibold text-white uppercase tracking-wider mb-3 flex items-center gap-2">
          <Clock className="w-4 h-4" />
          Prediction Window
        </h2>

        <div>
          <label className="block text-xs text-blue-100 mb-1">Hours Since Disappearance</label>
          <select
            name="hours"
            value={formData.hours}
            onChange={handleChange}
            className="w-full bg-[#0a1e5e] border border-[#1035AC]/50 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-white/30 appearance-none cursor-pointer"
          >
            <option value="1"  className="bg-[#0a1e5e] text-white">1 hour</option>
            <option value="3"  className="bg-[#0a1e5e] text-white">3 hours</option>
            <option value="6"  className="bg-[#0a1e5e] text-white">6 hours</option>
            <option value="12" className="bg-[#0a1e5e] text-white">12 hours</option>
            <option value="24" className="bg-[#0a1e5e] text-white">24 hours</option>
            <option value="48" className="bg-[#0a1e5e] text-white">48 hours</option>
          </select>
        </div>
      </div>

      {validationError && (
        <div className="p-3 bg-red-900/50 border border-red-500 rounded-lg text-red-200 text-sm">
          {validationError}
        </div>
      )}

      <button
        type="submit"
        disabled={loading || !parsed}
        className="w-full bg-[#1035AC] hover:bg-[#0d2b8c] disabled:bg-[#2a2a2a] disabled:cursor-not-allowed text-white font-semibold py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
      >
        {loading ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            Running Simulation...
          </>
        ) : (
          <>
            <Search className="w-5 h-5" />
            Run Drift Simulation
          </>
        )}
      </button>
    </form>
  )
}

export default IncidentForm
