import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../../services/api'
import DataTable from '../../components/DataTable'
import StatusBadge from '../../components/StatusBadge'
import Modal from '../../components/Modal'
import toast from 'react-hot-toast'
import { PlusCircle, X } from 'lucide-react'

export default function PatientAppointments() {
  const [appts,   setAppts]   = useState([])
  const [editing, setEditing] = useState(null)

  const load = () => api.get('/appointments?limit=100')
    .then(r => setAppts(r.data)).catch(() => toast.error('Failed'))
  useEffect(() => { load() }, [])

  const handleCancel = async id => {
    if (!confirm('Cancel this appointment?')) return
    try {
      await api.put(`/appointments/${id}`, { status: 'Cancelled' })
      toast.success('Appointment cancelled'); load()
    } catch (err) { toast.error(err.response?.data?.detail ?? 'Error') }
  }

  const columns = [
    { header: 'Doctor',   accessor: 'doctor_name' },
    { header: 'Date',     accessor: 'appointment_date' },
    { header: 'Time',     render: r => r.appointment_time?.slice(0,5) },
    { header: 'Reason',   accessor: 'reason_for_visit' },
    { header: 'Status',   render: r => <StatusBadge status={r.status} /> },
    { header: 'Actions',  render: r => r.status === 'Scheduled' ? (
      <button onClick={() => handleCancel(r.appointment_id)} className="flex items-center gap-1 text-xs text-red-600 hover:text-red-700 font-medium">
        <X size={13} />Cancel
      </button>
    ) : null },
  ]

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">My Appointments</h1>
        <Link to="/patient/book" className="btn-primary flex items-center gap-2 text-sm py-2">
          <PlusCircle size={15} />Book New
        </Link>
      </div>
      <DataTable columns={columns} data={appts} searchPlaceholder="Search appointments..." />
    </div>
  )
}
