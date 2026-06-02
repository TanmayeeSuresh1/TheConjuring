import { useEffect, useState } from 'react'
import api from '../../services/api'
import Modal from '../../components/Modal'
import toast from 'react-hot-toast'
import { FileText, Eye } from 'lucide-react'

export default function PatientRecords() {
  const [records, setRecords] = useState([])
  const [selected, setSelected] = useState(null)

  useEffect(() => {
    api.get('/medical-records?limit=100')
      .then(r => setRecords(r.data)).catch(() => toast.error('Failed'))
  }, [])

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <FileText size={24} className="text-primary-600" />
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Medical Records</h1>
      </div>

      {records.length === 0 ? (
        <div className="card text-center py-16 text-gray-400">No medical records found</div>
      ) : (
        <div className="space-y-3">
          {records.map(r => (
            <div key={r.record_id} className="card hover:shadow-md transition-shadow cursor-pointer" onClick={() => setSelected(r)}>
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold text-gray-900 dark:text-white">{r.diagnosis}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Date: {r.record_date}</p>
                  {r.allergies && <p className="text-sm text-red-600 dark:text-red-400 mt-1">⚠ Allergies: {r.allergies}</p>}
                </div>
                <div className="flex items-center gap-2">
                  {r.prescriptions?.length > 0 && (
                    <span className="badge bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300">
                      {r.prescriptions.length} Rx
                    </span>
                  )}
                  <Eye size={16} className="text-gray-400" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {selected && (
        <Modal title="Medical Record Details" onClose={() => setSelected(null)} size="lg">
          <div className="space-y-4 text-sm">
            <div className="grid grid-cols-2 gap-3">
              {[['Diagnosis', selected.diagnosis], ['Date', selected.record_date],
                ['Allergies', selected.allergies || 'None'], ['Treatment', selected.treatment_history || '—'],
                ['Notes', selected.medical_notes || '—']
              ].map(([l,v]) => (
                <div key={l} className={`p-3 bg-gray-50 dark:bg-gray-800 rounded-lg ${l === 'Treatment' || l === 'Notes' ? 'col-span-2' : ''}`}>
                  <p className="text-xs text-gray-500 mb-1">{l}</p>
                  <p className="font-medium text-gray-900 dark:text-white">{v}</p>
                </div>
              ))}
            </div>
            {selected.prescriptions?.length > 0 && (
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Prescriptions</h3>
                <div className="space-y-2">
                  {selected.prescriptions.map(rx => (
                    <div key={rx.prescription_id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold text-gray-900 dark:text-white">{rx.medication_name}</span>
                        <span className="badge bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">{rx.dosage}</span>
                      </div>
                      <p className="text-gray-500 text-xs">{rx.frequency} · {rx.duration}</p>
                      {rx.instructions && <p className="text-gray-400 text-xs mt-1 italic">{rx.instructions}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  )
}
