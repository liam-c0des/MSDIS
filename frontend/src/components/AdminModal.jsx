import React, { useEffect, useState } from 'react'
import { CheckCircle, XCircle, Users, Trash2, Key, Eye, X, ShieldCheck } from 'lucide-react'
import axios from 'axios'

function AdminModal({ isOpen, onClose, user }) {
  const [pendingUsers, setPendingUsers] = useState([])
  const [allUsers, setAllUsers] = useState([])
  const [userCount, setUserCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [actionInProgress, setActionInProgress] = useState(false)
  const [activeTab, setActiveTab] = useState('pending')
  const [resetPasswordUser, setResetPasswordUser] = useState(null)
  const [resetPasswordValue, setResetPasswordValue] = useState('')
  const [expandedUser, setExpandedUser] = useState(null)

  useEffect(() => {
    if (isOpen) fetchAdminData()
  }, [isOpen])

  useEffect(() => {
    const handleKey = (e) => { if (e.key === 'Escape') onClose() }
    if (isOpen) document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [isOpen, onClose])

  const fetchAdminData = async () => {
    try {
      setLoading(true)
      const [pendingRes, allUsersRes, countRes] = await Promise.all([
        axios.get('/api/admin/pending-users'),
        axios.get('/api/admin/all-users'),
        axios.get('/api/admin/user-count')
      ])
      setPendingUsers(pendingRes.data.pending_users || [])
      setAllUsers(allUsersRes.data.users || [])
      setUserCount(countRes.data.count || 0)
      setError(null)
    } catch (err) {
      setError('Failed to load admin data')
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async (username) => {
    setActionInProgress(true)
    try {
      await axios.post('/api/admin/approve-user', { username })
      setPendingUsers(prev => prev.filter(u => u.username !== username))
      setError(null)
    } catch { setError(`Failed to approve ${username}`) }
    finally { setActionInProgress(false) }
  }

  const handleReject = async (username) => {
    if (!window.confirm(`Reject ${username}?`)) return
    setActionInProgress(true)
    try {
      await axios.post('/api/admin/reject-user', { username })
      setPendingUsers(prev => prev.filter(u => u.username !== username))
      setError(null)
    } catch { setError(`Failed to reject ${username}`) }
    finally { setActionInProgress(false) }
  }

  const handleResetPassword = async (username) => {
    if (!resetPasswordValue.trim()) { setError('Password cannot be empty'); return }
    setActionInProgress(true)
    try {
      await axios.post('/api/admin/reset-password', { username, password: resetPasswordValue })
      setResetPasswordUser(null)
      setResetPasswordValue('')
      setError(null)
      alert(`Password reset for ${username}`)
    } catch { setError(`Failed to reset password for ${username}`) }
    finally { setActionInProgress(false) }
  }

  const handleDeleteUser = async (username) => {
    if (!window.confirm(`Delete ${username}? This cannot be undone.`)) return
    setActionInProgress(true)
    try {
      await axios.post('/api/admin/delete-user', { username })
      setAllUsers(prev => prev.filter(u => u.username !== username))
      setUserCount(prev => prev - 1)
      setError(null)
    } catch { setError(`Failed to delete ${username}`) }
    finally { setActionInProgress(false) }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex">
      <style>{`@keyframes slideIn{from{transform:translateX(100%)}to{transform:translateX(0)}}`}</style>
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      <div
        className="relative ml-auto h-full w-full max-w-sm bg-[#141414] border-l border-[#2a2a2a] flex flex-col shadow-2xl"
        style={{ animation: 'slideIn 0.22s ease-out' }}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#2a2a2a]">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[#1e90ff]" />
            <span className="font-mono text-sm font-bold text-[#1e90ff] tracking-wider uppercase">Admin Panel</span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded hover:bg-[#1e1e1e] text-[#888] hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div className="bg-[#0a1e5e] rounded-lg border border-[#1035AC]/50 p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-[#1035AC] flex items-center justify-center text-white font-bold text-sm">
              {user?.username?.[0]?.toUpperCase() || 'A'}
            </div>
            <div>
              <div className="text-sm font-semibold text-white font-mono">{user?.username}</div>
              <div className="text-xs text-[#1e90ff] capitalize font-mono tracking-wide">{user?.role}</div>
            </div>
          </div>

          {loading ? (
            <div className="text-[#888] text-sm text-center py-8">Loading admin data...</div>
          ) : (
            <>
              <div className="bg-[#1035AC] rounded-lg p-4 border border-[#1035AC]/30 text-center">
                <div className="text-3xl font-bold text-white font-mono">{userCount}</div>
                <div className="text-xs text-blue-100 uppercase tracking-wider mt-1">Total Users</div>
              </div>

              <div className="flex gap-2 bg-[#0a0a0a] p-1 rounded border border-[#2a2a2a]">
                <button
                  onClick={() => setActiveTab('pending')}
                  className={`flex-1 py-2 px-3 text-xs rounded transition-all font-mono ${
                    activeTab === 'pending'
                      ? 'bg-[#1035AC] text-white font-bold'
                      : 'text-[#888] hover:text-white'
                  }`}
                >
                  Pending ({pendingUsers.length})
                </button>
                <button
                  onClick={() => setActiveTab('all')}
                  className={`flex-1 py-2 px-3 text-xs rounded transition-all font-mono ${
                    activeTab === 'all'
                      ? 'bg-[#1035AC] text-white font-bold'
                      : 'text-[#888] hover:text-white'
                  }`}
                >
                  All Users
                </button>
              </div>

              {error && (
                <div className="p-3 bg-red-900/50 border border-red-500 rounded-lg text-red-200 text-xs">
                  {error}
                </div>
              )}

              {activeTab === 'pending' && (
                <div className="bg-[#1035AC] rounded-lg p-4 border border-[#1035AC]/30 space-y-2">
                  <h2 className="text-xs font-semibold text-white uppercase tracking-wider mb-3 flex items-center gap-2">
                    <Users className="w-3.5 h-3.5" />
                    User Approvals
                  </h2>
                  {pendingUsers.length === 0 ? (
                    <div className="text-blue-100 text-sm">No pending approvals</div>
                  ) : (
                    <div className="space-y-2">
                      {pendingUsers.map((u) => (
                        <div key={u.username} className="flex items-center justify-between p-3 bg-[#0a1e5e] rounded-lg border border-[#1035AC]/50">
                          <div>
                            <div className="text-sm font-medium text-white font-mono">{u.username}</div>
                            <div className="text-xs text-blue-200/60">
                              {new Date(u.created_at).toLocaleDateString()}
                            </div>
                          </div>
                          <div className="flex gap-1.5">
                            <button
                              onClick={() => handleApprove(u.username)}
                              disabled={actionInProgress}
                              className="flex items-center gap-1 px-2 py-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white text-xs rounded transition-colors"
                            >
                              <CheckCircle className="w-3 h-3" /> Approve
                            </button>
                            <button
                              onClick={() => handleReject(u.username)}
                              disabled={actionInProgress}
                              className="flex items-center gap-1 px-2 py-1 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 text-white text-xs rounded transition-colors"
                            >
                              <XCircle className="w-3 h-3" /> Reject
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'all' && (
                <div className="bg-[#1035AC] rounded-lg p-4 border border-[#1035AC]/30">
                  <h2 className="text-xs font-semibold text-white uppercase tracking-wider mb-3 flex items-center gap-2">
                    <Users className="w-3.5 h-3.5" />
                    User Management
                  </h2>
                  <div className="space-y-2">
                    {allUsers.map((u) => (
                      <div key={u.username} className="bg-[#0a1e5e] rounded-lg border border-[#1035AC]/50">
                        <button
                          onClick={() => setExpandedUser(expandedUser === u.username ? null : u.username)}
                          className="w-full flex items-center justify-between p-3 hover:bg-[#0f2577] transition-colors rounded-lg"
                        >
                          <div className="flex items-center gap-2 text-left">
                            <Users className="w-3.5 h-3.5 text-blue-300 flex-shrink-0" />
                            <div>
                              <div className="text-sm font-medium text-white font-mono">{u.username}</div>
                              <div className="text-xs text-blue-200/60">
                                {u.role === 'admin' ? '👑 Admin' : '👤 User'} · {u.approved ? '✓ Active' : '⏳ Pending'}
                              </div>
                            </div>
                          </div>
                          <Eye className="w-3.5 h-3.5 text-blue-300 flex-shrink-0" />
                        </button>

                        {expandedUser === u.username && (
                          <div className="border-t border-[#1035AC]/30 p-3 space-y-2">
                            <button
                              onClick={() => setResetPasswordUser(u.username)}
                              disabled={actionInProgress}
                              className="w-full flex items-center gap-2 px-3 py-2 bg-[#1035AC]/50 hover:bg-[#1035AC]/70 disabled:opacity-50 text-blue-100 text-xs rounded transition-colors"
                            >
                              <Key className="w-3.5 h-3.5" /> Reset Password
                            </button>
                            {u.username !== 'Admin' && (
                              <button
                                onClick={() => handleDeleteUser(u.username)}
                                disabled={actionInProgress}
                                className="w-full flex items-center gap-2 px-3 py-2 bg-red-600/50 hover:bg-red-600 disabled:opacity-50 text-white text-xs rounded transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" /> Delete User
                              </button>
                            )}
                          </div>
                        )}

                        {resetPasswordUser === u.username && (
                          <div className="border-t border-[#1035AC]/30 p-3 space-y-2">
                            <input
                              type="text"
                              value={resetPasswordValue}
                              onChange={(e) => setResetPasswordValue(e.target.value)}
                              placeholder="Enter new password"
                              className="w-full bg-[#0a1e5e] border border-[#1035AC]/50 rounded px-2 py-1.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-white/30 font-mono"
                            />
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleResetPassword(u.username)}
                                disabled={actionInProgress}
                                className="flex-1 bg-[#1e90ff] hover:bg-[#1678d4] disabled:opacity-50 text-white text-xs py-1.5 rounded transition-colors font-mono"
                              >
                                Confirm
                              </button>
                              <button
                                onClick={() => { setResetPasswordUser(null); setResetPasswordValue('') }}
                                className="flex-1 bg-[#1035AC]/50 hover:bg-[#1035AC]/70 text-blue-100 text-xs py-1.5 rounded transition-colors font-mono"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default AdminModal
