import { useEffect, useState } from 'react'
import api from '../../services/api'
import DataTable from '../../components/DataTable'
import Modal from '../../components/Modal'
import toast from 'react-hot-toast'
import { Plus, Pencil, Eye } from 'lucide-react'

const EMPTY_REC = { patient_id:'', diagnosis:'', allergies:'', treatment_history:'', medical_notes:'' }
const EMPTY_RX  = { medication_name:'', dosage:'', frequency:'', duration:'', instructions:'' }

export default function DoctorRecords() {
  const [records,  setRecords]  = useState([])
  const [patients, setPatients] = useState([])
  const [modal,    setModal]    = useState(null)
  const [selected, setSelected] = useState(null)
  const [form,     setForm]     = useState(EMPTY_REC)
  const [rxForm,   setRxForm]   = useState(EMPTY_RX)

  const load = async () => {
    const [r, p] = await Promise.all([api.get('/medical-records?limit=100'), api.get('/patients?limit=100')])
    setRecords(r.data); setPatients(p.data)
  }
  useEffect(() => { load().catch(() => toast.error('Failed')) }, [])

  const pName = id => { const p = patients.find(x => x.patient_id === id); return p ? `${p.first_name} ${p.last_name}` : id }
  const set  = (s, k) => e => s(p => ({...p, [k]: e.target.value}))

  const handleCreateRecord = async e => {
    e.preventDefault()
    try {
      await api.post('/medical-records', {...form, patient_id: +form.patient_id})
      toast.success('Record created'); setModal(null); load()
    } catch (err) { toast.error(err.response?.data?.detail ?? 'Error') }
  }

  const handleAddRx = async e => {
    e.preventDefault()
    try {
      await api.post(`/medical-records/${selected.record_id}/prescriptions`, rxForm)
      toast.success('Prescription added'); setModal(null); load()
    } catch (err) { toast.error(err.response?.data?.detail ?? 'Error') }
  }

  const columns = [
    { header: 'Patient',   render: r => pName(r.patient_id) },
    { header: 'Diagnosis', render: r => <span className="truncate max-w-xs block">{r.diagnosis}</span> },
    { header: 'Date',      accessor: 'record_date' },
    { header: 'Rx',        render: r => r.prescriptions?.length ?? 0 },
    { header: 'Actions',   render: r => (
      <div className="flex gap-2">
        <button onClick={() => { setSelected(r); setModal('view') }} className="p-1.5 rounded hover:bg-green-50 dark:hover:bg-green-900/20 text-green-600"><Eye size={14} /></button>
        <button onClick={() => { setSelected(r); setRxForm(EMPTY_RX); setModal('rx') }} className="p-1.5 rounded hover:bg-purple-50 dark:hover:bg-purple-900/20 text-purple-600 text-xs font-medium px-2">+Rx</button>
      </div>
    )},
  ]

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Medical Records</h1>
      <DataTable columns={columns} data={records} searchPlaceholder="Search records..."
        actions={<button onClick={() => { setForm(EMPTY_REC); setModal('create') }} className="btn-primary flex items-center gap-2 text-sm py-2"><Plus size={15}/>New Record</button>} />

      {modal === 'create' && (
        <Modal title="New Medical Record" onClose={() => setModal(null)} size="lg">
          <form onSubmit={handleCreateRecord} className="space-y-4">
            <div>
              <label className="label">Patient</label>
              <select className="input" value={form.patient_id} onChange={set(setForm,'patient_id')} required>
                <option value="">Select patient...</option>
                {patients.map(p => <option key={p.patient_id} value={p.patient_id}>{p.first_name} {p.last_name}</option>)}
              </select>
            </div>
            {[['diagnosis','Diagnosis',true],['allergies','Allergies',false],['treatment_history','Treatment History',false],['medical_notes','Medical Notes',false]].map(([k,label,req]) => (
              <div key={k}>
                <label className="label">{label}</label>
                <textarea className="input" rows={2} value={form[k]} onChange={set(setForm,k)} required={req} />
              </div>
            ))}
            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={() => setModal(null)} className="btn-secondary">Cancel</button>
              <button type="submit" className="btn-primary">Create Record</button>
            </div>
          </form>
        </Modal>
      )}

      {modal === 'view' && selected && (
        <Modal title="Medical Record" onClose={() => setModal(null)} size="lg">
          <div className="space-y-3 text-sm">
            {[['Patient', pName(selected.patient_id)], ['Diagnosis', selected.diagnosis], ['Allergies', selected.allergies || '—'], ['Treatment', selected.treatment_history || '—'], ['Notes', selected.medical_notes || '—'], ['Date', selected.record_date]].map(([l,v]) => (
              <div key={l} className="flex gap-2"><span className="text-gray-500 dark:text-gray-400 w-24 shrink-0 font-medium">{l}:</span><span className="text-gray-800 dark:text-gray-200">{v}</span></div>
            ))}
            {selected.prescriptions?.length > 0 && (
              <div className="pt-2">
                <p className="font-semibold mb-2">Prescriptions ({selected.prescriptions.length})</p>
                {selected.prescriptions.map(rx => (
                  <div key={rx.prescription_id} className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 mb-2">
                    <p className="font-medium">{rx.medication_name} — {rx.dosage}</p>
                    <p className="text-gray-500 text-xs">{rx.frequency} for {rx.duration}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Modal>
      )}

      {modal === 'rx' && selected && (
        <Modal title={`Add Prescription — ${pName(selected.patient_id)}`} onClose={() => setModal(null)}>
          <form onSubmit={handleAddRx} className="space-y-4">
            {[['medication_name','Medication Name',true],['dosage','Dosage',true],['frequency','Frequency',true],['duration','Duration',true],['instructions','Instructions',false]].map(([k,label,req]) => (
              <div key={k}>
                <label className="label">{label}</label>
                <input className="input" value={rxForm[k]} onChange={set(setRxForm,k)} required={req} placeholder={k === 'dosage' ? 'e.g. 500mg' : k === 'frequency' ? 'e.g. Twice daily' : k === 'duration' ? 'e.g. 7 days' : ''} />
              </div>
            ))}
            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={() => setModal(null)} className="btn-secondary">Cancel</button>
              <button type="submit" className="btn-primary">Add Prescription</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}
