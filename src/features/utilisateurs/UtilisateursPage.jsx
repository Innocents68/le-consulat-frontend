import { useState } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { Plus, Pencil, KeyRound, Power, Loader2 } from 'lucide-react';
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
import { PROFIL_LABEL } from '../../lib/perimetre';

const EMPTY = { username: '', nom: '', email: '', telephone: '', profil: 'GERANT_CAISSIER', etablissementId: '', motDePasse: 'admin123' };

export default function UtilisateursPage() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const table = useTableState({ initialSize: 10 });
  const { data, isLoading, isError, error, refetch } = useListQuery('utilisateurs', table.params);
  const { data: etablissements } = useQuery({
    queryKey: ['etablissements'],
    queryFn: async () => (await api.get('/etablissements')).data,
  });

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [pwdTarget, setPwdTarget] = useState(null);
  const [newPassword, setNewPassword] = useState('');

  const create = useMutation({
    mutationFn: (payload) => api.post('/utilisateurs', payload).then((r) => r.data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['utilisateurs'] }); toast.success('Utilisateur créé.'); setModalOpen(false); },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });
  const update = useMutation({
    mutationFn: ({ id, ...payload }) => api.put(`/utilisateurs/${id}`, payload).then((r) => r.data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['utilisateurs'] }); toast.success('Utilisateur modifié.'); setModalOpen(false); },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });
  const toggleStatut = useMutation({
    mutationFn: (id) => api.patch(`/utilisateurs/${id}/statut`).then((r) => r.data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['utilisateurs'] }); toast.success('Statut mis à jour.'); },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });
  const resetPassword = useMutation({
    mutationFn: () => api.put(`/utilisateurs/${pwdTarget.id}/mot-de-passe`, { nouveauMotDePasse: newPassword }).then((r) => r.data),
    onSuccess: () => { toast.success('Mot de passe réinitialisé.'); setPwdTarget(null); setNewPassword(''); },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });

  function openCreate() { setEditing(null); setForm(EMPTY); setModalOpen(true); }
  function openEdit(u) { setEditing(u); setForm({ ...u, etablissementId: u.etablissementId || '' }); setModalOpen(true); }
  function handleSubmit(e) {
    e.preventDefault();
    // Le Super Administrateur n'a pas d'établissement (vision globale, RG-005) — jamais choisi
    // librement pour les autres profils non plus, mais ici on envoie simplement la valeur du
    // select (obligatoire côté backend pour tout profil != Super Administrateur, RG-004).
    const payload = { ...form, etablissementId: form.profil === 'SUPER_ADMINISTRATEUR' ? null : (form.etablissementId || null) };
    if (editing) update.mutate({ id: editing.id, ...payload });
    else create.mutate(payload);
  }

  return (
    <div>
      <PageHeader
        title="Utilisateurs"
        subtitle="Comptes du personnel et leur affectation."
        actions={<button className="btn-primary" onClick={openCreate}><Plus size={16} /> Nouvel utilisateur</button>}
      />

      <DataTable
        columns={[
          { key: 'nom', header: 'Nom', sortable: true },
          { key: 'username', header: 'Identifiant' },
          { key: 'profil', header: 'Profil', render: (r) => PROFIL_LABEL[r.profil] || r.profil },
          { key: 'etablissementNom', header: 'Établissement', render: (r) => r.etablissementNom || '— (tous)' },
          { key: 'telephone', header: 'Téléphone' },
          { key: 'dateCreation', header: 'Créé le', render: (r) => formatDate(r.dateCreation) },
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
        searchPlaceholder="Rechercher un utilisateur..."
        onPageChange={table.setPage}
        rowActions={(row) => (
          <>
            <button className="btn-ghost p-1.5" title="Modifier" onClick={() => openEdit(row)}><Pencil size={15} /></button>
            <button className="btn-ghost p-1.5" title="Réinitialiser le mot de passe" onClick={() => setPwdTarget(row)}><KeyRound size={15} /></button>
            <button className={`btn-ghost p-1.5 ${row.actif ? 'text-danger' : 'text-success'}`} title={row.actif ? 'Désactiver' : 'Activer'} onClick={() => toggleStatut.mutate(row.id)}>
              <Power size={15} />
            </button>
          </>
        )}
        emptyLabel="Aucun utilisateur."
      />

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? "Modifier l'utilisateur" : 'Nouvel utilisateur'}
        footer={<>
          <button className="btn-secondary" onClick={() => setModalOpen(false)}>Annuler</button>
          <button className="btn-primary" onClick={handleSubmit} disabled={create.isPending || update.isPending}>{editing ? 'Enregistrer' : 'Créer'}</button>
        </>}
      >
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Nom complet" required><input className="input" value={form.nom} onChange={(e) => setForm((f) => ({ ...f, nom: e.target.value }))} required /></Field>
            <Field label="Identifiant" required><input className="input" value={form.username} onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))} required disabled={!!editing} /></Field>
            <Field label="Email"><input type="email" className="input" value={form.email || ''} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} /></Field>
            <Field label="Téléphone"><input className="input" value={form.telephone || ''} onChange={(e) => setForm((f) => ({ ...f, telephone: e.target.value }))} /></Field>
          </div>
          <Field label="Profil" required>
            <Select value={form.profil} onChange={(e) => setForm((f) => ({ ...f, profil: e.target.value }))}>
              {Object.entries(PROFIL_LABEL).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </Select>
          </Field>
          {form.profil !== 'SUPER_ADMINISTRATEUR' && (
            <Field label="Établissement d'affectation" required hint="Cet utilisateur n'aura accès qu'aux données de l'établissement sélectionné.">
              <Select value={form.etablissementId || ''} onChange={(e) => setForm((f) => ({ ...f, etablissementId: e.target.value }))}>
                <option value="" disabled>Choisir un établissement</option>
                {(etablissements || []).map((et) => <option key={et.id} value={et.id}>{et.nom}</option>)}
              </Select>
            </Field>
          )}
          {!editing && (
            <Field label="Mot de passe initial" required>
              <input type="password" className="input" value={form.motDePasse} onChange={(e) => setForm((f) => ({ ...f, motDePasse: e.target.value }))} required />
            </Field>
          )}
        </form>
      </Modal>

      <Modal
        open={!!pwdTarget}
        onClose={() => setPwdTarget(null)}
        title={`Réinitialiser le mot de passe — ${pwdTarget?.nom || ''}`}
        footer={<>
          <button className="btn-secondary" onClick={() => setPwdTarget(null)}>Annuler</button>
          <button className="btn-primary" onClick={() => resetPassword.mutate()} disabled={!newPassword || resetPassword.isPending}>
            {resetPassword.isPending && <Loader2 size={15} className="animate-spin" />} Réinitialiser
          </button>
        </>}
      >
        <Field label="Nouveau mot de passe" required>
          <input type="password" className="input" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} autoFocus />
        </Field>
      </Modal>
    </div>
  );
}
