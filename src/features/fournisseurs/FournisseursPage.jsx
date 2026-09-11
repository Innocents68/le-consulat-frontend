import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Power } from 'lucide-react';
import api, { apiErrorMessage } from '../../lib/api';
import DataTable from '../../components/ui/DataTable';
import Modal from '../../components/ui/Modal';
import PageHeader from '../../components/ui/PageHeader';
import StatusBadge from '../../components/ui/StatusBadge';
import { Field } from '../../components/ui/Field';
import { useToast } from '../../components/ui/Toast';

const EMPTY = { nom: '', telephone: '' };

/** Référentiel partagé (§6.6.4) — pas de cloisonnement établissement, contrairement à
 * quasiment tout le reste du modèle (RG-002 en fait explicitement une exception). */
export default function FournisseursPage() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['fournisseurs'],
    queryFn: async () => (await api.get('/fournisseurs', { params: { actif: '' } })).data,
  });

  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);

  const create = useMutation({
    mutationFn: (payload) => api.post('/fournisseurs', payload).then((r) => r.data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['fournisseurs'] }); toast.success('Fournisseur créé.'); setModalOpen(false); setForm(EMPTY); },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });
  const toggleActif = useMutation({
    mutationFn: (id) => api.patch(`/fournisseurs/${id}/statut`).then((r) => r.data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['fournisseurs'] }); toast.success('Statut mis à jour.'); },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });

  function handleSubmit(e) {
    e.preventDefault();
    create.mutate(form);
  }

  return (
    <div>
      <PageHeader
        title="Fournisseurs"
        subtitle="Référentiel partagé entre tous les établissements (§6.6.4)."
        actions={<button className="btn-primary" onClick={() => setModalOpen(true)}><Plus size={16} /> Nouveau fournisseur</button>}
      />

      <DataTable
        columns={[
          { key: 'nom', header: 'Nom' },
          { key: 'telephone', header: 'Téléphone', render: (r) => r.telephone || '—' },
          { key: 'actif', header: 'Statut', render: (r) => <StatusBadge status={r.actif} /> },
        ]}
        rows={data || []}
        total={(data || []).length}
        totalPages={1}
        page={0}
        isLoading={isLoading}
        isError={isError}
        errorMessage={apiErrorMessage(error)}
        onRetry={refetch}
        rowActions={(row) => (
          <button className={`btn-ghost p-1.5 ${row.actif ? 'text-danger' : 'text-success'}`} title={row.actif ? 'Désactiver' : 'Activer'} onClick={() => toggleActif.mutate(row.id)}>
            <Power size={15} />
          </button>
        )}
        emptyLabel="Aucun fournisseur."
      />

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Nouveau fournisseur"
        footer={<>
          <button className="btn-secondary" onClick={() => setModalOpen(false)}>Annuler</button>
          <button className="btn-primary" onClick={handleSubmit} disabled={create.isPending}>Créer</button>
        </>}
      >
        <form onSubmit={handleSubmit}>
          <Field label="Nom" required><input className="input" value={form.nom} onChange={(e) => setForm((f) => ({ ...f, nom: e.target.value }))} required /></Field>
          <Field label="Téléphone"><input className="input" value={form.telephone} onChange={(e) => setForm((f) => ({ ...f, telephone: e.target.value }))} /></Field>
        </form>
      </Modal>
    </div>
  );
}
