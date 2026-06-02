import { useEffect, useState } from 'react'
import api from '../../services/api'
import DataTable from '../../components/DataTable'
import Modal from '../../components/Modal'
import StatusBadge from '../../components/StatusBadge'
import toast from 'react-hot-toast'
import { Plus, Pencil, Trash2 } from 'lucide-react'

const EMPTY = { first_name:'', last_name:'', specialization:'', license_number:'', experience:'', contact_number:'', email:'', availability_status:'Available' }

export default function AdminDoctors() {
  const [doctors, setDoctors] = useState([])
  const [modal,   setModal]   = useState(null)
  const [form,    setForm]    = useState(EMPTY)
  const [editing, setEditing] = useState(null)

  const load = () => api.get('/doctors?limit=100').then(r => setDoctors(r.data)).catch(() => toast.error('Failed'))
  useEffect(() => { load() }, [])

  const set = k => e => setForm(p => ({...p, [k]: e.target.value}))

  const handleSubmit = async e => {
    e.preventDefault()
    try {
      const payload = {...form, experience: parseInt(form.experience) || 0}
      if (editing) { await api.put(`/doctors/${editing}`, payload); toast.success('Updated') }
      else         { await api.post('/doctors', payload); toast.success('Added') }
      setModal(null); load()
    } catch (err) { toast.error(err.response?.data?.detail ?? 'Error') }
  }

  const handleDelete = async id => {
    if (!confirm('Delete this doctor?')) return
    try { await api.delete(`/doctors/${id}`); toast.success('Deleted'); load() }
    catch (err) { toast.error(err.response?.data?.detail ?? 'Error') }
  }

  const columns = [
    { header: 'Name',           render: r => `${r.first_name} ${r.last_name}` },
    { header: 'Specialization', accessor: 'specialization' },
    { header: 'License',        accessor: 'license_number' },
    { header: 'Experience',     render: r => `${r.experience} yrs` },
    { header: 'Contact',        accessor: 'contact_number' },
    { header: 'Status',         render: r => <StatusBadge status={r.availability_status} /> },
    { header: 'Actions', render: r => (
      <div className="flex gap-2">
        <button onClick={() => { setForm(r); setEditing(r.doctor_id); setModal('form') }} className="p-1.5 rounded hover:bg-blue-50 dark:hover:bg-blue-900/20 text-blue-600"><Pencil size={14} /></button>
        <button onClick={() => handleDelete(r.doctor_id)} className="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500"><Trash2 size={14} /></button>
      </div>
    )},
  ]

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Doctors</h1>
          <p className="text-gray-500 text-sm">{doctors.length} registered doctors</p>
        </div>
      </div>
      <DataTable columns={columns} data={doctors} searchPlaceholder="Search doctors..."
        actions={<button onClick={() => { setForm(EMPTY); setEditing(null); setModal('form') }} className="btn-primary flex items-center gap-2 text-sm py-2"><Plus size={15}/>Add Doctor</button>} />

      {modal === 'form' && (
        <Modal title={editing ? 'Edit Doctor' : 'Add Doctor'} onClose={() => setModal(null)} size="lg">
          <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
            {[['first_name','First Name'],['last_name','Last Name'],['specialization','Specialization'],['license_number','License Number'],['experience','Experience (years)'],['contact_number','Contact Number'],['email','Email']].map(([k, label]) => (
              <div key={k}>
                <label className="label">{label}</label>
                <input className="input" value={form[k]} onChange={set(k)} required={k !== 'experience'} type={k === 'email' ? 'email' : k === 'experience' ? 'number' : 'text'} />
              </div>
            ))}
            <div>
              <label className="label">Availability Status</label>
              <select className="input" value={form.availability_status} onChange={set('availability_status')}>
                <option>Available</option><option>Busy</option><option>On Leave</option><option>Inactive</option>
              </select>
            </div>
            <div className="col-span-2 flex justify-end gap-3 pt-2">
              <button type="button" onClick={() => setModal(null)} className="btn-secondary">Cancel</button>
              <button type="submit" className="btn-primary">{editing ? 'Update' : 'Add Doctor'}</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}
