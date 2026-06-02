import { Link } from 'react-router-dom'
import { Heart, ArrowLeft } from 'lucide-react'

export default function ForgotPassword() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-blue-100 dark:from-gray-900 dark:to-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-primary-600 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <Heart size={22} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Reset Password</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Contact your system administrator to reset your password.</p>
        </div>
        <div className="card text-center space-y-4">
          <p className="text-gray-600 dark:text-gray-400 text-sm">
            For security reasons, password resets are handled by your healthcare administrator.
            Please contact <strong>admin@medicare-hms.com</strong> with your username and employee/patient ID.
          </p>
          <Link to="/login" className="inline-flex items-center gap-2 text-primary-600 hover:underline text-sm font-medium">
            <ArrowLeft size={14} /> Back to Sign In
          </Link>
        </div>
      </div>
    </div>
  )
}
