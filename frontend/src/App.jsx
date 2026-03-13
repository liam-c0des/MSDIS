import React, { useState, useCallback, useEffect } from 'react'
import { DarkModeProvider } from './DarkModeContext'
import Header from './components/Header'
import LoginPage from './components/LoginPage'
import IncidentForm from './components/IncidentForm'
import MapView from './components/MapView'
import EnvironmentPanel from './components/EnvironmentPanel'
import PredictionPanel from './components/PredictionPanel'
import AdminModal from './components/AdminModal'
import LoadingAnimation from './components/LoadingAnimation'
import axios from 'axios'
axios.defaults.baseURL = import.meta.env.VITE_API_URL || ''
axios.defaults.withCredentials = true

function App() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [simulationData, setSimulationData] = useState(null)
  const [searchAsset, setSearchAsset] = useState(null)
  const [simLoading, setSimLoading] = useState(false)
  const [error, setError] = useState(null)
  const [adminOpen, setAdminOpen] = useState(false)

  // Check if user is already logged in
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await axios.get('/api/auth/check')
        if (response.data.authenticated) {
          setUser(response.data.user)
        }
      } catch (err) {
        console.log('Not authenticated')
      } finally {
        setLoading(false)
      }
    }

    checkAuth()
  }, [])

  const handleLoginSuccess = (userData) => {
    setUser(userData)
  }

  const handleLogout = async () => {
    try {
      await axios.post('/api/auth/logout')
      setUser(null)
      setSimulationData(null)
      setSearchAsset(null)
      setError(null)
    } catch (err) {
      console.error('Logout error:', err)
    }
  }

  const runSimulation = useCallback(async (formData) => {
    setSimLoading(true)
    setError(null)
    
    // Extract search asset if provided
    const { search_asset, ...simParams } = formData
    setSearchAsset(search_asset)
    
    try {
      const response = await axios.post('/api/simulate', simParams)
      setSimulationData(response.data)
    } catch (err) {
      setError(err.response?.data?.error || 'Simulation failed. Please try again.')
      console.error('Simulation error:', err)
    } finally {
      setSimLoading(false)
    }
    
    // Safety timeout to ensure loading state clears (60 second max)
    setTimeout(() => {
      setSimLoading(false)
    }, 60000)
  }, [])

  const exportGeoJSON = useCallback(async () => {
    if (!simulationData) return
    
    try {
      const response = await axios.post('/api/export/geojson', simulationData, {
        responseType: 'blob'
      })
      
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', 'search_zones.geojson')
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Export error:', err)
      setError('Failed to export GeoJSON')
    }
  }, [simulationData])

  if (loading) {
    return (
      <DarkModeProvider>
        <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
          <div className="text-white text-lg">Loading...</div>
        </div>
      </DarkModeProvider>
    )
  }

  if (!user) {
    return (
      <DarkModeProvider>
        <LoginPage onLoginSuccess={handleLoginSuccess} />
      </DarkModeProvider>
    )
  }

  return (
    <DarkModeProvider>
      <div className="min-h-screen bg-[#0a0a0a] text-white">
        <Header user={user} onLogout={handleLogout} onAdminOpen={() => setAdminOpen(true)} />
        <AdminModal isOpen={adminOpen} onClose={() => setAdminOpen(false)} user={user} />
        
        <div className="flex flex-col lg:flex-row h-[calc(100vh-64px)]">
          <div className="w-full lg:w-96 bg-[#141414] p-4 overflow-y-auto border-r border-[#2a2a2a]">
            <IncidentForm 
              onSubmit={runSimulation} 
              loading={simLoading}
            />

            {error && (
              <div className="mb-8 p-3 bg-red-900/50 border border-red-500 rounded text-red-200 text-sm">
                {error}
              </div>
            )}
            
            {simulationData && (
              <>
                <div className="mb-8">
                  <EnvironmentPanel data={simulationData.environmental_data} />
                </div>
                <div className="mb-8">
                  <PredictionPanel 
                    predictions={simulationData.predictions}
                    onExport={exportGeoJSON}
                  />
                </div>
              </>
            )}
          </div>
          
          <div className="flex-1 relative">
            <LoadingAnimation isLoading={simLoading} />
            <MapView 
              simulationData={simulationData}
              searchAsset={searchAsset}
            />
          </div>
        </div>
      </div>
    </DarkModeProvider>
  )
}

export default App
