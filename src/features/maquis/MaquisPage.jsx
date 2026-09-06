import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Minus, Trash2, CheckCircle2, Loader2 } from 'lucide-react';
import api, { fetchPage, apiErrorMessage } from '../../lib/api';
import DataTable from '../../components/ui/DataTable';
import Modal from '../../components/ui/Modal';
import PageHeader from '../../components/ui/PageHeader';
import StatusBadge from '../../components/ui/StatusBadge';
import { Field } from '../../components/ui/Field';
import { useTableState } from '../../hooks/useTableState';
import { useListQuery } from '../../hooks/useResource';
import { formatFCFA, formatDateTime } from '../../lib/format';
import { useToast } from '../../components/ui/Toast';

export default function MaquisPage() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const table = useTableState({ initialSize: 10 });
  const { data, isLoading, isError, error, refetch } = useListQuery('commandes-maquis', table.params);

  const { data: boissons } = useQuery({ queryKey: ['boissons', 'select-maquis'], queryFn: () => fetchPage('/boissons', { size: 100, actif: true }) });

  const [modalOpen, setModalOpen] = useState(false);
  const [clientNom, setClientNom] = useState('');
  const [tableId, setTableId] = useState('');
  const [lignes, setLignes] = useState([]);
  const [detail, setDetail] = useState(null);

  const create = useMutation({
    mutationFn: () => api.post('/commandes-maquis', {
      clientNom: clientNom || undefined,
      tableId: tableId || undefined,
      lignes: lignes.map((l) => ({ articleNom: l.articleNom, quantite: l.quantite, prixUnitaire: l.prixUnitaire })),
    }).then((r) => r.data),
    onSuccess: () => {
      toast.success('Commande maquis créée.');
      queryClient.invalidateQueries({ queryKey: ['commandes-maquis'] });
      setModalOpen(false); setLignes([]); setClientNom(''); setTableId('');
    },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });

  const cloturer = useMutation({
    mutationFn: (id) => api.post(`/commandes-maquis/${id}/cloturer`).then((r) => r.data),
    onSuccess: () => { toast.success('Commande clôturée.'); queryClient.invalidateQueries({ queryKey: ['commandes-maquis'] }); setDetail(null); },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });

  function addArticle(b) {
    setLignes((prev) => {
      const existing = prev.find((l) => l.articleNom === b.nom);
      if (existing) return prev.map((l) => l.articleNom === b.nom ? { ...l, quantite: l.quantite + 1 } : l);
      return [...prev, { articleNom: b.nom, quantite: 1, prixUnitaire: b.prixVenteBouteille }];
    });
  }
  function changeQty(nom, delta) {
    setLignes((prev) => prev.map((l) => l.articleNom === nom ? { ...l, quantite: l.quantite + delta } : l).filter((l) => l.quantite > 0));
  }

  const cartTotal = lignes.reduce((s, l) => s + l.quantite * l.prixUnitaire, 0);

  return (
    <div>
      <PageHeader
        title="Maquis"
        subtitle="Commandes du bar / grillades, liées ou non à une table."
        actions={<button className="btn-primary" onClick={() => setModalOpen(true)}><Plus size={16} /> Nouvelle commande</button>}
      />

      <DataTable
        columns={[
          { key: 'clientNom', header: 'Client', render: (r) => r.clientNom || 'Client de passage' },
          { key: 'tableId', header: 'Table', render: (r) => r.tableId || '—' },
          { key: 'total', header: 'Total', render: (r) => formatFCFA(r.total), className: 'font-semibold' },
          { key: 'dateCreation', header: 'Date', render: (r) => formatDateTime(r.dateCreation) },
          { key: 'statut', header: 'Statut', render: (r) => <StatusBadge status={r.statut} /> },
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
        rowActions={(row) => row.statut === 'EN_COURS' && (
          <button className="btn-ghost p-1.5 text-success" title="Clôturer" onClick={() => cloturer.mutate(row.id)}>
            <CheckCircle2 size={15} />
          </button>
        )}
        emptyLabel="Aucune commande maquis."
      />

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Nouvelle commande maquis"
        size="lg"
        footer={
          <>
            <button className="btn-secondary" onClick={() => setModalOpen(false)}>Annuler</button>
            <button className="btn-primary" onClick={() => create.mutate()} disabled={lignes.length === 0 || create.isPending}>
              {create.isPending && <Loader2 size={15} className="animate-spin" />} Créer ({formatFCFA(cartTotal)})
            </button>
          </>
        }
      >
        <div className="grid grid-cols-2 gap-3 mb-4">
          <Field label="Client de passage"><input className="input" value={clientNom} onChange={(e) => setClientNom(e.target.value)} /></Field>
          <Field label="ID Table (optionnel)"><input className="input" value={tableId} onChange={(e) => setTableId(e.target.value)} /></Field>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="section-title mb-2">Articles disponibles</p>
            <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto">
              {(boissons?.rows || []).map((b) => (
                <button key={b.id} onClick={() => addArticle(b)} className="text-left rounded-lg border border-black/5 hover:border-bordeaux-300 p-2.5">
                  <p className="text-sm font-medium truncate">{b.nom}</p>
                  <p className="text-xs text-ink-light">{formatFCFA(b.prixVenteBouteille)}</p>
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="section-title mb-2">Commande</p>
            <div className="flex flex-col gap-2 max-h-64 overflow-y-auto">
              {lignes.length === 0 && <p className="text-sm text-ink-light text-center py-8">Aucun article.</p>}
              {lignes.map((l) => (
                <div key={l.articleNom} className="flex items-center gap-2 border-b border-black/5 pb-1.5">
                  <span className="flex-1 text-sm truncate">{l.articleNom}</span>
                  <button onClick={() => changeQty(l.articleNom, -1)} className="p-1 bg-black/5 rounded"><Minus size={12} /></button>
                  <span className="text-sm w-5 text-center">{l.quantite}</span>
                  <button onClick={() => changeQty(l.articleNom, 1)} className="p-1 bg-black/5 rounded"><Plus size={12} /></button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Modal>

      <Modal open={!!detail} onClose={() => setDetail(null)} title={`Commande — ${detail?.clientNom || 'Client de passage'}`}>
        {detail && (
          <div>
            {(detail.lignes || []).map((l) => (
              <div key={l.id} className="flex justify-between text-sm py-1.5 border-b border-black/5">
                <span>{l.quantite}× {l.articleNom}</span><span className="font-medium">{formatFCFA(l.montant)}</span>
              </div>
            ))}
            <div className="flex justify-between font-extrabold pt-2 mt-1">
              <span>Total</span><span>{formatFCFA(detail.total)}</span>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
