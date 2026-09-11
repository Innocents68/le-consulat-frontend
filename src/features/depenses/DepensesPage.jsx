import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Ban } from 'lucide-react';
import api, { apiErrorMessage } from '../../lib/api';
import DataTable from '../../components/ui/DataTable';
import Modal from '../../components/ui/Modal';
import PageHeader from '../../components/ui/PageHeader';
import StatusBadge from '../../components/ui/StatusBadge';
import { Field, Select } from '../../components/ui/Field';
import { useTableState } from '../../hooks/useTableState';
import { useListQuery } from '../../hooks/useResource';
import { formatDate, formatFCFA, todayISO } from '../../lib/format';
import { useToast } from '../../components/ui/Toast';
import { useAuthStore } from '../../store/authStore';
import { isSuperAdmin } from '../../lib/perimetre';

const MODES = [
  { value: 'ESPECES', label: 'Espèces' },
  { value: 'MOBILE_MONEY', label: 'Mobile Money' },
  { value: 'CARTE', label: 'Carte bancaire' },
  { value: 'VIREMENT', label: 'Virement' },
  { value: 'AUTRE', label: 'Autre' },
];

const EMPTY = { date: todayISO(), categorieId: '', libelle: '', montant: '', modePaiement: 'ESPECES', beneficiaire: '', commentaire: '', etablissementId: '' };

