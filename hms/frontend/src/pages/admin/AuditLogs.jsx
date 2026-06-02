import { useEffect, useState } from 'react'
import api from '../../services/api'
import toast from 'react-hot-toast'
import { ShieldAlert } from 'lucide-react'

export default function AuditLogs() {
  const [logs,    setLogs]    = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/dashboard/audit-logs?limit=100')
      .then(r => setLogs(r.data))
      .catch(() => toast.error('Failed to load audit logs'))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <ShieldAlert size={24} className="text-primary-600" />
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Audit Logs</h1>
      </div>
      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800/50">
              <tr>
                {['Table','Operation','Record ID','Changed By','Changed At'].map(h => (
                  <th key={h} className="table-header">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {loading ? (
                <tr><td colSpan={5} className="text-center py-10 text-gray-400">Loading...</td></tr>
              ) : logs.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-10 text-gray-400">No audit logs found</td></tr>
              ) : logs.map(log => (
                <tr key={log.log_id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30">
                  <td className="table-cell font-medium">{log.table_name}</td>
                  <td className="table-cell">
                    <span className={`badge ${log.operation === 'UPDATE' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300' : log.operation === 'DELETE' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'}`}>
                      {log.operation}
                    </span>
                  </td>
                  <td className="table-cell">{log.record_id}</td>
                  <td className="table-cell">{log.changed_by ?? '—'}</td>
                  <td className="table-cell text-gray-400">{new Date(log.changed_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
