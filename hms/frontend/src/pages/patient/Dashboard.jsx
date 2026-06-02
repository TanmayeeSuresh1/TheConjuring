import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../../services/api'
import StatCard from '../../components/StatCard'
import { CalendarDays, FileText, CreditCard, Clock } from 'lucide-react'
import toast from 'react-hot-toast'

export default function PatientDashboard() {
  const [stats, setStats] = useState(null)
  const [appts, setAppts] = useState([])

  useEffect(() => {
    Promise.all([
      api.get('/dashboard/patient-stats'),
      api.get('/appointments?limit=3'),
    ]).then(([s, a]) => { setStats(s.data); setAppts(a.data) })
      .catch(() => toast.error('Failed'))
  }, [])

  if (!stats) return <div className="flex items-center justify-center h-64 text-gray-400">Loading...</div>

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Patient Dashboard</h1>
        <p className="text-gray-500 text-sm mt-1">Your health at a glance</p>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Appointments"  value={stats.total_appointments}   icon={CalendarDays} color="blue"   />
        <StatCard title="Upcoming"            value={stats.upcoming_appointments} icon={Clock}        color="green"  />
        <StatCard title="Medical Records"     value={stats.total_records}        icon={FileText}     color="purple" />
        <StatCard title="Outstanding Bills"   value={`$${stats.total_due.toFixed(2)}`} icon={CreditCard} color="red" />
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">Upcoming Appointments</h2>
            <Link to="/patient/appointments" className="text-xs text-primary-600 hover:underline">View all</Link>
          </div>
          {appts.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-6">No upcoming appointments</p>
          ) : (
            <div className="space-y-3">
              {appts.map(a => (
                <div key={a.appointment_id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div>
                    <p className="font-medium text-sm text-gray-900 dark:text-white">{a.doctor_name}</p>
                    <p className="text-xs text-gray-500">{a.reason_for_visit || 'General Visit'}</p>
                  </div>
                  <div className="text-right text-xs text-gray-500">
                    <p>{a.appointment_date}</p>
                    <p>{a.appointment_time?.slice(0,5)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-4">Quick Actions</h2>
          <div className="space-y-2">
            {[
              { to: '/patient/book',         label: 'Book an Appointment', icon: CalendarDays, color: 'blue' },
              { to: '/patient/records',      label: 'View Medical Records', icon: FileText,    color: 'purple' },
              { to: '/patient/billing',      label: 'View Billing',         icon: CreditCard,  color: 'green' },
            ].map(item => (
              <Link key={item.to} to={item.to}
                className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                <item.icon size={16} className={`text-${item.color}-600 dark:text-${item.color}-400`} />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{item.label}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
