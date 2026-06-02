import clsx from 'clsx'

export default function StatCard({ title, value, icon: Icon, color = 'blue', subtitle }) {
  const colors = {
    blue:   'bg-blue-50   dark:bg-blue-900/20  text-blue-600   dark:text-blue-400',
    green:  'bg-green-50  dark:bg-green-900/20 text-green-600  dark:text-green-400',
    red:    'bg-red-50    dark:bg-red-900/20   text-red-600    dark:text-red-400',
    yellow: 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-600 dark:text-yellow-400',
    purple: 'bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400',
  }
  return (
    <div className="card flex items-center gap-4">
      <div className={clsx('w-12 h-12 rounded-xl flex items-center justify-center shrink-0', colors[color])}>
        <Icon size={22} />
      </div>
      <div className="min-w-0">
        <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{title}</p>
        <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
        {subtitle && <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{subtitle}</p>}
      </div>
    </div>
  )
}
