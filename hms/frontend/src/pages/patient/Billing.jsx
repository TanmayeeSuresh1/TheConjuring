import { useEffect, useState } from 'react'
import api from '../../services/api'
import StatusBadge from '../../components/StatusBadge'
import toast from 'react-hot-toast'
import { CreditCard } from 'lucide-react'

export default function PatientBilling() {
  const [bills, setBills] = useState([])

  useEffect(() => {
    api.get('/billing?limit=100').then(r => setBills(r.data)).catch(() => toast.error('Failed'))
  }, [])

  const totalDue  = bills.reduce((s, b) => s + (parseFloat(b.charges) - parseFloat(b.amount_paid)), 0)
  const totalPaid = bills.reduce((s, b) => s + parseFloat(b.amount_paid), 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <CreditCard size={24} className="text-primary-600" />
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Billing</h1>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total Bills',    value: bills.length,            color: 'text-gray-900 dark:text-white' },
          { label: 'Amount Paid',    value: `$${totalPaid.toFixed(2)}`, color: 'text-green-600' },
          { label: 'Outstanding',    value: `$${totalDue.toFixed(2)}`,  color: totalDue > 0 ? 'text-red-600' : 'text-green-600' },
        ].map(s => (
          <div key={s.label} className="card text-center">
            <p className="text-xs text-gray-500 dark:text-gray-400">{s.label}</p>
            <p className={`text-xl font-bold mt-1 ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Bills list */}
      <div className="space-y-3">
        {bills.length === 0 ? (
          <div className="card text-center py-16 text-gray-400">No billing records found</div>
        ) : bills.map(b => (
          <div key={b.bill_id} className="card">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-semibold text-gray-900 dark:text-white">{b.service_description}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Date: {b.billing_date}</p>
              </div>
              <StatusBadge status={b.payment_status} />
            </div>
            <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-gray-100 dark:border-gray-800 text-sm">
              <div>
                <p className="text-xs text-gray-500">Charges</p>
                <p className="font-semibold">${parseFloat(b.charges).toFixed(2)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Insurance</p>
                <p className="font-semibold text-purple-600">${parseFloat(b.insurance_claim).toFixed(2)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Amount Paid</p>
                <p className="font-semibold text-green-600">${parseFloat(b.amount_paid).toFixed(2)}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
