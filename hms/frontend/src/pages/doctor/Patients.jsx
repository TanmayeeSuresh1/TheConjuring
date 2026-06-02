import { useEffect, useState } from 'react'
import api from '../../services/api'
import DataTable from '../../components/DataTable'
import Modal from '../../components/Modal'
import toast from 'react-hot-toast'
import { Eye } from 'lucide-react'

export default function DoctorPatients() {
  const [patients, setPatients] = useState([])
  const [selected, setSelected] = useState(null)

  useEffect(() => {
    api.get('/patients?limit=100')
      .then(r => setPatients(r.data))
      .catch(() => toast.error('Failed'))
  }, [])

  const columns = [
    { header: 'Name',    render: r => `${r.first_name} ${r.last_name}` },
    { header: 'Gender',  accessor: 'gender' },
    { header: 'DOB',     render: r => r.date_of_birth?.split('T')[0] },
    { header: 'Phone',   accessor: 'phone_number' },
    { header: 'Email',   accessor: 'email' },
    { header: 'Actions', render: r => (
      <button onClick={() => setSelected(r)} className="p-1.5 rounded hover:bg-green-50 dark:hover:bg-green-900/20 text-green-600"><Eye size={14} /></button>
    )},
  ]

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">My Patients</h1>
      <DataTable columns={columns} data={patients} searchPlaceholder="Search patients..." />

      {selected && (
        <Modal title="Patient Details" onClose={() => setSelected(null)}>
          <div className="space-y-3 text-sm">
            {[
              ['Full Name',    `${selected.first_name} ${selected.last_name}`],
              ['Date of Birth', selected.date_of_birth?.split('T')[0]],
              ['Gender',        selected.gender],
              ['Phone',         selected.phone_number],
              ['Email',         selected.email],
              ['Address',       selected.address || '—'],
              ['Insurance',     selected.insurance_details || '—'],
              ['Emergency Contact', selected.emergency_contact || '—'],
            ].map(([label, value]) => (
              <div key={label} className="flex gap-2">
                <span className="text-gray-500 dark:text-gray-400 w-36 shrink-0 font-medium">{label}:</span>
                <span className="text-gray-800 dark:text-gray-200">{value}</span>
              </div>
            ))}
          </div>
        </Modal>
      )}
    </div>
  )
}
