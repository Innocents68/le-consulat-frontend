import { useQuery } from '@tanstack/react-query';
import DataTable from '../../components/ui/DataTable';
import PageHeader from '../../components/ui/PageHeader';
import { Select } from '../../components/ui/Field';
import { useTableState } from '../../hooks/useTableState';
import { useListQuery } from '../../hooks/useResource';
import { formatDateTime } from '../../lib/format';
import api, { fetchPage, apiErrorMessage } from '../../lib/api';
import { useAuthStore } from '../../store/authStore';
import { isSuperAdmin } from '../../lib/perimetre';

export default function JournalOperationsPage() {
  const user = useAuthStore((s) => s.user);
  const superAdmin = isSuperAdmin(user);
  const table = useTableState({ initialSize: 15, extraFilters: { utilisateurId: '', module: '', etablissementId: '' } });
  const { data, isLoading, isError, error, refetch } = useListQuery('journal-operations', table.params);
  // Réservés au Super Administrateur : un Gérant/Caissier n'a pas accès à /utilisateurs
  // (matrice §3.3) et n'a de toute façon pas à filtrer sur un établissement autre que le sien
  // (RG-016, RG-099) — inutile de tenter ces requêtes pour lui.
  const { data: utilisateurs } = useQuery({
    queryKey: ['utilisateurs', 'select-journal'],
    queryFn: () => fetchPage('/utilisateurs', { size: 100 }),
    enabled: superAdmin,
  });
  const { data: etablissements } = useQuery({
    queryKey: ['etablissements', 'select-journal'],
    queryFn: async () => (await api.get('/etablissements')).data,
    enabled: superAdmin,
  });

  return (
    <div>
      <PageHeader title="Journal des opérations" subtitle="Traçabilité de toutes les actions sensibles — lecture seule." />

      <DataTable
        columns={[
          { key: 'dateOperation', header: 'Date', render: (r) => formatDateTime(r.dateOperation), sortable: true },
          { key: 'utilisateurNom', header: 'Utilisateur' },
          { key: 'etablissementNom', header: 'Établissement', render: (r) => r.etablissementNom || '—' },
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
          superAdmin && (
            <>
              <Select className="w-auto" value={table.filters.utilisateurId} onChange={(e) => table.setFilters({ utilisateurId: e.target.value })}>
                <option value="">Tous les utilisateurs</option>
                {(utilisateurs?.rows || []).map((u) => <option key={u.id} value={u.id}>{u.nom}</option>)}
              </Select>
              <Select className="w-auto" value={table.filters.etablissementId} onChange={(e) => table.setFilters({ etablissementId: e.target.value })}>
                <option value="">Tous les établissements</option>
                {(etablissements || []).map((et) => <option key={et.id} value={et.id}>{et.nom}</option>)}
              </Select>
            </>
          )
        }
        emptyLabel="Aucune opération enregistrée."
      />
    </div>
  );
}
