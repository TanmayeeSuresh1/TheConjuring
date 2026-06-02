import { Outlet } from 'react-router-dom'
import Sidebar from '../components/Sidebar'
import { LayoutDashboard, User, CalendarDays, FileText, CreditCard, PlusCircle } from 'lucide-react'

const links = [
  { to: '/patient',              label: 'Dashboard',    icon: LayoutDashboard },
  { to: '/patient/profile',      label: 'My Profile',   icon: User },
  { to: '/patient/appointments', label: 'Appointments', icon: CalendarDays },
  { to: '/patient/book',         label: 'Book Appointment', icon: PlusCircle },
  { to: '/patient/records',      label: 'Medical Records',  icon: FileText },
  { to: '/patient/billing',      label: 'Billing',          icon: CreditCard },
]

export default function PatientLayout() {
  return (
    <div className="flex min-h-screen">
      <Sidebar links={links} />
      <main className="flex-1 overflow-auto bg-gray-50 dark:bg-gray-950">
        <div className="p-6 max-w-5xl mx-auto"><Outlet /></div>
      </main>
    </div>
  )
}
