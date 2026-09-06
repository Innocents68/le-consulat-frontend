import { ChevronLeft, ChevronRight, ChevronsUpDown, ChevronUp, ChevronDown, Search } from 'lucide-react';
import { Loader } from './Feedback';
import { ErrorState } from './Feedback';
import { EmptyState } from './Feedback';

/**
 * Generic paginated/sortable/searchable table wired to a Page<T> shaped result.
 *
 * Props:
 *  columns: [{ key, header, render?(row), sortable?, className? }]
 *  rows, total, totalPages, page, size
 *  isLoading, isError, errorMessage, onRetry
 *  search, onSearchChange
 *  sort: {field, dir} | null, onSortChange(field)
 *  onPageChange(page)
 *  rowActions(row) -> node
 *  onRowClick(row)
 *  toolbar: extra node rendered next to the search box (filters, buttons)
 *  emptyLabel
 */
export default function DataTable({
  columns,
  rows = [],
  total = 0,
  totalPages = 0,
  page = 0,
  size = 10,
  isLoading,
  isError,
  errorMessage,
  onRetry,
  search,
  onSearchChange,
  searchPlaceholder = 'Rechercher...',
  sort,
  onSortChange,
  onPageChange,
  rowActions,
  onRowClick,
  toolbar,
  emptyLabel = 'Aucun résultat.',
}) {
  const showSearch = onSearchChange !== undefined;
  return (
    <div className="card overflow-hidden">
      {(showSearch || toolbar) && (
        <div className="flex flex-wrap items-center gap-2 px-4 py-3 border-b border-black/5 dark:border-white/10">
          {showSearch && (
            <div className="relative w-full sm:w-64">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-light/60" />
              <input
                className="input pl-8 py-1.5"
                placeholder={searchPlaceholder}
                value={search}
                onChange={(e) => onSearchChange(e.target.value)}
              />
            </div>
          )}
          <div className="flex items-center gap-2 flex-wrap ml-auto">{toolbar}</div>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-cream-100/70 dark:bg-white/5 text-left">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`px-4 py-2.5 text-[11px] font-bold uppercase tracking-wide text-ink-light dark:text-cream-300/70 whitespace-nowrap ${col.sortable ? 'cursor-pointer select-none hover:text-ink' : ''} ${col.className || ''}`}
                  onClick={() => col.sortable && onSortChange?.(col.key)}
                >
                  <span className="inline-flex items-center gap-1">
                    {col.header}
                    {col.sortable && (
                      sort?.field === col.key ? (
                        sort.dir === 'asc' ? <ChevronUp size={13} /> : <ChevronDown size={13} />
                      ) : <ChevronsUpDown size={13} className="opacity-40" />
                    )}
                  </span>
                </th>
              ))}
              {rowActions && <th className="px-4 py-2.5 text-right text-[11px] font-bold uppercase tracking-wide text-ink-light dark:text-cream-300/70">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {!isLoading && !isError && rows.map((row, i) => (
              <tr
                key={row.id ?? i}
                className={`border-t border-black/5 dark:border-white/5 ${onRowClick ? 'cursor-pointer hover:bg-cream-100/60 dark:hover:bg-white/5' : 'hover:bg-cream-100/40 dark:hover:bg-white/[0.03]'}`}
                onClick={() => onRowClick?.(row)}
              >
                {columns.map((col) => (
                  <td key={col.key} className={`px-4 py-2.5 align-middle text-ink dark:text-cream-100 ${col.className || ''}`}>
                    {col.render ? col.render(row) : (row[col.key] ?? '—')}
                  </td>
                ))}
                {rowActions && (
                  <td className="px-4 py-2.5 text-right" onClick={(e) => e.stopPropagation()}>
                    <div className="flex justify-end gap-1">{rowActions(row)}</div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>

        {isLoading && <Loader />}
        {isError && <ErrorState message={errorMessage} onRetry={onRetry} />}
        {!isLoading && !isError && rows.length === 0 && <EmptyState label={emptyLabel} />}
      </div>

      {!isLoading && !isError && rows.length > 0 && onPageChange && (
        <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 border-t border-black/5 dark:border-white/10 text-xs text-ink-light dark:text-cream-300/70">
          <span>
            {total} résultat{total > 1 ? 's' : ''} • page {page + 1} / {Math.max(totalPages, 1)}
          </span>
          <div className="flex items-center gap-1">
            <button
              className="btn-ghost px-2 py-1"
              disabled={page <= 0}
              onClick={() => onPageChange(page - 1)}
            >
              <ChevronLeft size={16} />
            </button>
            <button
              className="btn-ghost px-2 py-1"
              disabled={page + 1 >= totalPages}
              onClick={() => onPageChange(page + 1)}
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
