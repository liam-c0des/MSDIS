import React, { useEffect, useState } from 'react'
import { CheckCircle, XCircle, Users, Trash2, Key, Eye } from 'lucide-react'
import axios from 'axios'

function AdminPanel() {
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
    fetchAdminData()
  }, [])

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
      console.error('Error fetching admin data:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async (username) => {
    setActionInProgress(true)
    try {
      await axios.post('/api/admin/approve-user', { username })
      setPendingUsers(pendingUsers.filter(u => u.username !== username))
      setError(null)
    } catch (err) {
      setError(`Failed to approve ${username}`)
      console.error('Error approving user:', err)
    } finally {
      setActionInProgress(false)
    }
  }

  const handleReject = async (username) => {
    if (!window.confirm(`Are you sure you want to reject ${username}?`)) {
      return
    }
    setActionInProgress(true)
    try {
      await axios.post('/api/admin/reject-user', { username })
      setPendingUsers(pendingUsers.filter(u => u.username !== username))
      setError(null)
    } catch (err) {
      setError(`Failed to reject ${username}`)
      console.error('Error rejecting user:', err)
    } finally {
      setActionInProgress(false)
    }
  }

  const handleResetPassword = async (username) => {
    if (!resetPasswordValue.trim()) {
      setError('Password cannot be empty')
      return
    }
    
    setActionInProgress(true)
    try {
      await axios.post('/api/admin/reset-password', {
        username,
        password: resetPasswordValue
      })
      setResetPasswordUser(null)
      setResetPasswordValue('')
      setError(null)
      alert(`Password reset for ${username}. New password: ${resetPasswordValue}`)
    } catch (err) {
      setError(`Failed to reset password for ${username}`)
      console.error('Error resetting password:', err)
    } finally {
      setActionInProgress(false)
    }
  }

  const handleDeleteUser = async (username) => {
    if (!window.confirm(`Are you sure you want to delete ${username}? This cannot be undone.`)) {
      return
    }
    
    setActionInProgress(true)
    try {
      await axios.post('/api/admin/delete-user', { username })
      setAllUsers(allUsers.filter(u => u.username !== username))
      setUserCount(userCount - 1)
      setError(null)
    } catch (err) {
      setError(`Failed to delete ${username}`)
      console.error('Error deleting user:', err)
    } finally {
      setActionInProgress(false)
    }
  }

  if (loading) {
    return <div className="text-[#888] text-sm">Loading admin data...</div>
  }

  return (
    <div className="mb-8 space-y-4">
      {/* User Count Summary */}
      <div className="bg-[#1035AC] rounded-lg p-4 border border-[#1035AC]/30">
        <div className="text-center">
          <div className="text-3xl font-bold text-white">{userCount}</div>
          <div className="text-xs text-blue-100 uppercase tracking-wider mt-1">Total Users</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 bg-[#0a0a0a] p-1 rounded border border-[#2a2a2a]">
        <button
          onClick={() => setActiveTab('pending')}
          className={`flex-1 py-2 px-3 text-xs rounded transition-all ${
            activeTab === 'pending'
              ? 'bg-[#1035AC] text-white font-bold'
              : 'text-[#888] hover:text-white'
          }`}
        >
          Pending ({pendingUsers.length})
        </button>
        <button
          onClick={() => setActiveTab('all')}
          className={`flex-1 py-2 px-3 text-xs rounded transition-all ${
            activeTab === 'all'
              ? 'bg-[#1035AC] text-white font-bold'
              : 'text-[#888] hover:text-white'
          }`}
        >
          All Users
        </button>
      </div>

      {error && (
        <div className="p-3 bg-red-900/50 border border-red-500 rounded-lg text-red-200 text-sm">
          {error}
        </div>
      )}

      {/* Pending Users Tab */}
      {activeTab === 'pending' && (
        <div className="bg-[#1035AC] rounded-lg p-4 border border-[#1035AC]/30 space-y-2">
          <h2 className="text-sm font-semibold text-white uppercase tracking-wider mb-3 flex items-center gap-2">
            <Users className="w-4 h-4" />
            User Approvals
          </h2>
          {pendingUsers.length === 0 ? (
            <div className="text-blue-100 text-sm">No pending approvals</div>
          ) : (
            <div className="space-y-2">
              {pendingUsers.map((user) => (
                <div key={user.username} className="flex items-center justify-between p-3 bg-[#0a1e5e] rounded-lg border border-[#1035AC]/50">
                  <div>
                    <div className="text-sm font-medium text-white">{user.username}</div>
                    <div className="text-xs text-blue-200/60">
                      Registered: {new Date(user.created_at).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleApprove(user.username)}
                      disabled={actionInProgress}
                      className="flex items-center gap-1 px-3 py-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white text-xs rounded transition-colors"
                    >
                      <CheckCircle className="w-4 h-4" />
                      Approve
                    </button>
                    <button
                      onClick={() => handleReject(user.username)}
                      disabled={actionInProgress}
                      className="flex items-center gap-1 px-3 py-1 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 text-white text-xs rounded transition-colors"
                    >
                      <XCircle className="w-4 h-4" />
                      Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* All Users Tab */}
      {activeTab === 'all' && (
        <div className="bg-[#1035AC] rounded-lg p-4 border border-[#1035AC]/30">
          <h2 className="text-sm font-semibold text-white uppercase tracking-wider mb-3 flex items-center gap-2">
            <Users className="w-4 h-4" />
            User Management
          </h2>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {allUsers.map((user) => (
              <div key={user.username} className="bg-[#0a1e5e] rounded-lg border border-[#1035AC]/50">
                <button
                  onClick={() => setExpandedUser(expandedUser === user.username ? null : user.username)}
                  className="w-full flex items-center justify-between p-3 hover:bg-[#0f2577] transition-colors"
                >
                  <div className="flex items-center gap-2 flex-1 text-left">
                    <Users className="w-4 h-4 text-blue-300" />
                    <div>
                      <div className="text-sm font-medium text-white">{user.username}</div>
                      <div className="text-xs text-blue-200/60">
                        {user.role === 'admin' ? '👑 Admin' : '👤 User'} • {user.approved ? '✓ Approved' : '⏳ Pending'}
                      </div>
                    </div>
                  </div>
                  <Eye className="w-4 h-4 text-blue-300" />
                </button>

                {expandedUser === user.username && (
                  <div className="border-t border-[#1035AC]/30 p-3 space-y-2">
                    <button
                      onClick={() => setResetPasswordUser(user.username)}
                      disabled={actionInProgress}
                      className="w-full flex items-center gap-2 px-3 py-2 bg-[#1035AC]/50 hover:bg-[#1035AC]/70 disabled:opacity-50 text-blue-100 text-xs rounded transition-colors"
                    >
                      <Key className="w-4 h-4" />
                      Reset Password
                    </button>
                    {user.username !== 'Admin' && (
                      <button
                        onClick={() => handleDeleteUser(user.username)}
                        disabled={actionInProgress}
                        className="w-full flex items-center gap-2 px-3 py-2 bg-red-600/50 hover:bg-red-600 disabled:opacity-50 text-white text-xs rounded transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                        Delete User
                      </button>
                    )}
                  </div>
                )}

                {resetPasswordUser === user.username && (
                  <div className="border-t border-[#1035AC]/30 p-3 space-y-2">
                    <input
                      type="text"
                      value={resetPasswordValue}
                      onChange={(e) => setResetPasswordValue(e.target.value)}
                      placeholder="Enter new password"
                      className="w-full bg-[#0a1e5e] border border-[#1035AC]/50 rounded px-2 py-1 text-sm text-white focus:outline-none focus:ring-2 focus:ring-white/30"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleResetPassword(user.username)}
                        disabled={actionInProgress}
                        className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs py-1 rounded transition-colors"
                      >
                        Confirm
                      </button>
                      <button
                        onClick={() => {
                          setResetPasswordUser(null)
                          setResetPasswordValue('')
                        }}
                        className="flex-1 bg-[#1035AC]/50 hover:bg-[#1035AC]/70 text-blue-100 text-xs py-1 rounded transition-colors"
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
    </div>
  )
}

export default AdminPanel
