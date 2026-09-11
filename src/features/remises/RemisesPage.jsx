import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Power } from 'lucide-react';
import api, { apiErrorMessage } from '../../lib/api';
import DataTable from '../../components/ui/DataTable';
import Modal from '../../components/ui/Modal';
import PageHeader from '../../components/ui/PageHeader';
import StatusBadge from '../../components/ui/StatusBadge';
import { Field, Select } from '../../components/ui/Field';
import { useTableState } from '../../hooks/useTableState';
import { useListQuery } from '../../hooks/useResource';
import { formatFCFA } from '../../lib/format';
import { useToast } from '../../components/ui/Toast';
import { useAuthStore } from '../../store/authStore';
import { isSuperAdmin } from '../../lib/perimetre';

const EMPTY = { libelle: '', type: 'POURCENTAGE', valeur: '', dateDebut: '', dateFin: '', heureDebut: '', heureFin: '', etablissementId: '' };

export default function RemisesPage() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const superAdmin = isSuperAdmin(user);

  // Préremplissage depuis un raccourci du menu (?etablissementId=X).
  const etablissementIdInitial = new URLSearchParams(window.location.search).get('etablissementId') || '';
  const table = useTableState({ initialSize: 10, extraFilters: { etablissementId: etablissementIdInitial } });
  const { data, isLoading, isError, error, refetch } = useListQuery('remises', table.params);
  const { data: etablissements } = useQuery({ queryKey: ['etablissements'], queryFn: async () => (await api.get('/etablissements')).data });

  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);

  const create = useMutation({
    mutationFn: (payload) => api.post('/remises', payload).then((r) => r.data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['remises'] }); toast.success('Remise créée.'); setModalOpen(false); setForm(EMPTY); },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });
  const toggleActif = useMutation({
    mutationFn: (id) => api.patch(`/remises/${id}/statut`).then((r) => r.data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['remises'] }); toast.success('Statut mis à jour.'); },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });

  function handleSubmit(e) {
    e.preventDefault();
    create.mutate({
      ...form,
      valeur: Number(form.valeur),
      dateDebut: form.dateDebut || null,
      dateFin: form.dateFin || null,
      heureDebut: form.heureDebut || null,
      heureFin: form.heureFin || null,
    });
  }

  return (
    <div>
      <PageHeader
        title="Remises et promotions"
        subtitle="Remises applicables à une commande avant validation (§6.2.6)."
        actions={<button className="btn-primary" onClick={() => setModalOpen(true)}><Plus size={16} /> Nouvelle remise</button>}
      />

      <DataTable
        columns={[
          { key: 'libelle', header: 'Libellé', sortable: true },
          { key: 'type', header: 'Type' },
          { key: 'valeur', header: 'Valeur', render: (r) => r.type === 'POURCENTAGE' ? `${r.valeur} %` : formatFCFA(r.valeur) },
          { key: 'etablissementNom', header: 'Établissement' },
          { key: 'dateDebut', header: 'Validité', render: (r) => r.dateDebut || r.dateFin ? `${r.dateDebut || '…'} → ${r.dateFin || '…'}` : 'Sans limite' },
          { key: 'actif', header: 'Statut', render: (r) => <StatusBadge status={r.actif} /> },
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
        searchPlaceholder="Rechercher une remise..."
        onPageChange={table.setPage}
        toolbar={superAdmin && (
          <Select className="w-auto" value={table.filters.etablissementId} onChange={(e) => table.setFilters({ etablissementId: e.target.value })}>
            <option value="">Choisir un établissement</option>
            {(etablissements || []).map((et) => <option key={et.id} value={et.id}>{et.nom}</option>)}
          </Select>
        )}
        rowActions={(row) => (
          <button className={`btn-ghost p-1.5 ${row.actif ? 'text-danger' : 'text-success'}`} title={row.actif ? 'Désactiver' : 'Activer'} onClick={() => toggleActif.mutate(row.id)}>
            <Power size={15} />
          </button>
        )}
        emptyLabel="Aucune remise."
      />

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Nouvelle remise"
        footer={<>
          <button className="btn-secondary" onClick={() => setModalOpen(false)}>Annuler</button>
          <button className="btn-primary" onClick={handleSubmit} disabled={create.isPending}>Créer</button>
        </>}
      >
        <form onSubmit={handleSubmit}>
          {superAdmin && (
            <Field label="Établissement" required>
              <Select value={form.etablissementId} onChange={(e) => setForm((f) => ({ ...f, etablissementId: e.target.value }))}>
                <option value="" disabled>Choisir un établissement</option>
                {(etablissements || []).map((et) => <option key={et.id} value={et.id}>{et.nom}</option>)}
              </Select>
            </Field>
          )}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Libellé" required><input className="input" value={form.libelle} onChange={(e) => setForm((f) => ({ ...f, libelle: e.target.value }))} required /></Field>
            <Field label="Type" required>
              <Select value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}>
                <option value="POURCENTAGE">Pourcentage</option>
                <option value="MONTANT_FIXE">Montant fixe (FCFA)</option>
              </Select>
            </Field>
            <Field label="Valeur" required>
              <input type="number" min="0" max={form.type === 'POURCENTAGE' ? 100 : undefined} className="input" value={form.valeur} onChange={(e) => setForm((f) => ({ ...f, valeur: e.target.value }))} required />
            </Field>
          </div>
          <p className="text-xs font-semibold uppercase text-ink-light mt-3 mb-1">Validité (optionnel)</p>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Date de début"><input type="date" className="input" value={form.dateDebut} onChange={(e) => setForm((f) => ({ ...f, dateDebut: e.target.value }))} /></Field>
            <Field label="Date de fin"><input type="date" className="input" value={form.dateFin} onChange={(e) => setForm((f) => ({ ...f, dateFin: e.target.value }))} /></Field>
            <Field label="Heure de début"><input type="time" className="input" value={form.heureDebut} onChange={(e) => setForm((f) => ({ ...f, heureDebut: e.target.value }))} /></Field>
            <Field label="Heure de fin"><input type="time" className="input" value={form.heureFin} onChange={(e) => setForm((f) => ({ ...f, heureFin: e.target.value }))} /></Field>
          </div>
        </form>
      </Modal>
    </div>
  );
}
