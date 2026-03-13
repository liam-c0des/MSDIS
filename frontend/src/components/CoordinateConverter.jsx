import React, { useState, useRef } from 'react'

function parseDD(str) {
  const s = str.trim()
  const withDir = /^(-?\d+(?:\.\d+)?)\s*°?\s*([NSns])[\s,]+(-?\d+(?:\.\d+)?)\s*°?\s*([EWew])$/
  const plain = /^(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)$/
  let lat, lon
  let m = s.match(withDir)
  if (m) {
    lat = parseFloat(m[1]) * (/[Ss]/.test(m[2]) ? -1 : 1)
    lon = parseFloat(m[3]) * (/[Ww]/.test(m[4]) ? -1 : 1)
    return { lat, lon }
  }
  m = s.match(plain)
  if (m) {
    lat = parseFloat(m[1])
    lon = parseFloat(m[2])
    return { lat, lon }
  }
  return null
}

function parseDMS(str) {
  const re = /(-?\d+)\s*°\s*(\d+)\s*[''′]\s*(\d+(?:\.\d+)?)\s*["″]\s*([NSns])\s*[,\s]+\s*(-?\d+)\s*°\s*(\d+)\s*[''′]\s*(\d+(?:\.\d+)?)\s*["″]\s*([EWew])/
  const m = str.trim().match(re)
  if (!m) return null
  const lat = (parseInt(m[1]) + parseInt(m[2]) / 60 + parseFloat(m[3]) / 3600) * (/[Ss]/.test(m[4]) ? -1 : 1)
  const lon = (parseInt(m[5]) + parseInt(m[6]) / 60 + parseFloat(m[7]) / 3600) * (/[Ww]/.test(m[8]) ? -1 : 1)
  return { lat, lon }
}

function parseDDM(str) {
  const re = /(-?\d+)\s*°\s*(\d+(?:\.\d+)?)\s*[''′]\s*([NSns])\s*[,\s]+\s*(-?\d+)\s*°\s*(\d+(?:\.\d+)?)\s*[''′]\s*([EWew])/
  const m = str.trim().match(re)
  if (!m) return null
  const lat = (parseInt(m[1]) + parseFloat(m[2]) / 60) * (/[Ss]/.test(m[3]) ? -1 : 1)
  const lon = (parseInt(m[4]) + parseFloat(m[5]) / 60) * (/[Ww]/.test(m[6]) ? -1 : 1)
  return { lat, lon }
}

function detectAndParse(input) {
  if (!input.trim()) return { result: null, format: null }

  if (/°.*'.*"/.test(input)) {
    const r = parseDMS(input)
    if (r) return { result: r, format: 'DMS' }
  }

  if (/°.*'/.test(input) && !/"/.test(input)) {
    const r = parseDDM(input)
    if (r) return { result: r, format: 'DDM' }
  }

  if (/°/.test(input)) {
    const r = parseDD(input)
    if (r) return { result: r, format: 'DD' }
  }

  const r = parseDD(input)
  if (r) return { result: r, format: 'Signed Decimal' }

  return { result: null, format: null }
}

function toDD(lat, lon) {
  const latDir = lat >= 0 ? 'N' : 'S'
  const lonDir = lon >= 0 ? 'E' : 'W'
  return `${Math.abs(lat).toFixed(6)}° ${latDir}, ${Math.abs(lon).toFixed(6)}° ${lonDir}`
}

function toDMS(lat, lon) {
  const fmt = (val, dirs) => {
    const dir = val >= 0 ? dirs[0] : dirs[1]
    const abs = Math.abs(val)
    const deg = Math.floor(abs)
    const minFull = (abs - deg) * 60
    const min = Math.floor(minFull)
    const sec = ((minFull - min) * 60).toFixed(1)
    return `${deg}° ${min}' ${sec}" ${dir}`
  }
  return `${fmt(lat, ['N', 'S'])}, ${fmt(lon, ['E', 'W'])}`
}

function toDDM(lat, lon) {
  const fmt = (val, dirs) => {
    const dir = val >= 0 ? dirs[0] : dirs[1]
    const abs = Math.abs(val)
    const deg = Math.floor(abs)
    const min = ((abs - deg) * 60).toFixed(4)
    return `${deg}° ${min}' ${dir}`
  }
  return `${fmt(lat, ['N', 'S'])}, ${fmt(lon, ['E', 'W'])}`
}

function toSigned(lat, lon) {
  return `${lat.toFixed(6)}, ${lon.toFixed(6)}`
}

