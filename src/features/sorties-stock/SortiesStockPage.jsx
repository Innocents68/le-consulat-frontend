import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, CheckCircle2, Pencil, PackageMinus } from 'lucide-react';
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

const MOTIF_LABEL = { VENTE: 'Vente', PERTE: 'Perte', CASSE: 'Casse', TRANSFERT: 'Transfert' };
const EMPTY = { produitId: '', motif: 'PERTE', quantite: 1, prixUnitaire: 0, dateSortie: todayISO() };

export default function SortiesStockPage() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const table = useTableState({ initialSize: 10 });
  const { data, isLoading, isError, error, refetch } = useListQuery('sorties-stock', table.params);
  const { data: produits } = useQuery({ queryKey: ['produits', 'select-sortie'], queryFn: () => fetchPage('/produits', { size: 200, actif: true }) });

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);

  const create = useMutation({
    mutationFn: (payload) => api.post('/sorties-stock', payload).then((r) => r.data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['sorties-stock'] }); toast.success('Sortie enregistrée.'); setModalOpen(false); setForm(EMPTY); },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });
  const update = useMutation({
    mutationFn: ({ id, ...payload }) => api.put(`/sorties-stock/${id}`, payload).then((r) => r.data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['sorties-stock'] }); toast.success('Sortie modifiée.'); setModalOpen(false); },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });
  const valider = useMutation({
    mutationFn: (id) => api.post(`/sorties-stock/${id}/valider`).then((r) => r.data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['sorties-stock'] }); toast.success('Sortie validée.'); },
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
        title="Sorties de stock"
        subtitle="Ventes, pertes, casse et transferts — non modifiables après validation."
        actions={<button className="btn-primary" onClick={openCreate}><Plus size={16} /> Nouvelle sortie</button>}
      />

      <div className="grid grid-cols-2 gap-4 mb-5">
        <StatCard icon={PackageMinus} label="Sorties (page)" value={rows.length} />
        <StatCard icon={PackageMinus} label="Montant total (page)" value={formatFCFA(totalMontant)} />
      </div>

      <DataTable
        columns={[
          { key: 'produitNom', header: 'Produit', sortable: true },
          { key: 'motif', header: 'Motif', render: (r) => MOTIF_LABEL[r.motif] || r.motif },
          { key: 'quantite', header: 'Quantité' },
          { key: 'montant', header: 'Montant', render: (r) => formatFCFA(r.montant), className: 'font-semibold' },
          { key: 'dateSortie', header: 'Date', render: (r) => formatDate(r.dateSortie) },
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
        emptyLabel="Aucune sortie enregistrée."
      />

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Modifier la sortie' : 'Nouvelle sortie de stock'}
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
            <Field label="Motif" required>
              <Select value={form.motif} onChange={(e) => setForm((f) => ({ ...f, motif: e.target.value }))}>
                {Object.entries(MOTIF_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </Select>
            </Field>
            <Field label="Quantité" required><input type="number" className="input" value={form.quantite} onChange={(e) => setForm((f) => ({ ...f, quantite: Number(e.target.value) }))} required /></Field>
            <Field label="Prix unitaire" required><input type="number" className="input" value={form.prixUnitaire} onChange={(e) => setForm((f) => ({ ...f, prixUnitaire: Number(e.target.value) }))} required /></Field>
            <Field label="Date de sortie" required><input type="date" className="input" value={form.dateSortie} onChange={(e) => setForm((f) => ({ ...f, dateSortie: e.target.value }))} required /></Field>
          </div>
        </form>
      </Modal>
    </div>
  );
}
