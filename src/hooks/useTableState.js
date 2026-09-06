import { useMemo, useState } from 'react';

/**
 * Local UI state for a paginated/sortable/searchable DataTable, mirroring the
 * Spring Data Page<T> query params: page, size, search, sort=field,dir
 */
export function useTableState({ initialSize = 10, initialSort = null, extraFilters = {} } = {}) {
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(initialSize);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState(initialSort); // { field, dir }
  const [filters, setFilters] = useState(extraFilters);

  const params = useMemo(() => {
    const p = { page, size };
    if (search) p.search = search;
    if (sort?.field) p.sort = `${sort.field},${sort.dir}`;
    Object.entries(filters).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') p[k] = v;
    });
    return p;
  }, [page, size, search, sort, filters]);

  function toggleSort(field) {
    setSort((prev) => {
      if (!prev || prev.field !== field) return { field, dir: 'asc' };
      if (prev.dir === 'asc') return { field, dir: 'desc' };
      return null;
    });
  }

  function updateSearch(value) {
    setSearch(value);
    setPage(0);
  }

  function updateFilters(next) {
    setFilters((prev) => ({ ...prev, ...next }));
    setPage(0);
  }

  return { page, setPage, size, setSize, search, setSearch: updateSearch, sort, toggleSort, filters, setFilters: updateFilters, params };
}
