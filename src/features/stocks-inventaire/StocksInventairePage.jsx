import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Archive, Boxes, AlertTriangle, PieChart as PieIcon, ClipboardCheck } from 'lucide-react';
import api, { fetchPage, apiErrorMessage } from '../../lib/api';
import DataTable from '../../components/ui/DataTable';
import Modal from '../../components/ui/Modal';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import PageHeader from '../../components/ui/PageHeader';
import StatCard from '../../components/ui/StatCard';
import { Field, Select } from '../../components/ui/Field';
import { DonutChart, PALETTE } from '../../components/ui/Charts';
import { useTableState } from '../../hooks/useTableState';
import { useListQuery } from '../../hooks/useResource';
import { formatFCFA, formatDate } from '../../lib/format';
import { useToast } from '../../components/ui/Toast';

const EMPTY = { code: '', nom: '', categorieId: '', unite: 'unité', prixAchat: 0, prixVente: 0, seuilAlerte: 5, quantiteStock: 0, depotId: '', actif: true };

function ProduitsTab() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const table = useTableState({ initialSize: 10 });
  const { data, isLoading, isError, error, refetch } = useListQuery('produits', table.params);
  const { data: categories } = useQuery({ queryKey: ['categories-produits', 'all'], queryFn: () => fetchPage('/categories-produits', { size: 100 }) });
  const { data: depots } = useQuery({ queryKey: ['depots', 'all'], queryFn: () => fetchPage('/depots', { size: 100 }) });
  const { data: allProduits } = useQuery({ queryKey: ['produits', 'kpi'], queryFn: () => fetchPage('/produits', { size: 500 }) });

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [archiveTarget, setArchiveTarget] = useState(null);

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
  const remove = useMutation({
    mutationFn: (id) => api.delete(`/produits/${id}`).then((r) => r.data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['produits'] }); toast.success('Produit archivé.'); setArchiveTarget(null); },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });

  const allRows = allProduits?.rows || [];
  const valeurTotale = allRows.reduce((s, p) => s + (p.quantiteStock || 0) * (p.prixAchat || 0), 0);
  const ruptures = allRows.filter((p) => p.quantiteStock <= 0).length;
  const repartition = useMemo(() => {
    const byCategory = {};
    allRows.forEach((p) => {
      const key = p.categorieNom || 'Autres';
      byCategory[key] = (byCategory[key] || 0) + (p.quantiteStock || 0) * (p.prixAchat || 0);
    });
    return Object.entries(byCategory).map(([label, value]) => ({ label, value }));
  }, [allRows]);

  function openCreate() { setEditing(null); setForm(EMPTY); setModalOpen(true); }
  function openEdit(p) { setEditing(p); setForm(p); setModalOpen(true); }
  function handleSubmit(e) {
    e.preventDefault();
    if (editing) update.mutate({ id: editing.id, ...form });
    else create.mutate(form);
  }

  return (
    <div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
        <StatCard icon={Boxes} label="Valeur totale du stock" value={formatFCFA(valeurTotale)} />
        <StatCard icon={Boxes} label="Références actives" value={allRows.length} />
        <StatCard icon={AlertTriangle} label="Produits en rupture" value={ruptures} accent={ruptures > 0} />
        <div className="card p-3 flex items-center gap-2">
          <div className="w-16 h-16 shrink-0"><DonutChart data={repartition} dataKey="value" nameKey="label" height={64} /></div>
          <div className="text-xs">
            <p className="font-bold text-ink-light flex items-center gap-1 mb-1"><PieIcon size={12} /> Par catégorie</p>
            {repartition.slice(0, 2).map((r, i) => (
              <p key={r.label} className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full" style={{ background: PALETTE[i % PALETTE.length] }} />{r.label}</p>
            ))}
          </div>
        </div>
      </div>

      <DataTable
        columns={[
          { key: 'code', header: 'Code', sortable: true },
          { key: 'nom', header: 'Produit', sortable: true },
          { key: 'categorieNom', header: 'Catégorie' },
          { key: 'quantiteStock', header: 'Stock', render: (r) => (
            <span className={r.quantiteStock <= r.seuilAlerte ? 'text-danger font-bold' : 'font-medium'}>{r.quantiteStock} {r.unite}</span>
          ) },
          { key: 'prixVente', header: 'Prix vente', render: (r) => formatFCFA(r.prixVente) },
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
        toolbar={<button className="btn-primary" onClick={openCreate}><Plus size={15} /> Nouveau produit</button>}
        rowActions={(row) => (
          <>
            <button className="btn-ghost p-1.5" title="Modifier" onClick={() => openEdit(row)}><Pencil size={15} /></button>
            {row.actif && <button className="btn-ghost p-1.5 text-danger" title="Archiver" onClick={() => setArchiveTarget(row)}><Archive size={15} /></button>}
          </>
        )}
        emptyLabel="Aucun produit."
      />

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Modifier le produit' : 'Nouveau produit'}
        size="lg"
        footer={<>
          <button className="btn-secondary" onClick={() => setModalOpen(false)}>Annuler</button>
          <button className="btn-primary" onClick={handleSubmit} disabled={create.isPending || update.isPending}>{editing ? 'Enregistrer' : 'Créer'}</button>
        </>}
      >
        <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-x-4">
          <Field label="Code (unique)" required><input className="input" value={form.code} onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))} required /></Field>
          <Field label="Nom" required><input className="input" value={form.nom} onChange={(e) => setForm((f) => ({ ...f, nom: e.target.value }))} required /></Field>
          <Field label="Catégorie">
            <Select value={form.categorieId || ''} onChange={(e) => setForm((f) => ({ ...f, categorieId: e.target.value }))}>
              <option value="">—</option>
              {(categories?.rows || []).map((c) => <option key={c.id} value={c.id}>{c.nom}</option>)}
            </Select>
          </Field>
          <Field label="Unité"><input className="input" value={form.unite} onChange={(e) => setForm((f) => ({ ...f, unite: e.target.value }))} /></Field>
          <Field label="Dépôt">
            <Select value={form.depotId || ''} onChange={(e) => setForm((f) => ({ ...f, depotId: e.target.value }))}>
              <option value="">—</option>
              {(depots?.rows || []).map((d) => <option key={d.id} value={d.id}>{d.nom}</option>)}
            </Select>
          </Field>
          <Field label="Stock actuel"><input type="number" className="input" value={form.quantiteStock} onChange={(e) => setForm((f) => ({ ...f, quantiteStock: Number(e.target.value) }))} /></Field>
          <Field label="Prix d'achat"><input type="number" className="input" value={form.prixAchat} onChange={(e) => setForm((f) => ({ ...f, prixAchat: Number(e.target.value) }))} /></Field>
          <Field label="Prix de vente"><input type="number" className="input" value={form.prixVente} onChange={(e) => setForm((f) => ({ ...f, prixVente: Number(e.target.value) }))} /></Field>
          <Field label="Seuil d'alerte"><input type="number" className="input" value={form.seuilAlerte} onChange={(e) => setForm((f) => ({ ...f, seuilAlerte: Number(e.target.value) }))} /></Field>
        </form>
      </Modal>

      <ConfirmDialog open={!!archiveTarget} onClose={() => setArchiveTarget(null)} onConfirm={() => remove.mutate(archiveTarget.id)} title="Archiver le produit" message={`Archiver "${archiveTarget?.nom}" ?`} loading={remove.isPending} />
    </div>
  );
}

