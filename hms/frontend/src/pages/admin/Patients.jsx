import { useEffect, useState } from 'react'
import api from '../../services/api'
import DataTable from '../../components/DataTable'
import Modal from '../../components/Modal'
import toast from 'react-hot-toast'
import { Plus, Pencil, Trash2 } from 'lucide-react'

const EMPTY = { first_name:'', last_name:'', date_of_birth:'', gender:'Male', phone_number:'', email:'', address:'', insurance_details:'', emergency_contact:'' }

export default function AdminPatients() {
  const [patients, setPatients] = useState([])
  const [modal,    setModal]    = useState(null) // null | 'add' | 'edit'
  const [form,     setForm]     = useState(EMPTY)
  const [editing,  setEditing]  = useState(null)

  const load = () => api.get('/patients?limit=100').then(r => setPatients(r.data)).catch(() => toast.error('Failed to load patients'))
  useEffect(() => { load() }, [])

  const set = k => e => setForm(p => ({...p, [k]: e.target.value}))

  const openAdd  = () => { setForm(EMPTY); setEditing(null); setModal('form') }
  const openEdit = row => { setForm({...row, date_of_birth: row.date_of_birth?.split('T')[0]}); setEditing(row.patient_id); setModal('form') }

  const handleSubmit = async e => {
    e.preventDefault()
    try {
      if (editing) {
        await api.put(`/patients/${editing}`, form)
        toast.success('Patient updated')
      } else {
        await api.post('/patients', form)
        toast.success('Patient added')
      }
      setModal(null); load()
    } catch (err) { toast.error(err.response?.data?.detail ?? 'Error') }
  }

  const handleDelete = async id => {
    if (!confirm('Delete this patient?')) return
    try { await api.delete(`/patients/${id}`); toast.success('Deleted'); load() }
    catch (err) { toast.error(err.response?.data?.detail ?? 'Error') }
  }

  const columns = [
    { header: 'Name',    render: r => `${r.first_name} ${r.last_name}` },
    { header: 'Gender',  accessor: 'gender' },
    { header: 'DOB',     render: r => r.date_of_birth?.split('T')[0] },
    { header: 'Phone',   accessor: 'phone_number' },
    { header: 'Email',   accessor: 'email' },
    { header: 'Insurance', render: r => r.insurance_details ? <span className="badge bg-green-100 text-green-700">Insured</span> : <span className="badge bg-gray-100 text-gray-500">None</span> },
    { header: 'Actions', render: r => (
      <div className="flex gap-2">
        <button onClick={() => openEdit(r)} className="p-1.5 rounded hover:bg-blue-50 dark:hover:bg-blue-900/20 text-blue-600"><Pencil size={14} /></button>
        <button onClick={() => handleDelete(r.patient_id)} className="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500"><Trash2 size={14} /></button>
      </div>
    )},
  ]

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Patients</h1>
          <p className="text-gray-500 text-sm">{patients.length} total patients</p>
        </div>
      </div>

      <DataTable columns={columns} data={patients} searchPlaceholder="Search patients..."
        actions={<button onClick={openAdd} className="btn-primary flex items-center gap-2 text-sm py-2"><Plus size={15}/>Add Patient</button>} />

      {modal === 'form' && (
        <Modal title={editing ? 'Edit Patient' : 'Add Patient'} onClose={() => setModal(null)} size="lg">
          <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
            {[
              ['first_name','First Name','text'],['last_name','Last Name','text'],
              ['date_of_birth','Date of Birth','date'],['phone_number','Phone','tel'],
              ['email','Email','email'],['address','Address','text'],
            ].map(([k, label, type]) => (
              <div key={k}>
                <label className="label">{label}</label>
                <input className="input" type={type} value={form[k]} onChange={set(k)} required={['first_name','last_name','date_of_birth','phone_number','email'].includes(k)} />
              </div>
            ))}
            <div>
              <label className="label">Gender</label>
              <select className="input" value={form.gender} onChange={set('gender')}>
                <option>Male</option><option>Female</option><option>Other</option>
              </select>
            </div>
            <div>
              <label className="label">Insurance Details</label>
              <input className="input" value={form.insurance_details} onChange={set('insurance_details')} />
            </div>
            <div className="col-span-2">
              <label className="label">Emergency Contact</label>
              <input className="input" value={form.emergency_contact} onChange={set('emergency_contact')} />
            </div>
            <div className="col-span-2 flex justify-end gap-3 pt-2">
              <button type="button" onClick={() => setModal(null)} className="btn-secondary">Cancel</button>
              <button type="submit" className="btn-primary">{editing ? 'Update' : 'Add Patient'}</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}
