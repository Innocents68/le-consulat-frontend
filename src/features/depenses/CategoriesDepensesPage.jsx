import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Power } from 'lucide-react';
import api, { apiErrorMessage } from '../../lib/api';
import DataTable from '../../components/ui/DataTable';
import Modal from '../../components/ui/Modal';
import PageHeader from '../../components/ui/PageHeader';
import StatusBadge from '../../components/ui/StatusBadge';
import { Field } from '../../components/ui/Field';
import { useToast } from '../../components/ui/Toast';

const EMPTY = { nom: '' };

/** EF-036 : paramétrable exclusivement par le Super Administrateur (page masquée du menu pour
 * un Gérant/Caissier — la liste reste néanmoins lisible côté API pour peupler le formulaire
 * Dépenses des deux profils). §6.10.1 : « renommage » explicitement listé (Lot 6a). */
export default function CategoriesDepensesPage() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['categories-depenses'],
    queryFn: async () => (await api.get('/categories-depenses', { params: { actif: '' } })).data,
  });

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);

  const create = useMutation({
    mutationFn: (payload) => api.post('/categories-depenses', payload).then((r) => r.data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['categories-depenses'] }); toast.success('Catégorie créée.'); closeModal(); },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });
  const update = useMutation({
    mutationFn: ({ id, ...payload }) => api.put(`/categories-depenses/${id}`, payload).then((r) => r.data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['categories-depenses'] }); toast.success('Catégorie renommée.'); closeModal(); },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });
  const toggleActif = useMutation({
    mutationFn: (id) => api.patch(`/categories-depenses/${id}/statut`).then((r) => r.data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['categories-depenses'] }); toast.success('Statut mis à jour.'); },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });

  function closeModal() {
    setModalOpen(false);
    setEditing(null);
    setForm(EMPTY);
  }
  function openCreate() { setEditing(null); setForm(EMPTY); setModalOpen(true); }
  function openEdit(row) { setEditing(row); setForm({ nom: row.nom }); setModalOpen(true); }
  function handleSubmit(e) {
    e.preventDefault();
    if (editing) update.mutate({ id: editing.id, ...form });
    else create.mutate(form);
  }

  return (
    <div>
      <PageHeader
        title="Catégories de dépenses"
        subtitle="Référentiel partagé entre tous les établissements (§6.7.2, EF-036)."
        actions={<button className="btn-primary" onClick={openCreate}><Plus size={16} /> Nouvelle catégorie</button>}
      />

      <DataTable
        columns={[
          { key: 'nom', header: 'Nom' },
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
          <>
            <button className="btn-ghost p-1.5" title="Modifier" onClick={() => openEdit(row)}><Pencil size={15} /></button>
            <button className={`btn-ghost p-1.5 ${row.actif ? 'text-danger' : 'text-success'}`} title={row.actif ? 'Désactiver' : 'Activer'} onClick={() => toggleActif.mutate(row.id)}>
              <Power size={15} />
            </button>
          </>
        )}
        emptyLabel="Aucune catégorie de dépense."
      />

      <Modal
        open={modalOpen}
        onClose={closeModal}
        title={editing ? 'Modifier la catégorie' : 'Nouvelle catégorie de dépense'}
        footer={<>
          <button className="btn-secondary" onClick={closeModal}>Annuler</button>
          <button className="btn-primary" onClick={handleSubmit} disabled={create.isPending || update.isPending}>{editing ? 'Enregistrer' : 'Créer'}</button>
        </>}
      >
        <form onSubmit={handleSubmit}>
          <Field label="Nom" required><input className="input" value={form.nom} onChange={(e) => setForm((f) => ({ ...f, nom: e.target.value }))} required /></Field>
        </form>
      </Modal>
    </div>
  );
}
