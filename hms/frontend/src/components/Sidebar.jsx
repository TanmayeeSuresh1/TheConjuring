import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import { Sun, Moon, LogOut, Heart } from 'lucide-react'
import clsx from 'clsx'

export default function Sidebar({ links }) {
  const { user, logout } = useAuth()
  const { dark, toggle } = useTheme()
  const navigate = useNavigate()

  const handleLogout = () => { logout(); navigate('/login') }

  return (
    <aside className="w-64 min-h-screen bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 flex flex-col shadow-sm">
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-gray-200 dark:border-gray-800">
        <div className="w-9 h-9 bg-primary-600 rounded-lg flex items-center justify-center">
          <Heart size={18} className="text-white" />
        </div>
        <div>
          <p className="font-bold text-gray-900 dark:text-white text-sm leading-tight">MediCare</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">{user?.role} Portal</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {links.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to} to={to} end={to.split('/').length === 2}
            className={({ isActive }) => clsx(
              'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all',
              isActive
                ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-100'
            )}
          >
            <Icon size={17} />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Bottom */}
      <div className="px-3 py-4 border-t border-gray-200 dark:border-gray-800 space-y-1">
        <button onClick={toggle} className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all">
          {dark ? <Sun size={17} /> : <Moon size={17} />}
          {dark ? 'Light Mode' : 'Dark Mode'}
        </button>
        <button onClick={handleLogout} className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all">
          <LogOut size={17} />
          Sign Out
        </button>
        <div className="px-3 pt-3">
          <p className="text-xs font-medium text-gray-900 dark:text-white truncate">{user?.username}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">{user?.role}</p>
        </div>
      </div>
    </aside>
  )
}
