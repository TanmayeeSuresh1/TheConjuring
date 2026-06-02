import { Outlet } from 'react-router-dom'
import Sidebar from '../components/Sidebar'
import { LayoutDashboard, Users, CalendarDays, FileText } from 'lucide-react'

const links = [
  { to: '/doctor',              label: 'Dashboard',      icon: LayoutDashboard },
  { to: '/doctor/patients',     label: 'My Patients',    icon: Users },
  { to: '/doctor/appointments', label: 'Appointments',   icon: CalendarDays },
  { to: '/doctor/records',      label: 'Medical Records',icon: FileText },
]

export default function DoctorLayout() {
  return (
    <div className="flex min-h-screen">
      <Sidebar links={links} />
      <main className="flex-1 overflow-auto bg-gray-50 dark:bg-gray-950">
        <div className="p-6 max-w-7xl mx-auto"><Outlet /></div>
      </main>
    </div>
  )
}
