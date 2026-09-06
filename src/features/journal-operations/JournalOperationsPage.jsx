import { useQuery } from '@tanstack/react-query';
import DataTable from '../../components/ui/DataTable';
import PageHeader from '../../components/ui/PageHeader';
import { Select } from '../../components/ui/Field';
import { useTableState } from '../../hooks/useTableState';
import { useListQuery } from '../../hooks/useResource';
import { formatDateTime } from '../../lib/format';
import { fetchPage, apiErrorMessage } from '../../lib/api';

const PERIOD_PRESETS = [
  { value: '7', label: '7 derniers jours' },
  { value: '30', label: '30 derniers jours' },
  { value: '90', label: '3 derniers mois' },
];

export default function JournalOperationsPage() {
  const table = useTableState({ initialSize: 15, extraFilters: { utilisateurId: '', module: '' } });
  const { data, isLoading, isError, error, refetch } = useListQuery('journal-operations', table.params);
  const { data: utilisateurs } = useQuery({ queryKey: ['utilisateurs', 'select-journal'], queryFn: () => fetchPage('/utilisateurs', { size: 100 }) });

  return (
    <div>
      <PageHeader title="Journal des opérations" subtitle="Traçabilité de toutes les actions sensibles — lecture seule." />

      <DataTable
        columns={[
          { key: 'dateOperation', header: 'Date', render: (r) => formatDateTime(r.dateOperation), sortable: true },
          { key: 'utilisateurNom', header: 'Utilisateur' },
          { key: 'module', header: 'Module' },
          { key: 'action', header: 'Action' },
          { key: 'details', header: 'Détails' },
        ]}
        rows={data?.rows || []}
        total={data?.total || 0}
        totalPages={data?.totalPages || 0}
        page={table.page}
        isLoading={isLoading}
        isError={isError}
        errorMessage={apiErrorMessage(error)}
        onRetry={refetch}
        search={table.search}
        onSearchChange={table.setSearch}
        searchPlaceholder="Rechercher dans le journal..."
        onPageChange={table.setPage}
        toolbar={
          <Select className="w-auto" value={table.filters.utilisateurId} onChange={(e) => table.setFilters({ utilisateurId: e.target.value })}>
            <option value="">Tous les utilisateurs</option>
            {(utilisateurs?.rows || []).map((u) => <option key={u.id} value={u.id}>{u.nom}</option>)}
          </Select>
        }
        emptyLabel="Aucune opération enregistrée."
      />
    </div>
  );
}
