import { useEffect, useState } from 'react'
import api from '../../services/api'
import DataTable from '../../components/DataTable'
import StatusBadge from '../../components/StatusBadge'
import Modal from '../../components/Modal'
import toast from 'react-hot-toast'
import { Plus, Pencil, Trash2 } from 'lucide-react'

const EMPTY = { patient_id:'', doctor_id:'', appointment_date:'', appointment_time:'', reason_for_visit:'', notes:'' }

export default function AdminAppointments() {
  const [appts,    setAppts]   = useState([])
  const [patients, setPatients]= useState([])
  const [doctors,  setDoctors] = useState([])
  const [modal,    setModal]   = useState(null)
  const [form,     setForm]    = useState(EMPTY)
  const [editing,  setEditing] = useState(null)

  const load = async () => {
    const [a, p, d] = await Promise.all([
      api.get('/appointments?limit=100'),
      api.get('/patients?limit=100'),
      api.get('/doctors?limit=100'),
    ])
    setAppts(a.data); setPatients(p.data); setDoctors(d.data)
  }
  useEffect(() => { load().catch(() => toast.error('Failed')) }, [])

  const set = k => e => setForm(p => ({...p, [k]: e.target.value}))

  const handleSubmit = async e => {
    e.preventDefault()
    try {
      const payload = {...form, patient_id: +form.patient_id, doctor_id: +form.doctor_id}
      if (editing) { await api.put(`/appointments/${editing}`, payload); toast.success('Updated') }
      else         { await api.post('/appointments', payload);           toast.success('Created') }
      setModal(null); load()
    } catch (err) { toast.error(err.response?.data?.detail ?? 'Error') }
  }

  const handleDelete = async id => {
    if (!confirm('Delete this appointment?')) return
    try { await api.delete(`/appointments/${id}`); toast.success('Deleted'); load() }
    catch (err) { toast.error(err.response?.data?.detail ?? 'Error') }
  }

  const columns = [
    { header: 'Patient',  accessor: 'patient_name' },
    { header: 'Doctor',   accessor: 'doctor_name' },
    { header: 'Date',     accessor: 'appointment_date' },
    { header: 'Time',     render: r => r.appointment_time?.slice(0,5) },
    { header: 'Reason',   render: r => <span className="truncate max-w-xs block">{r.reason_for_visit}</span> },
    { header: 'Status',   render: r => <StatusBadge status={r.status} /> },
    { header: 'Actions',  render: r => (
      <div className="flex gap-2">
        <button onClick={() => { setForm({...r, appointment_date: r.appointment_date, appointment_time: r.appointment_time?.slice(0,5)}); setEditing(r.appointment_id); setModal('form') }}
          className="p-1.5 rounded hover:bg-blue-50 dark:hover:bg-blue-900/20 text-blue-600"><Pencil size={14} /></button>
        <button onClick={() => handleDelete(r.appointment_id)}
          className="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500"><Trash2 size={14} /></button>
      </div>
    )},
  ]

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Appointments</h1>
      <DataTable columns={columns} data={appts} searchPlaceholder="Search appointments..."
        actions={<button onClick={() => { setForm(EMPTY); setEditing(null); setModal('form') }} className="btn-primary flex items-center gap-2 text-sm py-2"><Plus size={15}/>Schedule</button>} />

      {modal === 'form' && (
        <Modal title={editing ? 'Edit Appointment' : 'New Appointment'} onClose={() => setModal(null)}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Patient</label>
                <select className="input" value={form.patient_id} onChange={set('patient_id')} required>
                  <option value="">Select patient...</option>
                  {patients.map(p => <option key={p.patient_id} value={p.patient_id}>{p.first_name} {p.last_name}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Doctor</label>
                <select className="input" value={form.doctor_id} onChange={set('doctor_id')} required>
                  <option value="">Select doctor...</option>
                  {doctors.map(d => <option key={d.doctor_id} value={d.doctor_id}>{d.first_name} {d.last_name} — {d.specialization}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Date</label>
                <input className="input" type="date" value={form.appointment_date} onChange={set('appointment_date')} required />
              </div>
              <div>
                <label className="label">Time</label>
                <input className="input" type="time" value={form.appointment_time} onChange={set('appointment_time')} required />
              </div>
            </div>
            {editing && (
              <div>
                <label className="label">Status</label>
                <select className="input" value={form.status} onChange={set('status')}>
                  <option>Scheduled</option><option>Completed</option><option>Cancelled</option><option>No-Show</option>
                </select>
              </div>
            )}
            <div>
              <label className="label">Reason for Visit</label>
              <input className="input" value={form.reason_for_visit} onChange={set('reason_for_visit')} />
            </div>
            <div>
              <label className="label">Notes</label>
              <textarea className="input" rows={2} value={form.notes} onChange={set('notes')} />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={() => setModal(null)} className="btn-secondary">Cancel</button>
              <button type="submit" className="btn-primary">{editing ? 'Update' : 'Schedule'}</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}
