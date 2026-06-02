import { useEffect, useState } from 'react'
import api from '../../services/api'
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import toast from 'react-hot-toast'

export default function Analytics() {
  const [revenue, setRevenue] = useState([])
  const [stats,   setStats]   = useState(null)

  useEffect(() => {
    Promise.all([
      api.get('/billing/revenue-by-month'),
      api.get('/billing/stats'),
    ]).then(([r, s]) => {
      setRevenue(r.data.reverse())
      setStats(s.data)
    }).catch(() => toast.error('Failed to load analytics'))
  }, [])

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Analytics & Revenue</h1>

      {stats && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Total Billed',     value: `$${parseFloat(stats.total_billed).toLocaleString()}`,     color: 'text-blue-600' },
            { label: 'Total Collected',  value: `$${parseFloat(stats.total_collected).toLocaleString()}`,  color: 'text-green-600' },
            { label: 'Outstanding',      value: `$${parseFloat(stats.total_pending).toLocaleString()}`,    color: 'text-red-600' },
            { label: 'Insurance Claims', value: `$${parseFloat(stats.insurance_claimed).toLocaleString()}`,color: 'text-purple-600' },
          ].map(s => (
            <div key={s.label} className="card text-center">
              <p className="text-sm text-gray-500 dark:text-gray-400">{s.label}</p>
              <p className={`text-2xl font-bold mt-1 ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>
      )}

      <div className="card">
        <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-4">Revenue Trend (Last 12 Months)</h2>
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={revenue}>
            <defs>
              <linearGradient id="billed"    x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#3b82f6" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="collected" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#10b981" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="month" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} tickFormatter={v => `$${v}`} />
            <Tooltip formatter={v => [`$${parseFloat(v).toLocaleString()}`]} />
            <Area type="monotone" dataKey="total_charged"   name="Billed"     stroke="#3b82f6" fill="url(#billed)"    strokeWidth={2} />
            <Area type="monotone" dataKey="total_collected" name="Collected"  stroke="#10b981" fill="url(#collected)" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="card">
        <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-4">Monthly Bill Count</h2>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={revenue}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="month" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip />
            <Bar dataKey="total_bills" name="Bills" fill="#8b5cf6" radius={[4,4,0,0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
