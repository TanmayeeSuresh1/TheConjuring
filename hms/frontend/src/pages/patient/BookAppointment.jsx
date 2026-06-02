import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../services/api'
import { useAuth } from '../../context/AuthContext'
import toast from 'react-hot-toast'
import { CalendarDays } from 'lucide-react'

export default function BookAppointment() {
  const { user }   = useAuth()
  const navigate   = useNavigate()
  const [doctors,  setDoctors]  = useState([])
  const [loading,  setLoading]  = useState(false)
  const [form, setForm] = useState({ doctor_id:'', appointment_date:'', appointment_time:'', reason_for_visit:'', notes:'' })

  useEffect(() => {
    api.get('/doctors?availability=Available&limit=100')
      .then(r => setDoctors(r.data)).catch(() => toast.error('Failed to load doctors'))
  }, [])

  const set = k => e => setForm(p => ({...p, [k]: e.target.value}))

  const handleSubmit = async e => {
    e.preventDefault()
    setLoading(true)
    try {
      await api.post('/appointments', {
        ...form,
        patient_id: user.linked_patient_id ?? 0,
        doctor_id:  +form.doctor_id,
      })
      toast.success('Appointment booked successfully!')
      navigate('/patient/appointments')
    } catch (err) {
      toast.error(err.response?.data?.detail ?? 'Booking failed')
    } finally { setLoading(false) }
  }

  // Minimum date = today
  const today = new Date().toISOString().split('T')[0]

  return (
    <div className="space-y-6 max-w-lg">
      <div className="flex items-center gap-3">
        <CalendarDays size={24} className="text-primary-600" />
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Book Appointment</h1>
      </div>

      <div className="card">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Select Doctor</label>
            <select className="input" value={form.doctor_id} onChange={set('doctor_id')} required>
              <option value="">Choose a doctor...</option>
              {doctors.map(d => (
                <option key={d.doctor_id} value={d.doctor_id}>
                  {d.first_name} {d.last_name} — {d.specialization} ({d.experience} yrs)
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Date</label>
              <input className="input" type="date" min={today} value={form.appointment_date} onChange={set('appointment_date')} required />
            </div>
            <div>
              <label className="label">Time</label>
              <input className="input" type="time" value={form.appointment_time} onChange={set('appointment_time')} required />
            </div>
          </div>
          <div>
            <label className="label">Reason for Visit</label>
            <input className="input" placeholder="Brief description of symptoms or reason..." value={form.reason_for_visit} onChange={set('reason_for_visit')} />
          </div>
          <div>
            <label className="label">Additional Notes (optional)</label>
            <textarea className="input" rows={3} placeholder="Any relevant information for the doctor..." value={form.notes} onChange={set('notes')} />
          </div>
          <button type="submit" disabled={loading} className="btn-primary w-full py-2.5">
            {loading ? 'Booking...' : 'Confirm Appointment'}
          </button>
        </form>
      </div>
    </div>
  )
}
