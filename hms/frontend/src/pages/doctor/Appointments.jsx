import { useEffect, useState } from 'react'
import api from '../../services/api'
import DataTable from '../../components/DataTable'
import StatusBadge from '../../components/StatusBadge'
import Modal from '../../components/Modal'
import toast from 'react-hot-toast'
import { Pencil } from 'lucide-react'

export default function DoctorAppointments() {
  const [appts,   setAppts]   = useState([])
  const [modal,   setModal]   = useState(null)
  const [editing, setEditing] = useState(null)
  const [status,  setStatus]  = useState('')
  const [notes,   setNotes]   = useState('')

  const load = () => api.get('/appointments?limit=100')
    .then(r => setAppts(r.data)).catch(() => toast.error('Failed'))
  useEffect(() => { load() }, [])

  const handleUpdate = async e => {
    e.preventDefault()
    try {
      await api.put(`/appointments/${editing}`, { status, notes })
      toast.success('Updated'); setModal(null); load()
    } catch (err) { toast.error(err.response?.data?.detail ?? 'Error') }
  }

  const columns = [
    { header: 'Patient', accessor: 'patient_name' },
    { header: 'Date',    accessor: 'appointment_date' },
    { header: 'Time',    render: r => r.appointment_time?.slice(0,5) },
    { header: 'Reason',  render: r => <span className="truncate max-w-xs block">{r.reason_for_visit}</span> },
    { header: 'Status',  render: r => <StatusBadge status={r.status} /> },
    { header: 'Actions', render: r => (
      <button onClick={() => { setEditing(r.appointment_id); setStatus(r.status); setNotes(r.notes || ''); setModal('edit') }}
        className="p-1.5 rounded hover:bg-blue-50 dark:hover:bg-blue-900/20 text-blue-600"><Pencil size={14} /></button>
    )},
  ]

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">My Appointments</h1>
      <DataTable columns={columns} data={appts} searchPlaceholder="Search..." />

      {modal === 'edit' && (
        <Modal title="Update Appointment" onClose={() => setModal(null)}>
          <form onSubmit={handleUpdate} className="space-y-4">
            <div>
              <label className="label">Status</label>
              <select className="input" value={status} onChange={e => setStatus(e.target.value)}>
                <option>Scheduled</option><option>Completed</option><option>Cancelled</option><option>No-Show</option>
              </select>
            </div>
            <div>
              <label className="label">Notes</label>
              <textarea className="input" rows={3} value={notes} onChange={e => setNotes(e.target.value)} />
            </div>
            <div className="flex justify-end gap-3">
              <button type="button" onClick={() => setModal(null)} className="btn-secondary">Cancel</button>
              <button type="submit" className="btn-primary">Update</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}
