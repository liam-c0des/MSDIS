import React, { useState } from 'react'
import { Anchor, Eye, EyeOff } from 'lucide-react'
import axios from 'axios'

function LoginPage({ onLoginSuccess }) {
  const [isLogin, setIsLogin] = useState(true)
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  })

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    setError('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register'
      const response = await axios.post(endpoint, formData)
      
      if (response.status === 200 || response.status === 201) {
        onLoginSuccess(response.data.user)
      }
    } catch (err) {
      setError(err.response?.data?.error || 'An error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute top-[-10%] right-[-10%] w-96 h-96 bg-[#0f5040]/20 rounded-full blur-3xl"></div>
      <div className="absolute bottom-[-10%] left-[-10%] w-96 h-96 bg-[#1035AC]/10 rounded-full blur-3xl"></div>
      
      <div className="w-full max-w-md relative z-10">
        <div className="bg-[#141414] rounded shadow-2xl border border-[#2a2a2a] p-8">
          {/* Logo */}
          <div className="flex justify-center mb-6">
            <img src="/logo.png?v=1" alt="MSDIS Logo" className="w-32 h-32 object-contain" />
          </div>

          <h1 className="text-3xl font-bold text-white text-center mb-2">
            MSDIS
          </h1>
          <p className="text-[#888] text-center text-sm mb-8">
            Maritime Search and Drift Intelligence System
          </p>

          {/* Tab Toggle */}
          <div className="flex gap-2 mb-6 bg-[#0a0a0a] p-1 rounded border border-[#2a2a2a]">
            <button
              onClick={() => setIsLogin(true)}
              className={`flex-1 py-2 px-4 rounded transition-all duration-200 ${
                isLogin
                  ? 'bg-[#1035AC] text-white font-bold shadow-sm'
                  : 'text-[#888] hover:text-white hover:bg-[#1e1e1e]'
              }`}
            >
              Login
            </button>
            <button
              onClick={() => setIsLogin(false)}
              className={`flex-1 py-2 px-4 rounded transition-all duration-200 ${
                !isLogin
                  ? 'bg-[#1035AC] text-white font-bold shadow-sm'
                  : 'text-[#888] hover:text-white hover:bg-[#1e1e1e]'
              }`}
            >
              Register
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Username */}
            <div>
              <label className="block text-sm font-medium text-[#888] mb-2">
                Username
              </label>
              <input
                type="text"
                name="username"
                value={formData.username}
                onChange={handleChange}
                placeholder="Enter username"
                className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded px-4 py-2 text-white placeholder-[#666] focus:outline-none focus:ring-2 focus:ring-[#1035AC] focus:border-transparent"
                required
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-[#888] mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder={isLogin ? 'Enter password' : 'Min 4 characters'}
                  className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded px-4 py-2 text-white placeholder-[#666] focus:outline-none focus:ring-2 focus:ring-[#1035AC] focus:border-transparent"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#888] hover:text-[#1035AC]"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-3 bg-red-900/50 border border-red-500 rounded text-red-200 text-sm">
                {error}
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#1035AC] hover:bg-[#0d2b8c] disabled:bg-[#2a2a2a] disabled:cursor-not-allowed text-white font-semibold py-2 px-4 rounded transition-colors mt-6"
            >
              {loading ? (
                <span className="inline-block">
                  {isLogin ? 'Logging in...' : 'Creating account...'}
                </span>
              ) : (
                <span>{isLogin ? 'Login' : 'Register'}</span>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

export default LoginPage
