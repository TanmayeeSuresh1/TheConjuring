import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import toast from 'react-hot-toast'
import { Heart, Eye, EyeOff } from 'lucide-react'

export default function LoginPage() {
  const { login } = useAuth()
  const navigate  = useNavigate()
  const [form, setForm] = useState({ username: '', password: '' })
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async e => {
    e.preventDefault()
    setLoading(true)
    try {
      const data = await login(form.username, form.password)
      toast.success('Welcome back!')
      navigate(`/${data.role}`)
    } catch (err) {
      toast.error(err.response?.data?.detail ?? 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  const fillDemo = role => {
    const demos = {
      admin:   { username: 'admin',       password: 'Password@123' },
      doctor:  { username: 'dr.hayes',    password: 'Password@123' },
      patient: { username: 'james.wilson',password: 'Password@123' },
    }
    setForm(demos[role])
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-blue-100 dark:from-gray-900 dark:to-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-primary-600 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <Heart size={22} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Sign in to MediCare</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Healthcare Management System</p>
        </div>

        <div className="card">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Username</label>
              <input className="input" placeholder="Enter your username"
                value={form.username} onChange={e => setForm(p => ({...p, username: e.target.value}))} required />
            </div>
            <div>
              <label className="label">Password</label>
              <div className="relative">
                <input className="input pr-10" type={showPw ? 'text' : 'password'} placeholder="Enter your password"
                  value={form.password} onChange={e => setForm(p => ({...p, password: e.target.value}))} required />
                <button type="button" onClick={() => setShowPw(s => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full py-2.5">
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2 text-center">Demo accounts</p>
            <div className="flex gap-2">
              {['admin','doctor','patient'].map(r => (
                <button key={r} onClick={() => fillDemo(r)}
                  className="flex-1 text-xs py-1.5 rounded-lg border border-gray-200 dark:border-gray-700
                             hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400 capitalize transition-colors">
                  {r}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-4 text-center text-sm text-gray-500 dark:text-gray-400 space-y-1">
            <p><Link to="/forgot-password" className="text-primary-600 hover:underline">Forgot password?</Link></p>
            <p>No account? <Link to="/register" className="text-primary-600 hover:underline">Register</Link></p>
          </div>
        </div>
      </div>
    </div>
  )
}
