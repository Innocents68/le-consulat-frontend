import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Power, Pencil, Trash2 } from 'lucide-react';
import api, { apiErrorMessage } from '../../lib/api';
import DataTable from '../../components/ui/DataTable';
import Modal from '../../components/ui/Modal';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
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
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [supprimerCible, setSupprimerCible] = useState(null);
  const [desactiverPropose, setDesactiverPropose] = useState(null); // { fournisseur, message }

  useEffect(() => {
    if (!modalOpen) return;
    setForm(editing ? { nom: editing.nom, telephone: editing.telephone || '' } : EMPTY);
  }, [modalOpen, editing]);

  const create = useMutation({
    mutationFn: (payload) => api.post('/fournisseurs', payload).then((r) => r.data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['fournisseurs'] }); toast.success('Fournisseur créé.'); setModalOpen(false); },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });
  const update = useMutation({
    mutationFn: ({ id, ...payload }) => api.put(`/fournisseurs/${id}`, payload).then((r) => r.data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['fournisseurs'] }); toast.success('Fournisseur modifié.'); setModalOpen(false); },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });
  const toggleActif = useMutation({
    mutationFn: (id) => api.patch(`/fournisseurs/${id}/statut`).then((r) => r.data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['fournisseurs'] }); toast.success('Statut mis à jour.'); setDesactiverPropose(null); },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });
  // Demandes_amelioration_logiciel_Le_Consulat_Professionnel.docx §1 : suppression avec
  // confirmation ; si le fournisseur est déjà lié à un produit, le backend refuse (FK) et on
  // propose alors de le désactiver à la place, même filet de sécurité que pour les produits.
  const supprimer = useMutation({
    mutationFn: (id) => api.delete(`/fournisseurs/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['fournisseurs'] }); toast.success('Fournisseur supprimé.'); setSupprimerCible(null); },
    onError: (e) => {
      setSupprimerCible(null);
      setDesactiverPropose({ fournisseur: supprimerCible, message: apiErrorMessage(e) });
    },
  });

  function openCreate() { setEditing(null); setModalOpen(true); }
  function openEdit(f) { setEditing(f); setModalOpen(true); }

  function handleSubmit(e) {
    e.preventDefault();
    if (editing) {
      update.mutate({ id: editing.id, ...form });
    } else {
      create.mutate(form);
    }
  }

  return (
    <div>
      <PageHeader
        title="Fournisseurs"
        subtitle="Référentiel partagé entre tous les établissements (§6.6.4)."
        actions={<button className="btn-primary" onClick={openCreate}><Plus size={16} /> Nouveau fournisseur</button>}
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
          <>
            <button className="btn-ghost p-1.5" title="Modifier" onClick={() => openEdit(row)}><Pencil size={15} /></button>
            <button className={`btn-ghost p-1.5 ${row.actif ? 'text-danger' : 'text-success'}`} title={row.actif ? 'Désactiver' : 'Activer'} onClick={() => toggleActif.mutate(row.id)}>
              <Power size={15} />
            </button>
            <button className="btn-ghost p-1.5 text-danger" title="Supprimer" onClick={() => setSupprimerCible(row)}><Trash2 size={15} /></button>
          </>
        )}
        emptyLabel="Aucun fournisseur."
      />

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Modifier le fournisseur' : 'Nouveau fournisseur'}
        footer={<>
          <button className="btn-secondary" onClick={() => setModalOpen(false)}>Annuler</button>
          <button className="btn-primary" onClick={handleSubmit} disabled={create.isPending || update.isPending}>{editing ? 'Enregistrer' : 'Créer'}</button>
        </>}
      >
        <form onSubmit={handleSubmit}>
          <Field label="Nom" required><input className="input" value={form.nom} onChange={(e) => setForm((f) => ({ ...f, nom: e.target.value }))} required /></Field>
          <Field label="Téléphone"><input className="input" value={form.telephone} onChange={(e) => setForm((f) => ({ ...f, telephone: e.target.value }))} /></Field>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!supprimerCible}
        title="Supprimer le fournisseur"
        message={`Supprimer définitivement "${supprimerCible?.nom}" ? Cette action est irréversible.`}
        confirmLabel="Supprimer"
        danger
        loading={supprimer.isPending}
        onConfirm={() => supprimer.mutate(supprimerCible.id)}
        onClose={() => setSupprimerCible(null)}
      />

      <ConfirmDialog
        open={!!desactiverPropose}
        title="Suppression impossible"
        message={`${desactiverPropose?.message} Voulez-vous le désactiver à la place ?`}
        confirmLabel="Désactiver"
        danger={false}
        loading={toggleActif.isPending}
        onConfirm={() => toggleActif.mutate(desactiverPropose.fournisseur.id)}
        onClose={() => setDesactiverPropose(null)}
      />
    </div>
  );
}