export default function DepensesPage() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const superAdmin = isSuperAdmin(user);

  const table = useTableState({ initialSize: 10, extraFilters: { etablissementId: '', categorieId: '', modePaiement: '', dateDebut: '', dateFin: '' } });
  const { data, isLoading, isError, error, refetch } = useListQuery('depenses', table.params);
  const { data: etablissements } = useQuery({ queryKey: ['etablissements'], queryFn: async () => (await api.get('/etablissements')).data });
  const { data: categories } = useQuery({ queryKey: ['categories-depenses'], queryFn: async () => (await api.get('/categories-depenses')).data });

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [motif, setMotif] = useState('');
  const [annulerTarget, setAnnulerTarget] = useState(null);
  const [motifAnnulation, setMotifAnnulation] = useState('');

  const create = useMutation({
    mutationFn: (payload) => api.post('/depenses', payload).then((r) => r.data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['depenses'] }); toast.success('Dépense enregistrée.'); closeModal(); },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });
  const update = useMutation({
    mutationFn: ({ id, ...payload }) => api.put(`/depenses/${id}`, payload).then((r) => r.data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['depenses'] }); toast.success('Dépense modifiée.'); closeModal(); },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });
  const annuler = useMutation({
    mutationFn: ({ id, motif }) => api.post(`/depenses/${id}/annuler`, { motif }).then((r) => r.data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['depenses'] }); toast.success('Dépense annulée.'); setAnnulerTarget(null); setMotifAnnulation(''); },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });

  function closeModal() {
    setModalOpen(false);
    setEditing(null);
    setForm(EMPTY);
    setMotif('');
  }
  function openCreate() { setEditing(null); setForm(EMPTY); setModalOpen(true); }
  function openEdit(row) {
    setEditing(row);
    setForm({ date: row.date, categorieId: row.categorieId, libelle: row.libelle, montant: row.montant, modePaiement: row.modePaiement, beneficiaire: row.beneficiaire, commentaire: row.commentaire || '', etablissementId: row.etablissementId });
    setMotif('');
    setModalOpen(true);
  }
  function handleSubmit(e) {
    e.preventDefault();
    const payload = { ...form, categorieId: Number(form.categorieId), montant: Number(form.montant) };
    if (editing) update.mutate({ id: editing.id, ...payload, motif });
    else create.mutate(payload);
  }

  return (
    <div>
      <PageHeader
        title="Dépenses"
        subtitle="Traçabilité financière des dépenses par établissement (§6.7.2)."
        actions={<button className="btn-primary" onClick={openCreate}><Plus size={16} /> Nouvelle dépense</button>}
      />

      <DataTable
        columns={[
          { key: 'date', header: 'Date', render: (r) => formatDate(r.date) },
          { key: 'etablissementNom', header: 'Établissement' },
          { key: 'categorieNom', header: 'Catégorie' },
          { key: 'libelle', header: 'Libellé' },
          { key: 'montant', header: 'Montant', render: (r) => formatFCFA(r.montant) },
          { key: 'modePaiement', header: 'Mode', render: (r) => MODES.find((m) => m.value === r.modePaiement)?.label || r.modePaiement },
          { key: 'beneficiaire', header: 'Bénéficiaire' },
          { key: 'utilisateurNom', header: 'Enregistrée par' },
          { key: 'annulee', header: 'Statut', render: (r) => r.annulee ? <StatusBadge status="ANNULEE" /> : <StatusBadge status={true} label="Active" /> },
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
        toolbar={<>
          {superAdmin && (
            <Select className="w-auto" value={table.filters.etablissementId} onChange={(e) => table.setFilters({ etablissementId: e.target.value })}>
              <option value="">Tous les établissements</option>
              {(etablissements || []).map((et) => <option key={et.id} value={et.id}>{et.nom}</option>)}
            </Select>
          )}
          <Select className="w-auto" value={table.filters.categorieId} onChange={(e) => table.setFilters({ categorieId: e.target.value })}>
            <option value="">Toutes les catégories</option>
            {(categories || []).map((c) => <option key={c.id} value={c.id}>{c.nom}</option>)}
          </Select>
          <Select className="w-auto" value={table.filters.modePaiement} onChange={(e) => table.setFilters({ modePaiement: e.target.value })}>
            <option value="">Tous les modes</option>
            {MODES.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
          </Select>
          <input type="date" className="input w-auto" value={table.filters.dateDebut} onChange={(e) => table.setFilters({ dateDebut: e.target.value })} />
          <input type="date" className="input w-auto" value={table.filters.dateFin} onChange={(e) => table.setFilters({ dateFin: e.target.value })} />
        </>}
        rowActions={(row) => superAdmin && !row.annulee ? (
          <>
            <button className="btn-ghost p-1.5" title="Modifier" onClick={() => openEdit(row)}><Pencil size={15} /></button>
            <button className="btn-ghost p-1.5 text-danger" title="Annuler" onClick={() => setAnnulerTarget(row)}><Ban size={15} /></button>
          </>
        ) : null}
        emptyLabel="Aucune dépense."
      />

      <Modal
        open={modalOpen}
        onClose={closeModal}
        title={editing ? 'Modifier la dépense' : 'Nouvelle dépense'}
        footer={<>
          <button className="btn-secondary" onClick={closeModal}>Annuler</button>
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
            <Field label="Date" required><input type="date" max={todayISO()} className="input" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} required /></Field>
            <Field label="Catégorie" required>
              <Select value={form.categorieId} onChange={(e) => setForm((f) => ({ ...f, categorieId: e.target.value }))}>
                <option value="" disabled>Choisir</option>
                {(categories || []).map((c) => <option key={c.id} value={c.id}>{c.nom}</option>)}
              </Select>
            </Field>
          </div>
          <Field label="Libellé" required><input className="input" value={form.libelle} onChange={(e) => setForm((f) => ({ ...f, libelle: e.target.value }))} required /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Montant (FCFA)" required><input type="number" min="1" className="input" value={form.montant} onChange={(e) => setForm((f) => ({ ...f, montant: e.target.value }))} required /></Field>
            <Field label="Mode de paiement" required>
              <Select value={form.modePaiement} onChange={(e) => setForm((f) => ({ ...f, modePaiement: e.target.value }))}>
                {MODES.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
              </Select>
            </Field>
          </div>
          <Field label="Bénéficiaire" required hint="Fournisseur, prestataire, salarié...">
            <input className="input" value={form.beneficiaire} onChange={(e) => setForm((f) => ({ ...f, beneficiaire: e.target.value }))} required />
          </Field>
          <Field label="Commentaire"><input className="input" value={form.commentaire} onChange={(e) => setForm((f) => ({ ...f, commentaire: e.target.value }))} /></Field>
          {editing && (
            <Field label="Motif de la modification" required hint="Obligatoire pour toute modification (RG-094).">
              <input className="input" value={motif} onChange={(e) => setMotif(e.target.value)} required />
            </Field>
          )}
        </form>
      </Modal>

      <Modal
        open={!!annulerTarget}
        onClose={() => setAnnulerTarget(null)}
        title="Annuler la dépense"
        footer={<>
          <button className="btn-secondary" onClick={() => setAnnulerTarget(null)}>Fermer</button>
          <button className="btn-danger" onClick={() => annuler.mutate({ id: annulerTarget.id, motif: motifAnnulation })} disabled={!motifAnnulation || annuler.isPending}>Confirmer l'annulation</button>
        </>}
      >
        <p className="text-sm text-ink-light mb-3">La dépense reste visible dans l'historique, marquée comme annulée (RG-094).</p>
        <Field label="Motif" required>
          <input className="input" value={motifAnnulation} onChange={(e) => setMotifAnnulation(e.target.value)} required />
        </Field>
      </Modal>
    </div>
  );
}
