import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import api from '../../services/api'
import toast from 'react-hot-toast'
import { Heart } from 'lucide-react'

export default function RegisterPage() {
  const navigate = useNavigate()
  const [form, setForm] = useState({ username:'', password:'', role:'patient', linked_patient_id:'', linked_doctor_id:'' })
  const [loading, setLoading] = useState(false)

  const set = k => e => setForm(p => ({...p, [k]: e.target.value}))

  const handleSubmit = async e => {
    e.preventDefault()
    setLoading(true)
    try {
      const payload = {
        username: form.username, password: form.password, role: form.role,
        linked_patient_id: form.role === 'patient' ? parseInt(form.linked_patient_id) : null,
        linked_doctor_id:  form.role === 'doctor'  ? parseInt(form.linked_doctor_id)  : null,
      }
      await api.post('/auth/register', payload)
      toast.success('Account created! Please sign in.')
      navigate('/login')
    } catch (err) {
      toast.error(err.response?.data?.detail ?? 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-blue-100 dark:from-gray-900 dark:to-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-primary-600 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <Heart size={22} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Create an account</h1>
        </div>
        <div className="card">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Username</label>
              <input className="input" placeholder="Choose a username" value={form.username} onChange={set('username')} required />
            </div>
            <div>
              <label className="label">Password</label>
              <input className="input" type="password" placeholder="Min 8 characters" value={form.password} onChange={set('password')} required />
            </div>
            <div>
              <label className="label">Role</label>
              <select className="input" value={form.role} onChange={set('role')}>
                <option value="patient">Patient</option>
                <option value="doctor">Doctor</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            {form.role === 'patient' && (
              <div>
                <label className="label">Patient ID (linked record)</label>
                <input className="input" type="number" placeholder="Enter your patient ID" value={form.linked_patient_id} onChange={set('linked_patient_id')} required />
              </div>
            )}
            {form.role === 'doctor' && (
              <div>
                <label className="label">Doctor ID (linked record)</label>
                <input className="input" type="number" placeholder="Enter your doctor ID" value={form.linked_doctor_id} onChange={set('linked_doctor_id')} required />
              </div>
            )}
            <button type="submit" disabled={loading} className="btn-primary w-full py-2.5">
              {loading ? 'Creating...' : 'Create Account'}
            </button>
          </form>
          <p className="mt-4 text-center text-sm text-gray-500 dark:text-gray-400">
            Already have an account? <Link to="/login" className="text-primary-600 hover:underline">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
