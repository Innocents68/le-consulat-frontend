import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Plus, Eye } from 'lucide-react';
import api, { apiErrorMessage } from '../../lib/api';
import DataTable from '../../components/ui/DataTable';
import Modal from '../../components/ui/Modal';
import PageHeader from '../../components/ui/PageHeader';
import StatusBadge from '../../components/ui/StatusBadge';
import { Field, Select } from '../../components/ui/Field';
import { useTableState } from '../../hooks/useTableState';
import { useListQuery } from '../../hooks/useResource';
import { formatDate } from '../../lib/format';
import { useToast } from '../../components/ui/Toast';
import { useAuthStore } from '../../store/authStore';
import { isSuperAdmin } from '../../lib/perimetre';

const STATUT_LABEL = { BROUILLON: 'Brouillon', EN_COMPTAGE: 'En comptage', CLOTURE: 'Clôturé', VALIDE: 'Validé' };

const EMPTY = { etablissementId: '', dateInventaire: '', commentaire: '' };

/** §6.6.5 : Brouillon -> En comptage -> Clôturé (écarts calculés) -> Validé (ajustements générés). */
export default function InventairesPage() {
  const toast = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const superAdmin = isSuperAdmin(user);

  const table = useTableState({ initialSize: 10, extraFilters: { etablissementId: '', statut: '', dateDebut: '', dateFin: '' } });
  const { data, isLoading, isError, error, refetch } = useListQuery('inventaires', table.params);
  const { data: etablissements } = useQuery({ queryKey: ['etablissements'], queryFn: async () => (await api.get('/etablissements')).data });

  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);

  const create = useMutation({
    mutationFn: (payload) => api.post('/inventaires', payload).then((r) => r.data),
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: ['inventaires'] });
      toast.success('Inventaire créé.');
      setModalOpen(false);
      setForm(EMPTY);
      navigate(`/inventaires/${created.id}`);
    },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });

  function handleSubmit(e) {
    e.preventDefault();
    create.mutate({ ...form, etablissementId: form.etablissementId ? Number(form.etablissementId) : null });
  }

  return (
    <div>
      <PageHeader
        title="Inventaires"
        subtitle="Comparaison du stock théorique au stock physique compté (§6.6.5)."
        actions={<button className="btn-primary" onClick={() => setModalOpen(true)}><Plus size={16} /> Nouvel inventaire</button>}
      />

      <DataTable
        columns={[
          { key: 'numero', header: 'Numéro' },
          { key: 'dateInventaire', header: 'Date', render: (r) => formatDate(r.dateInventaire) },
          { key: 'etablissementNom', header: 'Établissement' },
          { key: 'statut', header: 'Statut', render: (r) => <StatusBadge status={r.statut} /> },
          { key: 'auteurNom', header: 'Auteur' },
          { key: 'validateurNom', header: 'Validé par', render: (r) => r.validateurNom || '—' },
        ]}
        rows={data?.rows || []}
        total={data?.total || 0}
        totalPages={data?.totalPages || 0}
        page={table.page}
        isLoading={isLoading}
        isError={isError}
        errorMessage={apiErrorMessage(error)}
        onRetry={refetch}
        onPageChange={table.setPage}
        onRowClick={(row) => navigate(`/inventaires/${row.id}`)}
        toolbar={<>
          {superAdmin && (
            <Select className="w-auto" value={table.filters.etablissementId} onChange={(e) => table.setFilters({ etablissementId: e.target.value })}>
              <option value="">Tous les établissements</option>
              {(etablissements || []).map((et) => <option key={et.id} value={et.id}>{et.nom}</option>)}
            </Select>
          )}
          <Select className="w-auto" value={table.filters.statut} onChange={(e) => table.setFilters({ statut: e.target.value })}>
            <option value="">Tous les statuts</option>
            {Object.entries(STATUT_LABEL).map(([s, label]) => <option key={s} value={s}>{label}</option>)}
          </Select>
          <input type="date" className="input w-auto" value={table.filters.dateDebut} onChange={(e) => table.setFilters({ dateDebut: e.target.value })} />
          <input type="date" className="input w-auto" value={table.filters.dateFin} onChange={(e) => table.setFilters({ dateFin: e.target.value })} />
        </>}
        rowActions={(row) => (
          <button className="btn-ghost p-1.5" title="Détails" onClick={() => navigate(`/inventaires/${row.id}`)}><Eye size={15} /></button>
        )}
        emptyLabel="Aucun inventaire."
      />

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Nouvel inventaire"
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
          <Field label="Date d'inventaire" required>
            <input type="date" className="input" value={form.dateInventaire} onChange={(e) => setForm((f) => ({ ...f, dateInventaire: e.target.value }))} required />
          </Field>
          <Field label="Commentaire" hint="Facultatif à la création, peut aussi être renseigné à la clôture.">
            <input className="input" value={form.commentaire} onChange={(e) => setForm((f) => ({ ...f, commentaire: e.target.value }))} />
          </Field>
        </form>
      </Modal>
    </div>
  );
}
