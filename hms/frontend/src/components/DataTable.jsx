import { useState } from 'react'
import { Search, ChevronLeft, ChevronRight } from 'lucide-react'

export default function DataTable({ columns, data, searchPlaceholder = 'Search...', actions }) {
  const [search, setSearch] = useState('')
  const [page,   setPage]   = useState(1)
  const pageSize = 10

  const filtered = data.filter(row =>
    columns.some(col => {
      const val = col.accessor ? row[col.accessor] : ''
      return String(val ?? '').toLowerCase().includes(search.toLowerCase())
    })
  )

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const paginated  = filtered.slice((page - 1) * pageSize, page * pageSize)

  return (
    <div className="card p-0 overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-800 gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1) }}
            placeholder={searchPlaceholder}
            className="input pl-9 py-1.5 text-sm"
          />
        </div>
        {actions}
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-gray-800/50">
            <tr>
              {columns.map(col => (
                <th key={col.header} className="table-header">{col.header}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {paginated.length === 0 ? (
              <tr><td colSpan={columns.length} className="text-center py-10 text-gray-400 text-sm">No records found</td></tr>
            ) : paginated.map((row, i) => (
              <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                {columns.map(col => (
                  <td key={col.header} className="table-cell">
                    {col.render ? col.render(row) : row[col.accessor]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 dark:border-gray-800 text-sm text-gray-500 dark:text-gray-400">
        <span>{filtered.length} record{filtered.length !== 1 ? 's' : ''}</span>
        <div className="flex items-center gap-1">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
            className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40">
            <ChevronLeft size={16} />
          </button>
          <span className="px-2">Page {page} of {totalPages}</span>
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
            className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40">
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </div>
  )
}
