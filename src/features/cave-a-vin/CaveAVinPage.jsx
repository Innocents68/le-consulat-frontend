import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Archive, History, AlertTriangle } from 'lucide-react';
import api, { fetchPage, apiErrorMessage } from '../../lib/api';
import DataTable from '../../components/ui/DataTable';
import Modal from '../../components/ui/Modal';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import PageHeader from '../../components/ui/PageHeader';
import StatCard from '../../components/ui/StatCard';
import StatusBadge from '../../components/ui/StatusBadge';
import { Field, Select } from '../../components/ui/Field';
import { useTableState } from '../../hooks/useTableState';
import { useListQuery } from '../../hooks/useResource';
import { formatFCFA, formatDateTime } from '../../lib/format';
import { useToast } from '../../components/ui/Toast';
import { Wine } from 'lucide-react';

const TYPE_LABEL = {
  VIN_ROUGE: 'Vin rouge', VIN_BLANC: 'Vin blanc', CHAMPAGNE: 'Champagne',
  WHISKY: 'Whisky', BIERE: 'Bière', SPIRITUEUX: 'Spiritueux', AUTRE: 'Autre',
};
const EMPTY = { nom: '', type: 'VIN_ROUGE', origine: '', millesime: '', prixAchatBouteille: 0, prixVenteBouteille: 0, prixVenteVerre: 0, fournisseurId: '', quantiteStock: 0, seuilAlerte: 5, actif: true };

