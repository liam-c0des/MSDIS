import React, { useState, useEffect } from 'react'
import { Clock, LogOut, ShieldCheck } from 'lucide-react'

function Header({ user, onLogout, onAdminOpen }) {
  const [currentDateTime, setCurrentDateTime] = useState(new Date())
  const [useUTC, setUseUTC] = useState(false)

  useEffect(() => {
    const timer = setInterval(() => setCurrentDateTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  const timeOpts = { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true }
  const dateOpts = { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' }

  const formattedTime = useUTC
    ? currentDateTime.toLocaleTimeString('en-US', { ...timeOpts, timeZone: 'UTC' })
    : currentDateTime.toLocaleTimeString('en-US', timeOpts)

  const formattedDate = useUTC
    ? currentDateTime.toLocaleDateString('en-US', { ...dateOpts, timeZone: 'UTC' })
    : currentDateTime.toLocaleDateString('en-US', dateOpts)

  return (
    <header className="bg-[#141414] border-b border-[#2a2a2a] px-6 py-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img src="/logo.png?v=1" alt="MSDIS Logo" className="w-14 h-14 object-contain" />
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">MSDIS</h1>
            <p className="text-xs text-[#888]">Maritime Search and Drift Intelligence System</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={() => setUseUTC(prev => !prev)}
            className="flex items-center gap-2 text-[#1035AC] text-sm hover:text-[#1e90ff] transition-colors group"
            title={useUTC ? 'Switch to local time' : 'Switch to UTC'}
          >
            <Clock className="w-4 h-4 flex-shrink-0" />
            <div className="text-right">
              <div className="font-medium font-mono">{formattedTime}</div>
              <div className="text-xs text-[#666] group-hover:text-[#888]">{formattedDate}</div>
              <div className={`text-xs font-mono font-bold tracking-widest mt-0.5 ${useUTC ? 'text-[#1e90ff]' : 'text-[#555]'}`}>
                {useUTC ? 'UTC' : 'LOCAL'}
              </div>
            </div>
          </button>

          <div className="flex items-center gap-3 border-l border-[#2a2a2a] pl-4">
            {user?.role === 'admin' && (
              <button
                onClick={onAdminOpen}
                className="flex items-center gap-1.5 font-mono text-xs px-3 py-1.5 rounded border border-[#1e90ff] text-[#1e90ff] hover:bg-[#1e90ff]/10 transition-colors tracking-wider"
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                ADMIN
              </button>
            )}
            <button
              onClick={onLogout}
              className="p-2 hover:bg-[#1e1e1e] rounded transition-colors text-[#888] hover:text-[#1035AC]"
              title="Logout"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </header>
  )
}

export default Header
