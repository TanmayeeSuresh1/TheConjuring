import { useEffect, useState } from 'react'
import api from '../../services/api'
import DataTable from '../../components/DataTable'
import Modal from '../../components/Modal'
import toast from 'react-hot-toast'
import { Pencil, Trash2, Eye } from 'lucide-react'

export default function AdminMedicalRecords() {
  const [records,  setRecords]  = useState([])
  const [patients, setPatients] = useState([])
  const [doctors,  setDoctors]  = useState([])
  const [modal,    setModal]    = useState(null)
  const [selected, setSelected] = useState(null)
  const [form,     setForm]     = useState({ patient_id:'', doctor_id:'', diagnosis:'', allergies:'', treatment_history:'', medical_notes:'' })

  const load = async () => {
    const [r, p, d] = await Promise.all([
      api.get('/medical-records?limit=100'),
      api.get('/patients?limit=100'),
      api.get('/doctors?limit=100'),
    ])
    setRecords(r.data); setPatients(p.data); setDoctors(d.data)
  }
  useEffect(() => { load().catch(() => toast.error('Failed')) }, [])

  const pName = id => { const p = patients.find(x => x.patient_id === id); return p ? `${p.first_name} ${p.last_name}` : id }
  const dName = id => { const d = doctors.find(x => x.doctor_id === id);  return d ? `${d.first_name} ${d.last_name}` : id }

  const handleDelete = async id => {
    if (!confirm('Delete this record?')) return
    try { await api.delete(`/medical-records/${id}`); toast.success('Deleted'); load() }
    catch (err) { toast.error(err.response?.data?.detail ?? 'Error') }
  }

  const handleUpdate = async e => {
    e.preventDefault()
    try {
      await api.put(`/medical-records/${selected.record_id}`, form)
      toast.success('Updated'); setModal(null); load()
    } catch (err) { toast.error(err.response?.data?.detail ?? 'Error') }
  }

  const columns = [
    { header: 'Patient',   render: r => pName(r.patient_id) },
    { header: 'Doctor',    render: r => dName(r.doctor_id) },
    { header: 'Diagnosis', render: r => <span className="truncate max-w-xs block">{r.diagnosis}</span> },
    { header: 'Date',      accessor: 'record_date' },
    { header: 'Rx Count',  render: r => r.prescriptions?.length ?? 0 },
    { header: 'Actions',   render: r => (
      <div className="flex gap-2">
        <button onClick={() => { setSelected(r); setModal('view') }} className="p-1.5 rounded hover:bg-green-50 dark:hover:bg-green-900/20 text-green-600"><Eye size={14} /></button>
        <button onClick={() => { setSelected(r); setForm({ diagnosis:r.diagnosis, allergies:r.allergies||'', treatment_history:r.treatment_history||'', medical_notes:r.medical_notes||'' }); setModal('edit') }}
          className="p-1.5 rounded hover:bg-blue-50 dark:hover:bg-blue-900/20 text-blue-600"><Pencil size={14} /></button>
        <button onClick={() => handleDelete(r.record_id)} className="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500"><Trash2 size={14} /></button>
      </div>
    )},
  ]

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Medical Records</h1>
      <DataTable columns={columns} data={records} searchPlaceholder="Search records..." />

      {modal === 'view' && selected && (
        <Modal title="Medical Record Detail" onClose={() => setModal(null)} size="lg">
          <div className="space-y-3 text-sm">
            <Row label="Patient"  value={pName(selected.patient_id)} />
            <Row label="Doctor"   value={dName(selected.doctor_id)} />
            <Row label="Date"     value={selected.record_date} />
            <Row label="Diagnosis" value={selected.diagnosis} />
            <Row label="Allergies" value={selected.allergies || '—'} />
            <Row label="Treatment" value={selected.treatment_history || '—'} />
            <Row label="Notes"    value={selected.medical_notes || '—'} />
            {selected.prescriptions?.length > 0 && (
              <div className="pt-2">
                <p className="font-semibold text-gray-700 dark:text-gray-300 mb-2">Prescriptions</p>
                {selected.prescriptions.map(rx => (
                  <div key={rx.prescription_id} className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 mb-2">
                    <p className="font-medium">{rx.medication_name} — {rx.dosage}</p>
                    <p className="text-gray-500">{rx.frequency} for {rx.duration}</p>
                    {rx.instructions && <p className="text-gray-400 text-xs mt-1">{rx.instructions}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </Modal>
      )}

      {modal === 'edit' && selected && (
        <Modal title="Edit Record" onClose={() => setModal(null)} size="lg">
          <form onSubmit={handleUpdate} className="space-y-3">
            {[['diagnosis','Diagnosis'],['allergies','Allergies'],['treatment_history','Treatment History'],['medical_notes','Medical Notes']].map(([k,label]) => (
              <div key={k}>
                <label className="label">{label}</label>
                <textarea className="input" rows={k === 'diagnosis' ? 2 : 3} value={form[k]} onChange={e => setForm(p => ({...p, [k]: e.target.value}))} required={k === 'diagnosis'} />
              </div>
            ))}
            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={() => setModal(null)} className="btn-secondary">Cancel</button>
              <button type="submit" className="btn-primary">Update Record</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}

function Row({ label, value }) {
  return (
    <div className="flex gap-2">
      <span className="text-gray-500 dark:text-gray-400 w-28 shrink-0 font-medium">{label}:</span>
      <span className="text-gray-800 dark:text-gray-200">{value}</span>
    </div>
  )
}