export default function CaveAVinPage() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const table = useTableState({ initialSize: 12 });
  const { data, isLoading, isError, error, refetch } = useListQuery('boissons', table.params);
  const { data: fournisseurs } = useQuery({ queryKey: ['fournisseurs', 'all'], queryFn: () => fetchPage('/fournisseurs', { size: 100 }) });

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [archiveTarget, setArchiveTarget] = useState(null);
  const [historyTarget, setHistoryTarget] = useState(null);

  const { data: mouvements, isLoading: loadingMvt } = useQuery({
    queryKey: ['mouvements-cave', historyTarget?.id],
    queryFn: () => fetchPage('/mouvements-cave', { size: 20, boissonId: historyTarget.id, sort: 'date,desc' }),
    enabled: !!historyTarget,
  });

  const create = useMutation({
    mutationFn: (payload) => api.post('/boissons', payload).then((r) => r.data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['boissons'] }); toast.success('Boisson ajoutée.'); setModalOpen(false); },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });
  const update = useMutation({
    mutationFn: ({ id, ...payload }) => api.put(`/boissons/${id}`, payload).then((r) => r.data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['boissons'] }); toast.success('Boisson modifiée.'); setModalOpen(false); },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });
  const remove = useMutation({
    mutationFn: (id) => api.delete(`/boissons/${id}`).then((r) => r.data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['boissons'] }); toast.success('Boisson archivée.'); setArchiveTarget(null); },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });

  const rows = data?.rows || [];
  const totalValeur = rows.reduce((s, b) => s + (b.quantiteStock || 0) * (b.prixAchatBouteille || 0), 0);
  const enAlerte = rows.filter((b) => b.quantiteStock <= b.seuilAlerte).length;

  function openCreate() { setEditing(null); setForm(EMPTY); setModalOpen(true); }
  function openEdit(b) { setEditing(b); setForm(b); setModalOpen(true); }
  function handleSubmit(e) {
    e.preventDefault();
    if (editing) update.mutate({ id: editing.id, ...form });
    else create.mutate(form);
  }

  return (
    <div>
      <PageHeader
        title="Cave à vin"
        subtitle="Vins, champagnes et spiritueux : stocks, prix et alertes."
        actions={<button className="btn-primary" onClick={openCreate}><Plus size={16} /> Nouveau vin</button>}
      />

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-5">
        <StatCard icon={Wine} label="Références" value={data?.total ?? 0} />
        <StatCard icon={Wine} label="Valeur du stock" value={formatFCFA(totalValeur)} />
        <StatCard icon={AlertTriangle} label="Stock faible" value={enAlerte} accent={enAlerte > 0} />
      </div>

      <DataTable
        columns={[
          { key: 'nom', header: 'Vin / Boisson', sortable: true },
          { key: 'type', header: 'Type', render: (r) => TYPE_LABEL[r.type] || r.type },
          { key: 'millesime', header: 'Millésime' },
          { key: 'quantiteStock', header: 'Stock', render: (r) => (
            <span className={r.quantiteStock <= r.seuilAlerte ? 'text-danger font-bold' : 'font-medium'}>{r.quantiteStock}</span>
          ) },
          { key: 'prixVenteBouteille', header: 'Prix bouteille', render: (r) => formatFCFA(r.prixVenteBouteille) },
          { key: 'prixVenteVerre', header: 'Prix verre', render: (r) => formatFCFA(r.prixVenteVerre) },
          { key: 'actif', header: 'Statut', render: (r) => <StatusBadge status={r.actif} /> },
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
        searchPlaceholder="Rechercher un vin..."
        onPageChange={table.setPage}
        rowActions={(row) => (
          <>
            <button className="btn-ghost p-1.5" title="Historique" onClick={() => setHistoryTarget(row)}><History size={15} /></button>
            <button className="btn-ghost p-1.5" title="Modifier" onClick={() => openEdit(row)}><Pencil size={15} /></button>
            {row.actif && <button className="btn-ghost p-1.5 text-danger" title="Archiver" onClick={() => setArchiveTarget(row)}><Archive size={15} /></button>}
          </>
        )}
        emptyLabel="Aucune référence en cave."
      />

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Modifier la référence' : 'Nouvelle référence'}
        size="lg"
        footer={
          <>
            <button className="btn-secondary" onClick={() => setModalOpen(false)}>Annuler</button>
            <button className="btn-primary" onClick={handleSubmit} disabled={create.isPending || update.isPending}>{editing ? 'Enregistrer' : 'Créer'}</button>
          </>
        }
      >
        <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-x-4">
          <Field label="Nom" required><input className="input" value={form.nom} onChange={(e) => setForm((f) => ({ ...f, nom: e.target.value }))} required /></Field>
          <Field label="Type" required>
            <Select value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}>
              {Object.entries(TYPE_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </Select>
          </Field>
          <Field label="Origine"><input className="input" value={form.origine || ''} onChange={(e) => setForm((f) => ({ ...f, origine: e.target.value }))} /></Field>
          <Field label="Millésime"><input className="input" value={form.millesime || ''} onChange={(e) => setForm((f) => ({ ...f, millesime: e.target.value }))} /></Field>
          <Field label="Fournisseur">
            <Select value={form.fournisseurId || ''} onChange={(e) => setForm((f) => ({ ...f, fournisseurId: e.target.value }))}>
              <option value="">—</option>
              {(fournisseurs?.rows || []).map((f) => <option key={f.id} value={f.id}>{f.nom}</option>)}
            </Select>
          </Field>
          <Field label="Stock actuel (bouteilles)"><input type="number" className="input" value={form.quantiteStock} onChange={(e) => setForm((f) => ({ ...f, quantiteStock: Number(e.target.value) }))} /></Field>
          <Field label="Prix d'achat / bouteille"><input type="number" className="input" value={form.prixAchatBouteille} onChange={(e) => setForm((f) => ({ ...f, prixAchatBouteille: Number(e.target.value) }))} /></Field>
          <Field label="Seuil d'alerte"><input type="number" className="input" value={form.seuilAlerte} onChange={(e) => setForm((f) => ({ ...f, seuilAlerte: Number(e.target.value) }))} /></Field>
          <Field label="Prix de vente / bouteille"><input type="number" className="input" value={form.prixVenteBouteille} onChange={(e) => setForm((f) => ({ ...f, prixVenteBouteille: Number(e.target.value) }))} /></Field>
          <Field label="Prix de vente / verre"><input type="number" className="input" value={form.prixVenteVerre} onChange={(e) => setForm((f) => ({ ...f, prixVenteVerre: Number(e.target.value) }))} /></Field>
        </form>
      </Modal>

      <Modal open={!!historyTarget} onClose={() => setHistoryTarget(null)} title={`Historique — ${historyTarget?.nom || ''}`}>
        {loadingMvt ? <p className="text-sm text-ink-light py-6 text-center">Chargement...</p> : (
          <div className="flex flex-col divide-y divide-black/5">
            {(mouvements?.rows || []).length === 0 && <p className="text-sm text-ink-light py-6 text-center">Aucun mouvement.</p>}
            {(mouvements?.rows || []).map((m) => (
              <div key={m.id} className="flex items-center justify-between py-2 text-sm">
                <div>
                  <p className={`font-semibold ${m.type === 'ENTREE' ? 'text-success' : 'text-danger'}`}>{m.type === 'ENTREE' ? '+ ' : '- '}{m.quantite} · {m.motif}</p>
                  <p className="text-xs text-ink-light">{formatDateTime(m.date)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={!!archiveTarget}
        onClose={() => setArchiveTarget(null)}
        onConfirm={() => remove.mutate(archiveTarget.id)}
        title="Archiver la référence"
        message={`Archiver "${archiveTarget?.nom}" ?`}
        loading={remove.isPending}
      />
    </div>
  );
}