function InventairesTab() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const table = useTableState({ initialSize: 10 });
  const { data, isLoading, isError, error, refetch } = useListQuery('inventaires', table.params);
  const [createOpen, setCreateOpen] = useState(false);
  const [type, setType] = useState('PHYSIQUE');
  const [detail, setDetail] = useState(null);

  const create = useMutation({
    mutationFn: () => api.post('/inventaires', { type, dateInventaire: new Date().toISOString().slice(0, 10) }).then((r) => r.data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['inventaires'] }); toast.success('Inventaire lancé.'); setCreateOpen(false); },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });

  const updateQty = useMutation({
    mutationFn: ({ id, lignes }) => api.put(`/inventaires/${id}`, { lignes }).then((r) => r.data),
    onSuccess: (d) => { setDetail(d); queryClient.invalidateQueries({ queryKey: ['inventaires'] }); },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });

  const valider = useMutation({
    mutationFn: (id) => api.post(`/inventaires/${id}/valider`).then((r) => r.data),
    onSuccess: () => { toast.success('Inventaire validé, rapport d\'écart généré.'); queryClient.invalidateQueries({ queryKey: ['inventaires'] }); setDetail(null); },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });

  function setLigneQty(ligneIndex, value) {
    setDetail((d) => {
      const lignes = [...d.lignes];
      lignes[ligneIndex] = { ...lignes[ligneIndex], quantiteReelle: value, ecart: value - lignes[ligneIndex].quantiteTheorique };
      return { ...d, lignes };
    });
  }

  return (
    <div>
      <div className="flex justify-end mb-3">
        <button className="btn-primary" onClick={() => setCreateOpen(true)}><Plus size={15} /> Lancer un inventaire</button>
      </div>
      <DataTable
        columns={[
          { key: 'dateInventaire', header: 'Date', render: (r) => formatDate(r.dateInventaire) },
          { key: 'type', header: 'Type', render: (r) => r.type === 'PHYSIQUE' ? 'Physique' : 'Partiel' },
          { key: 'statut', header: 'Statut' },
          { key: 'lignes', header: 'Lignes', render: (r) => r.lignes?.length ?? 0 },
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
        onRowClick={setDetail}
        emptyLabel="Aucun inventaire lancé."
      />

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Lancer un inventaire" footer={
        <><button className="btn-secondary" onClick={() => setCreateOpen(false)}>Annuler</button><button className="btn-primary" onClick={() => create.mutate()} disabled={create.isPending}>Lancer</button></>
      }>
        <Field label="Type d'inventaire">
          <Select value={type} onChange={(e) => setType(e.target.value)}>
            <option value="PHYSIQUE">Physique (complet)</option>
            <option value="PARTIEL">Partiel</option>
          </Select>
        </Field>
      </Modal>

      <Modal open={!!detail} onClose={() => setDetail(null)} title={`Inventaire du ${formatDate(detail?.dateInventaire)}`} size="lg" footer={
        detail?.statut === 'EN_COURS' && (
          <>
            <button className="btn-secondary" onClick={() => updateQty.mutate({ id: detail.id, lignes: detail.lignes })} disabled={updateQty.isPending}>Enregistrer les comptages</button>
            <button className="btn-primary" onClick={() => valider.mutate(detail.id)} disabled={valider.isPending}><ClipboardCheck size={15} /> Valider</button>
          </>
        )
      }>
        {detail && (
          <table className="w-full text-sm">
            <thead><tr className="text-left text-xs text-ink-light uppercase"><th className="pb-1">Produit</th><th className="pb-1">Théorique</th><th className="pb-1">Réel</th><th className="pb-1">Écart</th></tr></thead>
            <tbody>
              {(detail.lignes || []).map((l, i) => (
                <tr key={l.produitId} className="border-t border-black/5">
                  <td className="py-1.5">{l.produitNom}</td>
                  <td className="py-1.5">{l.quantiteTheorique}</td>
                  <td className="py-1.5">
                    {detail.statut === 'EN_COURS' ? (
                      <input type="number" className="input py-1 w-24" value={l.quantiteReelle ?? ''} onChange={(e) => setLigneQty(i, Number(e.target.value))} />
                    ) : l.quantiteReelle}
                  </td>
                  <td className={`py-1.5 font-semibold ${l.ecart < 0 ? 'text-danger' : l.ecart > 0 ? 'text-warning' : 'text-success'}`}>{l.ecart ?? '—'}</td>
                </tr>
              ))}
              {(detail.lignes || []).length === 0 && <tr><td colSpan={4} className="text-center py-6 text-ink-light">Aucune ligne (à compléter côté backend).</td></tr>}
            </tbody>
          </table>
        )}
      </Modal>
    </div>
  );
}

export default function StocksInventairePage() {
  const [tab, setTab] = useState('produits');
  return (
    <div>
      <PageHeader title="Stocks et inventaire" subtitle="Suivi des références, valorisation et inventaires physiques." />
      <div className="flex gap-1.5 mb-5">
        {[{ id: 'produits', label: 'Produits' }, { id: 'inventaires', label: 'Inventaires' }].map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)} className={`px-4 py-1.5 rounded-full text-sm font-semibold ${tab === t.id ? 'bg-bordeaux-700 text-white' : 'bg-white dark:bg-white/10 text-ink-light border border-black/10'}`}>{t.label}</button>
        ))}
      </div>
      {tab === 'produits' ? <ProduitsTab /> : <InventairesTab />}
    </div>
  );
}
