import { Link } from 'react-router-dom'
import { Heart, Shield, Clock, Users, Activity, CheckCircle, Phone, Mail, MapPin } from 'lucide-react'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-950">
      {/* Navbar */}
      <nav className="fixed top-0 w-full z-50 bg-white/80 dark:bg-gray-950/80 backdrop-blur border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
              <Heart size={16} className="text-white" />
            </div>
            <span className="font-bold text-gray-900 dark:text-white">MediCare HMS</span>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/login"    className="btn-secondary text-sm py-2 px-4">Sign In</Link>
            <Link to="/register" className="btn-primary  text-sm py-2 px-4">Get Started</Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-28 pb-20 px-6 bg-gradient-to-br from-primary-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-950 dark:to-gray-900">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 text-sm font-medium px-4 py-1.5 rounded-full mb-6">
            <Activity size={14} /> Healthcare Management System
          </div>
          <h1 className="text-5xl font-extrabold text-gray-900 dark:text-white leading-tight mb-6">
            Modern Healthcare <br />
            <span className="text-primary-600">Management Platform</span>
          </h1>
          <p className="text-xl text-gray-500 dark:text-gray-400 max-w-2xl mx-auto mb-8">
            Streamline patient care, appointments, medical records, and billing in one secure, role-based platform built for modern healthcare providers.
          </p>
          <div className="flex items-center justify-center gap-4 flex-wrap">
            <Link to="/register" className="btn-primary px-8 py-3 text-base">Start Free Trial</Link>
            <Link to="/login"    className="btn-secondary px-8 py-3 text-base">Sign In</Link>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-12 px-6 bg-primary-600">
        <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 text-center text-white">
          {[
            { label: 'Patients Managed', value: '10,000+' },
            { label: 'Doctors Onboarded', value: '500+' },
            { label: 'Appointments Scheduled', value: '50,000+' },
            { label: 'Uptime', value: '99.9%' },
          ].map(s => (
            <div key={s.label}>
              <div className="text-3xl font-bold">{s.value}</div>
              <div className="text-primary-200 text-sm mt-1">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-3">Everything you need</h2>
            <p className="text-gray-500 dark:text-gray-400">A complete suite of tools for every healthcare stakeholder.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { icon: Shield,   color: 'blue',   title: 'Role-Based Access',   desc: 'Admin, Doctor, and Patient roles with granular permissions and secure JWT authentication.' },
              { icon: Users,    color: 'green',  title: 'Patient Management',  desc: 'Complete patient profiles, medical history, insurance details, and emergency contacts.' },
              { icon: Activity, color: 'purple', title: 'Medical Records',     desc: 'Structured diagnosis, treatment history, allergies, and prescription management.' },
              { icon: Clock,    color: 'yellow', title: 'Smart Scheduling',    desc: 'Conflict-free appointment booking with real-time availability and automated status updates.' },
              { icon: Heart,    color: 'red',    title: 'Clinical Insights',   desc: 'Analytics dashboards with charts, revenue reports, and doctor performance summaries.' },
              { icon: CheckCircle, color:'blue', title: 'Billing & Insurance', desc: 'End-to-end billing with insurance claim tracking, payment status, and revenue analytics.' },
            ].map(f => (
              <div key={f.title} className="card hover:shadow-md transition-shadow">
                <div className={`w-11 h-11 rounded-xl bg-${f.color}-100 dark:bg-${f.color}-900/30 flex items-center justify-center mb-4`}>
                  <f.icon size={20} className={`text-${f.color}-600 dark:text-${f.color}-400`} />
                </div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">{f.title}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Role Cards */}
      <section className="py-20 px-6 bg-gray-50 dark:bg-gray-900">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-gray-900 dark:text-white mb-12">Built for every role</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { role: 'Admin',   color: 'primary', desc: 'Full system control — manage staff, patients, billing, and analytics from one powerful dashboard.' },
              { role: 'Doctor',  color: 'green',   desc: 'View assigned patients, create medical records, manage prescriptions, and track appointments.' },
              { role: 'Patient', color: 'purple',  desc: 'Book appointments, view personal records, track prescriptions, and manage billing — all in one place.' },
            ].map(r => (
              <div key={r.role} className="card text-center">
                <div className={`w-14 h-14 bg-${r.color === 'primary' ? 'primary' : r.color}-100 dark:bg-${r.color}-900/30 rounded-2xl flex items-center justify-center mx-auto mb-4`}>
                  <Users size={24} className={`text-${r.color === 'primary' ? 'primary-600' : r.color + '-600'}`} />
                </div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">{r.role}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">{r.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">Get in touch</h2>
          <div className="flex flex-wrap justify-center gap-8 text-gray-500 dark:text-gray-400">
            {[
              { icon: Phone, text: '+1 (555) 000-0000' },
              { icon: Mail,  text: 'support@medicare-hms.com' },
              { icon: MapPin, text: '123 Healthcare Blvd, Chicago, IL' },
            ].map(c => (
              <div key={c.text} className="flex items-center gap-2 text-sm">
                <c.icon size={16} className="text-primary-600" />{c.text}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-6 px-6 border-t border-gray-200 dark:border-gray-800 text-center text-sm text-gray-400 dark:text-gray-500">
        © {new Date().getFullYear()} MediCare HMS. All rights reserved.
      </footer>
    </div>
  )
}
