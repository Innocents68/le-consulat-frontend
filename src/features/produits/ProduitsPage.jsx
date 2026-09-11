import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Power, History } from 'lucide-react';
import api, { apiErrorMessage } from '../../lib/api';
import DataTable from '../../components/ui/DataTable';
import Modal from '../../components/ui/Modal';
import PageHeader from '../../components/ui/PageHeader';
import StatusBadge from '../../components/ui/StatusBadge';
import { Field, Select } from '../../components/ui/Field';
import { useTableState } from '../../hooks/useTableState';
import { useListQuery } from '../../hooks/useResource';
import { formatFCFA, formatDateTime } from '../../lib/format';
import { useToast } from '../../components/ui/Toast';
import { useAuthStore } from '../../store/authStore';
import { isSuperAdmin } from '../../lib/perimetre';

const UNITES = ['PIECE', 'BOUTEILLE', 'CASIER', 'VERRE', 'PORTION', 'LITRE'];

const EMPTY = {
  nom: '', categorieId: '', description: '', unite: 'PIECE', prixVente: '', prixAchat: '', etablissementId: '',
  suiviStock: false, seuilAlerte: '', emplacement: '', fournisseurId: '',
};

export default function ProduitsPage() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const superAdmin = isSuperAdmin(user);

  // Préremplissage depuis un raccourci du menu (?etablissementId=X).
  const etablissementIdInitial = new URLSearchParams(window.location.search).get('etablissementId') || '';
  const table = useTableState({ initialSize: 10, extraFilters: { etablissementId: etablissementIdInitial } });
  const { data, isLoading, isError, error, refetch } = useListQuery('produits', table.params);
  const { data: etablissements } = useQuery({ queryKey: ['etablissements'], queryFn: async () => (await api.get('/etablissements')).data });

  // La catégorie dépend de l'établissement choisi (Super Admin) ou de l'établissement de
  // l'utilisateur (Gérant/Caissier, jamais choisi librement — RG-014/RG-015).
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [historyTarget, setHistoryTarget] = useState(null);

  const categorieEtablissementId = superAdmin ? form.etablissementId : user?.etablissementId;
  const { data: categories } = useQuery({
    queryKey: ['categories', categorieEtablissementId],
    queryFn: async () => (await api.get('/categories', { params: categorieEtablissementId ? { etablissementId: categorieEtablissementId } : {} })).data,
    enabled: !!categorieEtablissementId || !superAdmin,
  });
  const { data: historique } = useQuery({
    queryKey: ['historique-prix', historyTarget?.id],
    queryFn: async () => (await api.get(`/produits/${historyTarget.id}/historique-prix`)).data,
    enabled: !!historyTarget,
  });
  const { data: fournisseurs } = useQuery({ queryKey: ['fournisseurs'], queryFn: async () => (await api.get('/fournisseurs')).data });

  const create = useMutation({
    mutationFn: (payload) => api.post('/produits', payload).then((r) => r.data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['produits'] }); toast.success('Produit créé.'); setModalOpen(false); },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });
  const update = useMutation({
    mutationFn: ({ id, ...payload }) => api.put(`/produits/${id}`, payload).then((r) => r.data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['produits'] }); toast.success('Produit modifié.'); setModalOpen(false); },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });
  const toggleActif = useMutation({
    mutationFn: (id) => api.patch(`/produits/${id}/statut`).then((r) => r.data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['produits'] }); toast.success('Statut mis à jour.'); },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });

  function openCreate() { setEditing(null); setForm(EMPTY); setModalOpen(true); }
  function openEdit(p) { setEditing(p); setForm({ ...p, categorieId: p.categorieId, etablissementId: p.etablissementId }); setModalOpen(true); }
  function handleSubmit(e) {
    e.preventDefault();
    const payload = {
      ...form,
      categorieId: Number(form.categorieId),
      prixVente: Number(form.prixVente),
      prixAchat: form.prixAchat ? Number(form.prixAchat) : null,
      seuilAlerte: form.seuilAlerte ? Number(form.seuilAlerte) : null,
      emplacement: form.emplacement || null,
      fournisseurId: form.fournisseurId ? Number(form.fournisseurId) : null,
    };
    if (editing) update.mutate({ id: editing.id, ...payload });
    else create.mutate(payload);
  }

  return (
    <div>
      <PageHeader
        title="Produits"
        subtitle="Catalogue et tarifs de votre établissement."
        actions={<button className="btn-primary" onClick={openCreate}><Plus size={16} /> Nouveau produit</button>}
      />

      <DataTable
        columns={[
          { key: 'nom', header: 'Nom', sortable: true },
          { key: 'categorieNom', header: 'Catégorie' },
          { key: 'etablissementNom', header: 'Établissement' },
          { key: 'unite', header: 'Unité' },
          { key: 'prixVente', header: 'Prix de vente', render: (r) => formatFCFA(r.prixVente) },
          {
            key: 'quantiteStock',
            header: 'Stock',
            render: (r) => r.suiviStock
              ? <span className={r.seuilAlerte != null && r.quantiteStock <= r.seuilAlerte ? 'text-danger font-bold' : ''}>{r.quantiteStock}</span>
              : '—',
          },
          { key: 'disponible', header: 'Disponible', render: (r) => <StatusBadge status={r.disponible} /> },
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
        searchPlaceholder="Rechercher un produit..."
        onPageChange={table.setPage}
        toolbar={superAdmin && (
          <Select className="w-auto" value={table.filters.etablissementId} onChange={(e) => table.setFilters({ etablissementId: e.target.value })}>
            <option value="">Choisir un établissement</option>
            {(etablissements || []).map((et) => <option key={et.id} value={et.id}>{et.nom}</option>)}
          </Select>
        )}
        rowActions={(row) => (
          <>
            <button className="btn-ghost p-1.5" title="Modifier" onClick={() => openEdit(row)}><Pencil size={15} /></button>
            <button className="btn-ghost p-1.5" title="Historique des prix" onClick={() => setHistoryTarget(row)}><History size={15} /></button>
            <button className={`btn-ghost p-1.5 ${row.actif ? 'text-danger' : 'text-success'}`} title={row.actif ? 'Désactiver' : 'Activer'} onClick={() => toggleActif.mutate(row.id)}>
              <Power size={15} />
            </button>
          </>
        )}
        emptyLabel="Aucun produit."
      />

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Modifier le produit' : 'Nouveau produit'}
        footer={<>
          <button className="btn-secondary" onClick={() => setModalOpen(false)}>Annuler</button>
          <button className="btn-primary" onClick={handleSubmit} disabled={create.isPending || update.isPending}>{editing ? 'Enregistrer' : 'Créer'}</button>
        </>}
      >
        <form onSubmit={handleSubmit}>
          {superAdmin && !editing && (
            <Field label="Établissement" required>
              <Select value={form.etablissementId} onChange={(e) => setForm((f) => ({ ...f, etablissementId: e.target.value, categorieId: '' }))}>
                <option value="" disabled>Choisir un établissement</option>
                {(etablissements || []).map((et) => <option key={et.id} value={et.id}>{et.nom}</option>)}
              </Select>
            </Field>
          )}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Nom" required><input className="input" value={form.nom} onChange={(e) => setForm((f) => ({ ...f, nom: e.target.value }))} required /></Field>
            <Field label="Catégorie" required>
              <Select value={form.categorieId} onChange={(e) => setForm((f) => ({ ...f, categorieId: e.target.value }))}>
                <option value="" disabled>Choisir</option>
                {(categories || []).map((c) => <option key={c.id} value={c.id}>{c.nom}</option>)}
              </Select>
            </Field>
            <Field label="Unité" required>
              <Select value={form.unite} onChange={(e) => setForm((f) => ({ ...f, unite: e.target.value }))}>
                {UNITES.map((u) => <option key={u} value={u}>{u}</option>)}
              </Select>
            </Field>
            <Field label="Prix de vente (FCFA)" required><input type="number" min="1" className="input" value={form.prixVente} onChange={(e) => setForm((f) => ({ ...f, prixVente: e.target.value }))} required /></Field>
            <Field label="Prix d'achat (FCFA)"><input type="number" min="0" className="input" value={form.prixAchat || ''} onChange={(e) => setForm((f) => ({ ...f, prixAchat: e.target.value }))} /></Field>
          </div>
          <Field label="Description"><input className="input" value={form.description || ''} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} /></Field>

          <label className="flex items-center gap-2 text-sm mt-2 mb-3">
            <input type="checkbox" checked={!!form.suiviStock} onChange={(e) => setForm((f) => ({ ...f, suiviStock: e.target.checked }))} />
            Suivi de stock (RG-031/RG-062 — décrémentation automatique à la vente)
          </label>

          {form.suiviStock && (
            <div className="grid grid-cols-2 gap-3">
              <Field label="Seuil d'alerte" hint="Déclenche une mise en évidence visuelle (EF-027).">
                <input type="number" min="0" step="0.001" className="input" value={form.seuilAlerte || ''} onChange={(e) => setForm((f) => ({ ...f, seuilAlerte: e.target.value }))} />
              </Field>
              <Field label="Emplacement"><input className="input" value={form.emplacement || ''} onChange={(e) => setForm((f) => ({ ...f, emplacement: e.target.value }))} /></Field>
              <Field label="Fournisseur">
                <Select value={form.fournisseurId || ''} onChange={(e) => setForm((f) => ({ ...f, fournisseurId: e.target.value }))}>
                  <option value="">Aucun</option>
                  {(fournisseurs || []).map((f) => <option key={f.id} value={f.id}>{f.nom}</option>)}
                </Select>
              </Field>
              {editing && <Field label="Stock actuel" hint="Modifiable uniquement via Mouvements de stock."><input className="input" value={editing.quantiteStock} disabled /></Field>}
            </div>
          )}
        </form>
      </Modal>

      <Modal open={!!historyTarget} onClose={() => setHistoryTarget(null)} title={`Historique des prix — ${historyTarget?.nom || ''}`}>
        <div className="flex flex-col gap-2">
          {(historique || []).length === 0 && <p className="text-sm text-ink-light">Aucun changement de prix enregistré.</p>}
          {(historique || []).map((h) => (
            <div key={h.id} className="flex items-center justify-between text-sm border-b border-black/5 pb-2">
              <span>{formatFCFA(h.ancienPrix)} → {formatFCFA(h.nouveauPrix)}</span>
              <span className="text-ink-light text-xs">{formatDateTime(h.dateEffet)} · {h.auteurNom || '—'}</span>
            </div>
          ))}
        </div>
      </Modal>
    </div>
  );
}
