import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Power, Trash2 } from 'lucide-react';
import api, { apiErrorMessage } from '../../lib/api';
import DataTable from '../../components/ui/DataTable';
import Modal from '../../components/ui/Modal';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import PageHeader from '../../components/ui/PageHeader';
import StatusBadge from '../../components/ui/StatusBadge';
import { Field, Select } from '../../components/ui/Field';
import { useToast } from '../../components/ui/Toast';
import { useAuthStore } from '../../store/authStore';
import { isSuperAdmin } from '../../lib/perimetre';

const EMPTY = { numero: '', capacite: 4, zone: '', etablissementId: '' };

export default function TablesPage() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const superAdmin = isSuperAdmin(user);

  // Préremplissage depuis un raccourci du menu (?etablissementId=X) — sans effet pour un
  // Gérant/Caissier, de toute façon forcé sur son propre établissement côté backend.
  const [filterEtablissementId, setFilterEtablissementId] = useState(() => new URLSearchParams(window.location.search).get('etablissementId') || '');
  const { data: etablissements } = useQuery({ queryKey: ['etablissements'], queryFn: async () => (await api.get('/etablissements')).data });
  const { data: tables, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['tables', filterEtablissementId],
    queryFn: async () => (await api.get('/tables', { params: filterEtablissementId ? { etablissementId: filterEtablissementId } : {} })).data,
  });

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const create = useMutation({
    mutationFn: (payload) => api.post('/tables', payload).then((r) => r.data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['tables'] }); toast.success('Table créée.'); setModalOpen(false); },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });
  const update = useMutation({
    mutationFn: ({ id, ...payload }) => api.put(`/tables/${id}`, payload).then((r) => r.data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['tables'] }); toast.success('Table modifiée.'); setModalOpen(false); },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });
  const toggleActif = useMutation({
    mutationFn: (id) => api.patch(`/tables/${id}/statut`).then((r) => r.data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['tables'] }); toast.success('Statut mis à jour.'); },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });
  const remove = useMutation({
    mutationFn: (id) => api.delete(`/tables/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['tables'] }); toast.success('Table supprimée.'); setDeleteTarget(null); },
    onError: (e) => { toast.error(apiErrorMessage(e)); setDeleteTarget(null); },
  });

  function openCreate() { setEditing(null); setForm(EMPTY); setModalOpen(true); }
  function openEdit(t) { setEditing(t); setForm(t); setModalOpen(true); }
  function handleSubmit(e) {
    e.preventDefault();
    const payload = { ...form, capacite: Number(form.capacite) };
    if (editing) update.mutate({ id: editing.id, ...payload });
    else create.mutate(payload);
  }

  return (
    <div>
      <PageHeader
        title="Tables"
        subtitle="Gestion des tables de votre établissement."
        actions={<button className="btn-primary" onClick={openCreate}><Plus size={16} /> Nouvelle table</button>}
      />

      <DataTable
        columns={[
          { key: 'numero', header: 'Numéro', sortable: true },
          { key: 'etablissementNom', header: 'Établissement' },
          { key: 'capacite', header: 'Capacité' },
          { key: 'zone', header: 'Zone', render: (r) => r.zone || '—' },
          { key: 'statut', header: 'Statut', render: (r) => <StatusBadge status={r.statut} /> },
          { key: 'actif', header: 'Actif', render: (r) => <StatusBadge status={r.actif} /> },
        ]}
        rows={tables || []}
        total={(tables || []).length}
        totalPages={1}
        page={0}
        isLoading={isLoading}
        isError={isError}
        errorMessage={apiErrorMessage(error)}
        onRetry={refetch}
        toolbar={superAdmin && (
          <Select className="w-auto" value={filterEtablissementId} onChange={(e) => setFilterEtablissementId(e.target.value)}>
            <option value="">Tous les établissements</option>
            {(etablissements || []).map((et) => <option key={et.id} value={et.id}>{et.nom}</option>)}
          </Select>
        )}
        rowActions={(row) => (
          <>
            <button className="btn-ghost p-1.5" title="Modifier" onClick={() => openEdit(row)}><Pencil size={15} /></button>
            <button className={`btn-ghost p-1.5 ${row.actif ? 'text-danger' : 'text-success'}`} title={row.actif ? 'Désactiver' : 'Activer'} onClick={() => toggleActif.mutate(row.id)}>
              <Power size={15} />
            </button>
            <button className="btn-ghost p-1.5 text-danger" title="Supprimer" onClick={() => setDeleteTarget(row)}><Trash2 size={15} /></button>
          </>
        )}
        emptyLabel="Aucune table."
      />

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Modifier la table' : 'Nouvelle table'}
        footer={<>
          <button className="btn-secondary" onClick={() => setModalOpen(false)}>Annuler</button>
          <button className="btn-primary" onClick={handleSubmit} disabled={create.isPending || update.isPending}>{editing ? 'Enregistrer' : 'Créer'}</button>
        </>}
      >
        <form onSubmit={handleSubmit}>
          {superAdmin && !editing && (
            <Field label="Établissement" required>
              <Select value={form.etablissementId} onChange={(e) => setForm((f) => ({ ...f, etablissementId: e.target.value }))}>
                <option value="" disabled>Choisir un établissement</option>
                {(etablissements || []).map((et) => <option key={et.id} value={et.id}>{et.nom}</option>)}
              </Select>
            </Field>
          )}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Numéro" required><input className="input" value={form.numero} onChange={(e) => setForm((f) => ({ ...f, numero: e.target.value }))} required /></Field>
            <Field label="Capacité" required><input type="number" min="1" className="input" value={form.capacite} onChange={(e) => setForm((f) => ({ ...f, capacite: e.target.value }))} required /></Field>
          </div>
          <Field label="Zone"><input className="input" value={form.zone || ''} onChange={(e) => setForm((f) => ({ ...f, zone: e.target.value }))} placeholder="Terrasse, salle climatisée, VIP..." /></Field>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Supprimer la table"
        message={`Supprimer la table ${deleteTarget?.numero} ? Cette action est irréversible.`}
        confirmLabel="Supprimer"
        danger
        loading={remove.isPending}
        onConfirm={() => remove.mutate(deleteTarget.id)}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  );
}
