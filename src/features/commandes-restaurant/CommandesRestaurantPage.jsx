import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Minus, Trash2, Send, Ban, Printer, Loader2 } from 'lucide-react';
import api, { fetchPage, apiErrorMessage } from '../../lib/api';
import { commandesApi } from './commandesApi';
import PageHeader from '../../components/ui/PageHeader';
import StatusBadge from '../../components/ui/StatusBadge';
import DataTable from '../../components/ui/DataTable';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { Select, Field } from '../../components/ui/Field';
import { formatFCFA, formatDateTime } from '../../lib/format';
import { useAuthStore } from '../../store/authStore';
import { useToast } from '../../components/ui/Toast';
import { useTableState } from '../../hooks/useTableState';
import { useLiveTopic } from '../../hooks/useLiveTopic';

const TYPE_LABEL = { SUR_PLACE: 'Sur place', EMPORTER: 'À emporter', LIVRAISON: 'Livraison' };

export default function CommandesRestaurantPage() {
  const toast = useToast();
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();
  const table = useTableState({ initialSize: 8 });

  const [tableId, setTableId] = useState('');
  const [type, setType] = useState('SUR_PLACE');
  const [cart, setCart] = useState([]); // { platId, platNom, quantite, prixUnitaire, options }
  const [annulerTarget, setAnnulerTarget] = useState(null);
  const [motifAnnulation, setMotifAnnulation] = useState('');

  const { data: tablesData } = useQuery({
    queryKey: ['tables', 'select'],
    queryFn: () => fetchPage('/tables', { size: 200, statut: 'LIBRE' }),
    retry: 1,
  });
  const { data: platsData } = useQuery({
    queryKey: ['plats', 'select'],
    queryFn: () => fetchPage('/plats', { size: 200, disponible: true }),
    retry: 1,
  });

  const { data: commandes, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['commandes-restaurant', 'list', table.params],
    queryFn: () => fetchPage('/commandes-restaurant', table.params),
    retry: 1,
    keepPreviousData: true,
  });

  useLiveTopic('/topic/commandes', [['commandes-restaurant', 'list']]);

  const creer = useMutation({
    mutationFn: () => commandesApi.creer({
      tableId: tableId || undefined,
      type,
      serveurId: user?.id,
      serveurNom: user?.nom,
      lignes: cart.map((c) => ({ platId: c.platId, quantite: c.quantite, options: c.options || '', prixUnitaire: c.prixUnitaire })),
    }),
    onSuccess: () => {
      toast.success('Commande créée.');
      setCart([]);
      setTableId('');
      queryClient.invalidateQueries({ queryKey: ['commandes-restaurant'] });
      queryClient.invalidateQueries({ queryKey: ['tables'] });
    },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });

  const envoyer = useMutation({
    mutationFn: (id) => commandesApi.envoyerCuisine(id),
    onSuccess: () => { toast.success('Commande envoyée en cuisine.'); queryClient.invalidateQueries({ queryKey: ['commandes-restaurant'] }); },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });

  const annuler = useMutation({
    mutationFn: () => commandesApi.annuler(annulerTarget.id, motifAnnulation),
    onSuccess: () => { toast.success('Commande annulée.'); setAnnulerTarget(null); setMotifAnnulation(''); queryClient.invalidateQueries({ queryKey: ['commandes-restaurant'] }); },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });

  function addToCart(plat) {
    setCart((prev) => {
      const existing = prev.find((c) => c.platId === plat.id);
      if (existing) return prev.map((c) => c.platId === plat.id ? { ...c, quantite: c.quantite + 1 } : c);
      return [...prev, { platId: plat.id, platNom: plat.nom, quantite: 1, prixUnitaire: plat.prix, options: '' }];
    });
  }
  function changeQty(platId, delta) {
    setCart((prev) => prev
      .map((c) => c.platId === platId ? { ...c, quantite: c.quantite + delta } : c)
      .filter((c) => c.quantite > 0));
  }
  function removeItem(platId) {
    setCart((prev) => prev.filter((c) => c.platId !== platId));
  }

  const total = cart.reduce((s, c) => s + c.quantite * c.prixUnitaire, 0);

  return (
    <div>
      <PageHeader title="Commandes restaurant" subtitle="Prise de commande liée au plan de salle." />

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 mb-8">
        <div className="xl:col-span-2 card p-4">
          <h3 className="font-bold text-ink dark:text-cream-100 mb-3">Nouvelle commande</h3>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <Field label="Table">
              <Select value={tableId} onChange={(e) => setTableId(e.target.value)}>
                <option value="">— Emporter / Livraison —</option>
                {(tablesData?.rows || []).map((t) => <option key={t.id} value={t.id}>{t.numero} ({t.zone})</option>)}
              </Select>
            </Field>
            <Field label="Type">
              <Select value={type} onChange={(e) => setType(e.target.value)}>
                {Object.entries(TYPE_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </Select>
            </Field>
          </div>

          <p className="section-title mb-2">Plats disponibles</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-72 overflow-y-auto">
            {(platsData?.rows || []).map((p) => (
              <button
                key={p.id}
                onClick={() => addToCart(p)}
                className="flex flex-col items-start rounded-lg border border-black/5 dark:border-white/10 hover:border-bordeaux-300 p-3 text-left transition"
              >
                <span className="text-sm font-semibold text-ink dark:text-cream-100 truncate w-full">{p.nom}</span>
                <span className="text-xs text-ink-light">{formatFCFA(p.prix)}</span>
              </button>
            ))}
            {(platsData?.rows || []).length === 0 && <p className="text-sm text-ink-light col-span-full py-6 text-center">Aucun plat disponible pour le moment.</p>}
          </div>
        </div>

        <div className="card p-4 flex flex-col">
          <h3 className="font-bold text-ink dark:text-cream-100 mb-3">Panier</h3>
          <div className="flex-1 flex flex-col gap-2 min-h-[100px] max-h-64 overflow-y-auto">
            {cart.length === 0 && <p className="text-sm text-ink-light text-center py-8">Aucun article sélectionné.</p>}
            {cart.map((c) => (
              <div key={c.platId} className="flex items-center gap-2 border-b border-black/5 pb-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{c.platNom}</p>
                  <p className="text-xs text-ink-light">{formatFCFA(c.prixUnitaire)}</p>
                </div>
                <button onClick={() => changeQty(c.platId, -1)} className="p-1 rounded bg-black/5"><Minus size={12} /></button>
                <span className="text-sm font-semibold w-5 text-center">{c.quantite}</span>
                <button onClick={() => changeQty(c.platId, 1)} className="p-1 rounded bg-black/5"><Plus size={12} /></button>
                <button onClick={() => removeItem(c.platId)} className="text-danger p-1"><Trash2 size={13} /></button>
              </div>
            ))}
          </div>
          <div className="flex justify-between font-extrabold text-base border-t border-black/10 pt-3 mt-2">
            <span>Total</span><span>{formatFCFA(total)}</span>
          </div>
          <div className="grid grid-cols-2 gap-2 mt-3">
            <button className="btn-secondary" onClick={() => setCart([])} disabled={cart.length === 0}>
              <Printer size={14} /> Vider
            </button>
            <button className="btn-primary" onClick={() => creer.mutate()} disabled={cart.length === 0 || creer.isPending}>
              {creer.isPending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />} Envoyer
            </button>
          </div>
        </div>
      </div>

      <h3 className="section-title mb-3">Commandes en cours</h3>
      <DataTable
        columns={[
          { key: 'tableNumero', header: 'Table', render: (r) => r.tableNumero || TYPE_LABEL[r.type] },
          { key: 'serveurNom', header: 'Serveur' },
          { key: 'total', header: 'Total', render: (r) => formatFCFA(r.total), className: 'font-semibold' },
          { key: 'dateCreation', header: 'Créée', render: (r) => formatDateTime(r.dateCreation) },
          { key: 'statut', header: 'Statut', render: (r) => <StatusBadge status={r.statut} /> },
        ]}
        rows={commandes?.rows || []}
        total={commandes?.total || 0}
        totalPages={commandes?.totalPages || 0}
        page={table.page}
        isLoading={isLoading}
        isError={isError}
        errorMessage={apiErrorMessage(error)}
        onRetry={refetch}
        onPageChange={table.setPage}
        rowActions={(row) => (
          <>
            {row.statut === 'EN_ATTENTE' && (
              <button className="btn-ghost p-1.5 text-success" title="Envoyer en cuisine" onClick={() => envoyer.mutate(row.id)}>
                <Send size={15} />
              </button>
            )}
            {row.statut === 'EN_ATTENTE' && (
              <button className="btn-ghost p-1.5 text-danger" title="Annuler" onClick={() => setAnnulerTarget(row)}>
                <Ban size={15} />
              </button>
            )}
          </>
        )}
        emptyLabel="Aucune commande en cours."
      />

      <ConfirmDialog
        open={!!annulerTarget}
        onClose={() => setAnnulerTarget(null)}
        onConfirm={() => annuler.mutate()}
        title="Annuler la commande"
        message={
          <>
            <p className="mb-2">Motif d'annulation requis :</p>
            <input className="input" value={motifAnnulation} onChange={(e) => setMotifAnnulation(e.target.value)} autoFocus />
          </>
        }
        confirmLabel="Confirmer l'annulation"
        loading={annuler.isPending}
      />
    </div>
  );
}
