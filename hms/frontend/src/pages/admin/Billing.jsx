import { useEffect, useState } from 'react'
import api from '../../services/api'
import DataTable from '../../components/DataTable'
import StatusBadge from '../../components/StatusBadge'
import Modal from '../../components/Modal'
import toast from 'react-hot-toast'
import { Plus, Pencil, Trash2 } from 'lucide-react'

const EMPTY = { patient_id:'', appointment_id:'', service_description:'', charges:'', insurance_claim:'0', amount_paid:'0', payment_status:'Pending', billing_date:'' }

export default function AdminBilling() {
  const [bills,    setBills]    = useState([])
  const [patients, setPatients] = useState([])
  const [modal,    setModal]    = useState(null)
  const [form,     setForm]     = useState(EMPTY)
  const [editing,  setEditing]  = useState(null)

  const load = async () => {
    const [b, p] = await Promise.all([api.get('/billing?limit=100'), api.get('/patients?limit=100')])
    setBills(b.data); setPatients(p.data)
  }
  useEffect(() => { load().catch(() => toast.error('Failed')) }, [])

  const pName = id => { const p = patients.find(x => x.patient_id === id); return p ? `${p.first_name} ${p.last_name}` : id }
  const set = k => e => setForm(p => ({...p, [k]: e.target.value}))

  const handleSubmit = async e => {
    e.preventDefault()
    try {
      const payload = {
        ...form,
        patient_id:     +form.patient_id,
        appointment_id: form.appointment_id ? +form.appointment_id : null,
        charges:        +form.charges,
        insurance_claim:+form.insurance_claim,
        amount_paid:    +form.amount_paid,
      }
      if (editing) { await api.put(`/billing/${editing}`, payload); toast.success('Updated') }
      else         { await api.post('/billing', payload); toast.success('Created') }
      setModal(null); load()
    } catch (err) { toast.error(err.response?.data?.detail ?? 'Error') }
  }

  const handleDelete = async id => {
    if (!confirm('Delete this bill?')) return
    try { await api.delete(`/billing/${id}`); toast.success('Deleted'); load() }
    catch (err) { toast.error(err.response?.data?.detail ?? 'Error') }
  }

  const outstanding = b => (parseFloat(b.charges) - parseFloat(b.amount_paid)).toFixed(2)

  const columns = [
    { header: 'Patient',     render: r => pName(r.patient_id) },
    { header: 'Service',     render: r => <span className="truncate max-w-xs block">{r.service_description}</span> },
    { header: 'Charges',     render: r => `$${parseFloat(r.charges).toFixed(2)}` },
    { header: 'Paid',        render: r => `$${parseFloat(r.amount_paid).toFixed(2)}` },
    { header: 'Outstanding', render: r => <span className={parseFloat(outstanding(r)) > 0 ? 'text-red-600 font-medium' : 'text-green-600'}>${outstanding(r)}</span> },
    { header: 'Status',      render: r => <StatusBadge status={r.payment_status} /> },
    { header: 'Date',        accessor: 'billing_date' },
    { header: 'Actions',     render: r => (
      <div className="flex gap-2">
        <button onClick={() => { setForm({...r, billing_date: r.billing_date}); setEditing(r.bill_id); setModal('form') }}
          className="p-1.5 rounded hover:bg-blue-50 dark:hover:bg-blue-900/20 text-blue-600"><Pencil size={14} /></button>
        <button onClick={() => handleDelete(r.bill_id)}
          className="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500"><Trash2 size={14} /></button>
      </div>
    )},
  ]

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Billing</h1>
      <DataTable columns={columns} data={bills} searchPlaceholder="Search bills..."
        actions={<button onClick={() => { setForm(EMPTY); setEditing(null); setModal('form') }} className="btn-primary flex items-center gap-2 text-sm py-2"><Plus size={15}/>New Bill</button>} />

      {modal === 'form' && (
        <Modal title={editing ? 'Edit Bill' : 'New Bill'} onClose={() => setModal(null)} size="lg">
          <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Patient</label>
              <select className="input" value={form.patient_id} onChange={set('patient_id')} required>
                <option value="">Select...</option>
                {patients.map(p => <option key={p.patient_id} value={p.patient_id}>{p.first_name} {p.last_name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Appointment ID (optional)</label>
              <input className="input" type="number" value={form.appointment_id} onChange={set('appointment_id')} />
            </div>
            <div className="col-span-2">
              <label className="label">Service Description</label>
              <input className="input" value={form.service_description} onChange={set('service_description')} required />
            </div>
            {[['charges','Charges'],['insurance_claim','Insurance Claim'],['amount_paid','Amount Paid']].map(([k,label]) => (
              <div key={k}>
                <label className="label">{label} ($)</label>
                <input className="input" type="number" step="0.01" min="0" value={form[k]} onChange={set(k)} required={k === 'charges'} />
              </div>
            ))}
            <div>
              <label className="label">Payment Status</label>
              <select className="input" value={form.payment_status} onChange={set('payment_status')}>
                <option>Pending</option><option>Paid</option><option>Partial</option><option>Insurance Claimed</option><option>Waived</option>
              </select>
            </div>
            <div>
              <label className="label">Billing Date</label>
              <input className="input" type="date" value={form.billing_date} onChange={set('billing_date')} />
            </div>
            <div className="col-span-2 flex justify-end gap-3 pt-2">
              <button type="button" onClick={() => setModal(null)} className="btn-secondary">Cancel</button>
              <button type="submit" className="btn-primary">{editing ? 'Update' : 'Create Bill'}</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}
