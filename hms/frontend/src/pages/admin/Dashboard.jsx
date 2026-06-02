import { useEffect, useState } from 'react'
import { Users, Stethoscope, CalendarDays, DollarSign, CheckCircle, Clock } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts'
import api from '../../services/api'
import StatCard from '../../components/StatCard'
import toast from 'react-hot-toast'

const COLORS = ['#3b82f6','#10b981','#f59e0b','#ef4444','#8b5cf6','#06b6d4']

export default function AdminDashboard() {
  const [stats,  setStats]  = useState(null)
  const [trends, setTrends] = useState([])
  const [spec,   setSpec]   = useState([])

  useEffect(() => {
    Promise.all([
      api.get('/dashboard/stats'),
      api.get('/dashboard/appointment-trends'),
      api.get('/dashboard/specialization-distribution'),
    ]).then(([s, t, sp]) => {
      setStats(s.data)
      setTrends(t.data.reverse())
      setSpec(sp.data)
    }).catch(() => toast.error('Failed to load dashboard'))
  }, [])

  if (!stats) return <div className="flex items-center justify-center h-64 text-gray-400">Loading dashboard...</div>

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Admin Dashboard</h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">System-wide overview</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Patients"    value={stats.total_patients}      icon={Users}       color="blue"   />
        <StatCard title="Total Doctors"     value={stats.total_doctors}       icon={Stethoscope} color="green"  />
        <StatCard title="Today's Appointments" value={stats.todays_appointments} icon={CalendarDays} color="yellow" />
        <StatCard title="Total Revenue"     value={`$${stats.total_revenue.toLocaleString()}`} icon={DollarSign} color="purple" />
        <StatCard title="Completed Visits"  value={stats.completed_visits}    icon={CheckCircle} color="green"  />
        <StatCard title="Scheduled"         value={stats.scheduled}           icon={Clock}       color="blue"   />
        <StatCard title="Pending Bills"     value={`$${stats.pending_bills.toLocaleString()}`} icon={DollarSign} color="red" />
        <StatCard title="Total Appointments" value={stats.total_appointments}  icon={CalendarDays} color="purple" />
      </div>

      {/* Charts */}
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="card">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-4">Appointment Trends (6 months)</h2>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={trends}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="completed" name="Completed" fill="#10b981" radius={[4,4,0,0]} />
              <Bar dataKey="cancelled"  name="Cancelled"  fill="#ef4444" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-4">Appointments by Specialization</h2>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie data={spec} dataKey="count" nameKey="specialization" cx="50%" cy="50%" outerRadius={90} label={({ specialization, percent }) => `${(percent*100).toFixed(0)}%`}>
                {spec.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Legend formatter={val => <span className="text-xs text-gray-600 dark:text-gray-400">{val}</span>} />
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