const FORMAT_BADGE = {
  DD: { label: 'Decimal Degrees', color: 'bg-blue-700 text-blue-100' },
  DMS: { label: 'Deg Min Sec', color: 'bg-indigo-700 text-indigo-100' },
  DDM: { label: 'Deg Decimal Min', color: 'bg-violet-700 text-violet-100' },
  'Signed Decimal': { label: 'Signed Decimal', color: 'bg-sky-700 text-sky-100' },
}

const OUTPUTS = [
  { key: 'dd', label: 'Decimal Degrees (DD)', example: '4.1755° N, 73.5093° E' },
  { key: 'dms', label: 'Degrees Minutes Seconds (DMS)', example: '4° 10\' 31.8" N, 73° 30\' 33.5" E' },
  { key: 'ddm', label: 'Degrees Decimal Minutes (DDM)', example: "4° 10.5300' N, 73° 30.5580' E" },
  { key: 'signed', label: 'Signed Decimal', example: '4.1755, 73.5093' },
]

export default function CoordinateConverter() {
  const [input, setInput] = useState('')
  const [copied, setCopied] = useState(null)
  const inputRef = useRef(null)

  const { result, format } = detectAndParse(input)

  const isError = input.trim().length > 3 && !result

  const outputs = result
    ? {
        dd: toDD(result.lat, result.lon),
        dms: toDMS(result.lat, result.lon),
        ddm: toDDM(result.lat, result.lon),
        signed: toSigned(result.lat, result.lon),
      }
    : null

  const handleCopy = (key, text) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(key)
      setTimeout(() => setCopied(null), 1500)
    })
  }

  const handleClear = () => {
    setInput('')
    setCopied(null)
    inputRef.current?.focus()
  }

  return (
    <div className="mb-8 space-y-4">
      <div className="bg-[#1035AC] rounded-lg p-4 border border-[#1035AC]/30">
        <h2 className="text-sm font-semibold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
          </svg>
          Coordinate Converter
        </h2>

        <div className="space-y-3">
          <label className="block text-xs text-blue-100 mb-1">
            Enter Coordinates (any format)
          </label>

          <div className="relative">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="e.g. 4.1755, 73.5093  or  4° 10' 31.8&quot; N, 73° 30' 33.5&quot; E"
              className={`w-full bg-[#0a1e5e] border rounded-md px-3 py-2 pr-10 text-sm text-white placeholder-blue-300/40 focus:outline-none focus:ring-2 transition-colors ${
                isError
                  ? 'border-red-500 focus:ring-red-500/30'
                  : 'border-[#1035AC]/50 focus:ring-white/30'
              }`}
            />
            {input && (
              <button
                onClick={handleClear}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-blue-300/60 hover:text-white transition-colors"
                title="Clear"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>

          {isError && (
            <p className="text-xs text-red-400 mt-1">Invalid coordinate format — check your input.</p>
          )}

          {format && FORMAT_BADGE[format] && (
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs text-blue-200/70">Detected:</span>
              <span className={`text-xs px-2 py-0.5 rounded font-semibold ${FORMAT_BADGE[format].color}`}>
                {FORMAT_BADGE[format].label}
              </span>
            </div>
          )}
        </div>
      </div>

      {outputs && (
        <div className="space-y-2">
          {OUTPUTS.map(({ key, label }) => (
            <div
              key={key}
              className="bg-[#0a1e5e] rounded-lg border border-[#1035AC]/50 p-3 flex items-center justify-between gap-2"
            >
              <div className="min-w-0">
                <div className="text-xs text-blue-200/60 mb-1">{label}</div>
                <div className="text-sm text-white font-mono truncate">{outputs[key]}</div>
              </div>
              <button
                onClick={() => handleCopy(key, outputs[key])}
                className={`flex-shrink-0 flex items-center gap-1 px-3 py-1.5 rounded text-xs font-semibold transition-all ${
                  copied === key
                    ? 'bg-green-600 text-white'
                    : 'bg-[#1035AC]/60 hover:bg-[#1035AC] text-blue-100'
                }`}
                title="Copy to clipboard"
              >
                {copied === key ? (
                  <>
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Copied
                  </>
                ) : (
                  <>
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    Copy
                  </>
                )}
              </button>
            </div>
          ))}

          <div className="bg-[#141414] border border-[#2a2a2a] rounded-lg px-3 py-2 flex items-center gap-3 text-xs text-[#888]">
            <svg className="w-3.5 h-3.5 text-[#1035AC] flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span>
              Lat: <span className="text-white font-mono">{result.lat.toFixed(6)}</span>
              &nbsp;&nbsp;Lon: <span className="text-white font-mono">{result.lon.toFixed(6)}</span>
              &nbsp;&nbsp;
              {result.lat >= 0 ? 'N' : 'S'} / {result.lon >= 0 ? 'E' : 'W'}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
