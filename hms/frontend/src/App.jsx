import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { ThemeProvider } from './context/ThemeContext'

// Pages
import LandingPage    from './pages/LandingPage'
import LoginPage      from './pages/auth/LoginPage'
import RegisterPage   from './pages/auth/RegisterPage'
import ForgotPassword from './pages/auth/ForgotPassword'

// Dashboard layouts
import AdminLayout   from './layouts/AdminLayout'
import DoctorLayout  from './layouts/DoctorLayout'
import PatientLayout from './layouts/PatientLayout'

// Admin pages
import AdminDashboard  from './pages/admin/Dashboard'
import AdminPatients   from './pages/admin/Patients'
import AdminDoctors    from './pages/admin/Doctors'
import AdminAppointments from './pages/admin/Appointments'
import AdminMedicalRecords from './pages/admin/MedicalRecords'
import AdminBilling    from './pages/admin/Billing'
import AdminAnalytics  from './pages/admin/Analytics'
import AuditLogs       from './pages/admin/AuditLogs'

// Doctor pages
import DoctorDashboard    from './pages/doctor/Dashboard'
import DoctorPatients     from './pages/doctor/Patients'
import DoctorAppointments from './pages/doctor/Appointments'
import DoctorRecords      from './pages/doctor/MedicalRecords'

// Patient pages
import PatientDashboard    from './pages/patient/Dashboard'
import PatientProfile      from './pages/patient/Profile'
import PatientAppointments from './pages/patient/Appointments'
import PatientRecords      from './pages/patient/MedicalRecords'
import PatientBilling      from './pages/patient/Billing'
import BookAppointment     from './pages/patient/BookAppointment'

function ProtectedRoute({ children, allowedRoles }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="h-screen flex items-center justify-center"><span className="text-primary-600 text-lg">Loading...</span></div>
  if (!user)   return <Navigate to="/login" replace />
  if (allowedRoles && !allowedRoles.includes(user.role)) return <Navigate to={`/${user.role}`} replace />
  return children
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Routes>
          {/* Public */}
          <Route path="/"              element={<LandingPage />} />
          <Route path="/login"         element={<LoginPage />} />
          <Route path="/register"      element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />

          {/* Admin */}
          <Route path="/admin" element={<ProtectedRoute allowedRoles={['admin']}><AdminLayout /></ProtectedRoute>}>
            <Route index              element={<AdminDashboard />} />
            <Route path="patients"   element={<AdminPatients />} />
            <Route path="doctors"    element={<AdminDoctors />} />
            <Route path="appointments" element={<AdminAppointments />} />
            <Route path="records"    element={<AdminMedicalRecords />} />
            <Route path="billing"    element={<AdminBilling />} />
            <Route path="analytics"  element={<AdminAnalytics />} />
            <Route path="audit-logs" element={<AuditLogs />} />
          </Route>

          {/* Doctor */}
          <Route path="/doctor" element={<ProtectedRoute allowedRoles={['doctor']}><DoctorLayout /></ProtectedRoute>}>
            <Route index               element={<DoctorDashboard />} />
            <Route path="patients"     element={<DoctorPatients />} />
            <Route path="appointments" element={<DoctorAppointments />} />
            <Route path="records"      element={<DoctorRecords />} />
          </Route>

          {/* Patient */}
          <Route path="/patient" element={<ProtectedRoute allowedRoles={['patient']}><PatientLayout /></ProtectedRoute>}>
            <Route index               element={<PatientDashboard />} />
            <Route path="profile"      element={<PatientProfile />} />
            <Route path="appointments" element={<PatientAppointments />} />
            <Route path="records"      element={<PatientRecords />} />
            <Route path="billing"      element={<PatientBilling />} />
            <Route path="book"         element={<BookAppointment />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </ThemeProvider>
  )
}
