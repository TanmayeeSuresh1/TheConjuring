import { useEffect, useState } from 'react'
import api from '../../services/api'
import toast from 'react-hot-toast'
import { User } from 'lucide-react'

export default function PatientProfile() {
  const [profile, setProfile] = useState(null)

  useEffect(() => {
    api.get('/patients/me').then(r => setProfile(r.data)).catch(() => toast.error('Failed'))
  }, [])

  if (!profile) return <div className="flex items-center justify-center h-64 text-gray-400">Loading...</div>

  const fields = [
    ['Full Name',         `${profile.first_name} ${profile.last_name}`],
    ['Date of Birth',     profile.date_of_birth?.split('T')[0]],
    ['Gender',            profile.gender],
    ['Phone',             profile.phone_number],
    ['Email',             profile.email],
    ['Address',           profile.address || '—'],
    ['Insurance Details', profile.insurance_details || '—'],
    ['Emergency Contact', profile.emergency_contact || '—'],
    ['Member Since',      profile.created_at?.split('T')[0]],
  ]

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">My Profile</h1>
      <div className="card">
        <div className="flex items-center gap-4 mb-6 pb-6 border-b border-gray-200 dark:border-gray-700">
          <div className="w-16 h-16 bg-primary-100 dark:bg-primary-900/30 rounded-2xl flex items-center justify-center">
            <User size={28} className="text-primary-600 dark:text-primary-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">{profile.first_name} {profile.last_name}</h2>
            <p className="text-gray-500 dark:text-gray-400 text-sm">{profile.email}</p>
          </div>
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          {fields.map(([label, value]) => (
            <div key={label} className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{label}</p>
              <p className="text-sm font-medium text-gray-900 dark:text-white">{value}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
