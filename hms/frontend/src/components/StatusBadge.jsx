import clsx from 'clsx'

const map = {
  Scheduled:         'bg-blue-100   dark:bg-blue-900/30   text-blue-700   dark:text-blue-300',
  Completed:         'bg-green-100  dark:bg-green-900/30  text-green-700  dark:text-green-300',
  Cancelled:         'bg-red-100    dark:bg-red-900/30    text-red-700    dark:text-red-300',
  'No-Show':         'bg-gray-100   dark:bg-gray-700      text-gray-600   dark:text-gray-300',
  Paid:              'bg-green-100  dark:bg-green-900/30  text-green-700  dark:text-green-300',
  Pending:           'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300',
  Partial:           'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300',
  'Insurance Claimed':'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300',
  Available:         'bg-green-100  dark:bg-green-900/30  text-green-700  dark:text-green-300',
  Busy:              'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300',
  'On Leave':        'bg-gray-100   dark:bg-gray-700      text-gray-500   dark:text-gray-300',
  Inactive:          'bg-red-100    dark:bg-red-900/30    text-red-600    dark:text-red-300',
}

export default function StatusBadge({ status }) {
  return (
    <span className={clsx('badge', map[status] ?? 'bg-gray-100 text-gray-600')}>
      {status}
    </span>
  )
}
