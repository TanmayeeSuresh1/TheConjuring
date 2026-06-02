import { Outlet } from 'react-router-dom'
import Sidebar from '../components/Sidebar'
import {
  LayoutDashboard, Users, Stethoscope, CalendarDays,
  FileText, CreditCard, BarChart3, ShieldAlert
} from 'lucide-react'

const links = [
  { to: '/admin',             label: 'Dashboard',       icon: LayoutDashboard },
  { to: '/admin/patients',    label: 'Patients',         icon: Users },
  { to: '/admin/doctors',     label: 'Doctors',          icon: Stethoscope },
  { to: '/admin/appointments',label: 'Appointments',     icon: CalendarDays },
  { to: '/admin/records',     label: 'Medical Records',  icon: FileText },
  { to: '/admin/billing',     label: 'Billing',          icon: CreditCard },
  { to: '/admin/analytics',   label: 'Analytics',        icon: BarChart3 },
  { to: '/admin/audit-logs',  label: 'Audit Logs',       icon: ShieldAlert },
]

export default function AdminLayout() {
  return (
    <div className="flex min-h-screen">
      <Sidebar links={links} />
      <main className="flex-1 overflow-auto bg-gray-50 dark:bg-gray-950">
        <div className="p-6 max-w-7xl mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
