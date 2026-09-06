import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, CheckCircle2, Pencil } from 'lucide-react';
import api, { fetchPage, apiErrorMessage } from '../../lib/api';
import DataTable from '../../components/ui/DataTable';
import Modal from '../../components/ui/Modal';
import PageHeader from '../../components/ui/PageHeader';
import StatusBadge from '../../components/ui/StatusBadge';
import StatCard from '../../components/ui/StatCard';
import { Field, Select } from '../../components/ui/Field';
import { useTableState } from '../../hooks/useTableState';
import { useListQuery } from '../../hooks/useResource';
import { formatFCFA, formatDate, todayISO } from '../../lib/format';
import { useToast } from '../../components/ui/Toast';
import { PackagePlus } from 'lucide-react';

const EMPTY = { produitId: '', fournisseur: '', quantite: 1, prixUnitaire: 0, dateEntree: todayISO(), bonLivraison: '' };

export default function EntreesStockPage() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const table = useTableState({ initialSize: 10 });
  const { data, isLoading, isError, error, refetch } = useListQuery('entrees-stock', table.params);
  const { data: produits } = useQuery({ queryKey: ['produits', 'select-entree'], queryFn: () => fetchPage('/produits', { size: 200, actif: true }) });

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);

  const create = useMutation({
    mutationFn: (payload) => api.post('/entrees-stock', payload).then((r) => r.data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['entrees-stock'] }); toast.success('Entrée enregistrée.'); setModalOpen(false); setForm(EMPTY); },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });
  const update = useMutation({
    mutationFn: ({ id, ...payload }) => api.put(`/entrees-stock/${id}`, payload).then((r) => r.data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['entrees-stock'] }); toast.success('Entrée modifiée.'); setModalOpen(false); },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });
  const valider = useMutation({
    mutationFn: (id) => api.post(`/entrees-stock/${id}/valider`).then((r) => r.data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['entrees-stock'] }); toast.success('Entrée validée.'); },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });

  const rows = data?.rows || [];
  const totalMontant = rows.reduce((s, r) => s + (r.montant || 0), 0);

  function openCreate() { setEditing(null); setForm(EMPTY); setModalOpen(true); }
  function openEdit(r) { setEditing(r); setForm(r); setModalOpen(true); }
  function handleSubmit(e) {
    e.preventDefault();
    const produit = produits?.rows?.find((p) => String(p.id) === String(form.produitId));
    const payload = { ...form, montant: form.quantite * form.prixUnitaire, produitNom: produit?.nom };
    if (editing) update.mutate({ id: editing.id, ...payload });
    else create.mutate(payload);
  }

  return (
    <div>
      <PageHeader
        title="Entrées en stock"
        subtitle="Réceptions fournisseurs — non modifiables après validation."
        actions={<button className="btn-primary" onClick={openCreate}><Plus size={16} /> Nouvelle entrée</button>}
      />

      <div className="grid grid-cols-2 gap-4 mb-5">
        <StatCard icon={PackagePlus} label="Entrées (page)" value={rows.length} />
        <StatCard icon={PackagePlus} label="Montant total (page)" value={formatFCFA(totalMontant)} />
      </div>

      <DataTable
        columns={[
          { key: 'produitNom', header: 'Produit', sortable: true },
          { key: 'fournisseur', header: 'Fournisseur' },
          { key: 'quantite', header: 'Quantité' },
          { key: 'prixUnitaire', header: 'Prix unitaire', render: (r) => formatFCFA(r.prixUnitaire) },
          { key: 'montant', header: 'Montant', render: (r) => formatFCFA(r.montant), className: 'font-semibold' },
          { key: 'dateEntree', header: 'Date', render: (r) => formatDate(r.dateEntree) },
          { key: 'statut', header: 'Statut', render: (r) => <StatusBadge status={r.statut} /> },
        ]}
        rows={rows}
        total={data?.total || 0}
        totalPages={data?.totalPages || 0}
        page={table.page}
        isLoading={isLoading}
        isError={isError}
        errorMessage={apiErrorMessage(error)}
        onRetry={refetch}
        search={table.search}
        onSearchChange={table.setSearch}
        searchPlaceholder="Rechercher..."
        onPageChange={table.setPage}
        rowActions={(row) => (
          <>
            {row.statut === 'BROUILLON' && <button className="btn-ghost p-1.5" title="Modifier" onClick={() => openEdit(row)}><Pencil size={15} /></button>}
            {row.statut === 'BROUILLON' && <button className="btn-ghost p-1.5 text-success" title="Valider" onClick={() => valider.mutate(row.id)}><CheckCircle2 size={15} /></button>}
          </>
        )}
        emptyLabel="Aucune entrée enregistrée."
      />

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? "Modifier l'entrée" : 'Nouvelle entrée de stock'}
        footer={<>
          <button className="btn-secondary" onClick={() => setModalOpen(false)}>Annuler</button>
          <button className="btn-primary" onClick={handleSubmit} disabled={create.isPending || update.isPending}>{editing ? 'Enregistrer' : 'Créer'}</button>
        </>}
      >
        <form onSubmit={handleSubmit}>
          <Field label="Produit" required>
            <Select value={form.produitId} onChange={(e) => setForm((f) => ({ ...f, produitId: e.target.value }))} required>
              <option value="">Sélectionner...</option>
              {(produits?.rows || []).map((p) => <option key={p.id} value={p.id}>{p.nom} ({p.code})</option>)}
            </Select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Fournisseur" required><input className="input" value={form.fournisseur} onChange={(e) => setForm((f) => ({ ...f, fournisseur: e.target.value }))} required /></Field>
            <Field label="N° Bon de livraison"><input className="input" value={form.bonLivraison} onChange={(e) => setForm((f) => ({ ...f, bonLivraison: e.target.value }))} /></Field>
            <Field label="Quantité" required><input type="number" className="input" value={form.quantite} onChange={(e) => setForm((f) => ({ ...f, quantite: Number(e.target.value) }))} required /></Field>
            <Field label="Prix unitaire" required><input type="number" className="input" value={form.prixUnitaire} onChange={(e) => setForm((f) => ({ ...f, prixUnitaire: Number(e.target.value) }))} required /></Field>
            <Field label="Date d'entrée" required><input type="date" className="input" value={form.dateEntree} onChange={(e) => setForm((f) => ({ ...f, dateEntree: e.target.value }))} required /></Field>
          </div>
        </form>
      </Modal>
    </div>
  );
}
