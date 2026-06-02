import { useEffect, useState } from 'react'
import api from '../../services/api'
import StatCard from '../../components/StatCard'
import { Users, CalendarDays, FileText, Clock } from 'lucide-react'
import toast from 'react-hot-toast'

export default function DoctorDashboard() {
  const [stats, setStats] = useState(null)
  const [appts, setAppts] = useState([])

  useEffect(() => {
    Promise.all([
      api.get('/dashboard/doctor-stats'),
      api.get('/appointments?limit=5'),
    ]).then(([s, a]) => { setStats(s.data); setAppts(a.data) })
      .catch(() => toast.error('Failed to load dashboard'))
  }, [])

  if (!stats) return <div className="flex items-center justify-center h-64 text-gray-400">Loading...</div>

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Doctor Dashboard</h1>
        <p className="text-gray-500 text-sm mt-1">Your overview for today</p>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard title="Total Patients"      value={stats.total_patients}       icon={Users}       color="blue"   />
        <StatCard title="Today's Appointments"value={stats.todays_appointments}  icon={CalendarDays} color="green"  />
        <StatCard title="Upcoming"            value={stats.upcoming_appointments} icon={Clock}       color="yellow" />
        <StatCard title="Total Appointments"  value={stats.total_appointments}   icon={CalendarDays} color="purple" />
        <StatCard title="Medical Records"     value={stats.total_records}        icon={FileText}    color="blue"   />
      </div>

      <div className="card">
        <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-4">Recent Appointments</h2>
        {appts.length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-8">No appointments found</p>
        ) : (
          <div className="space-y-3">
            {appts.map(a => (
              <div key={a.appointment_id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900 dark:text-white text-sm">{a.patient_name}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{a.reason_for_visit || 'General'}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-700 dark:text-gray-300">{a.appointment_date}</p>
                  <p className="text-xs text-gray-500">{a.appointment_time?.slice(0,5)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
