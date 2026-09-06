import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Search, Minus, Plus, Trash2, Wine, Beer, UtensilsCrossed, Package, Loader2 } from 'lucide-react';
import api, { fetchPage, apiErrorMessage } from '../../lib/api';
import { ventesApi, sessionsCaisseApi } from './ventesApi';
import { formatFCFA } from '../../lib/format';
import { useAuthStore } from '../../store/authStore';
import { useToast } from '../../components/ui/Toast';
import { Loader, ErrorState, EmptyState } from '../../components/ui/Feedback';
import Modal from '../../components/ui/Modal';
import { Field, Select } from '../../components/ui/Field';
import PageHeader from '../../components/ui/PageHeader';

const PAYMENT_MODES = [
  { value: 'ESPECES', label: 'Espèces' },
  { value: 'MOBILE_MONEY', label: 'Mobile Money' },
  { value: 'CARTE', label: 'Carte' },
];

function categoryIcon(nom = '') {
  const n = nom.toLowerCase();
  if (n.includes('vin') || n.includes('cave')) return Wine;
  if (n.includes('bière') || n.includes('biere') || n.includes('boisson')) return Beer;
  if (n.includes('plat') || n.includes('cuisine')) return UtensilsCrossed;
  return Package;
}

export default function VentesCaissePage() {
  const toast = useToast();
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();

  const [categorieId, setCategorieId] = useState('all');
  const [search, setSearch] = useState('');
  const [vente, setVente] = useState(null); // ticket en cours
  const [openSessionModal, setOpenSessionModal] = useState(false);
  const [payModalOpen, setPayModalOpen] = useState(false);
  const [modePaiement, setModePaiement] = useState('ESPECES');
  const [montantRecu, setMontantRecu] = useState('');
  const [clientNom, setClientNom] = useState('');
  const [fondInitial, setFondInitial] = useState(50000);
  const [caisseNom, setCaisseNom] = useState('Caisse principale');

  const { data: sessions, isLoading: loadingSessions } = useQuery({
    queryKey: ['sessions-caisse', 'ouvertes'],
    queryFn: sessionsCaisseApi.ouvertes,
    retry: 1,
  });
  const sessionOuverte = Array.isArray(sessions) ? sessions[0] : sessions?.content?.[0];

  const { data: categories } = useQuery({
    queryKey: ['categories-produits', 'all'],
    queryFn: () => fetchPage('/categories-produits', { size: 100 }),
    retry: 1,
  });

  const { data: produitsPage, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['produits', 'pos', categorieId, search],
    queryFn: () => fetchPage('/produits', { size: 60, search: search || undefined, categorieId: categorieId !== 'all' ? categorieId : undefined, actif: true }),
    retry: 1,
    keepPreviousData: true,
  });

  const ouvrirSession = useMutation({
    mutationFn: () => sessionsCaisseApi.ouvrir({ caisseNom, ouvertPar: user?.nom || user?.username, fondInitial: Number(fondInitial) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions-caisse'] });
      toast.success('Caisse ouverte.');
      setOpenSessionModal(false);
    },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });

  const startVente = useMutation({
    mutationFn: () => ventesApi.ouvrirVente({ sessionCaisseId: sessionOuverte.id, caissierId: user?.id, caissierNom: user?.nom, clientNom: clientNom || undefined }),
  });

  const addLigne = useMutation({
    mutationFn: ({ venteId, payload }) => ventesApi.ajouterLigne(venteId, payload),
    onSuccess: (data) => setVente(data),
    onError: (e) => toast.error(apiErrorMessage(e)),
  });

  const removeLigne = useMutation({
    mutationFn: ({ venteId, ligneId }) => ventesApi.retirerLigne(venteId, ligneId),
    onSuccess: (data) => setVente(data),
    onError: (e) => toast.error(apiErrorMessage(e)),
  });

  const encaisser = useMutation({
    mutationFn: () => ventesApi.encaisser(vente.id, { modePaiement, montantRecu: Number(montantRecu) || vente.total }),
    onSuccess: (data) => {
      toast.success(`Vente encaissée — ${data.numero || ''}`);
      setVente(null);
      setPayModalOpen(false);
      setMontantRecu('');
      setClientNom('');
      queryClient.invalidateQueries({ queryKey: ['produits'] });
      queryClient.invalidateQueries({ queryKey: ['sessions-caisse'] });
    },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });

  async function handleAddProduct(produit) {
    if (!sessionOuverte) {
      setOpenSessionModal(true);
      return;
    }
    try {
      let currentVente = vente;
      if (!currentVente) {
        currentVente = await startVente.mutateAsync();
        setVente(currentVente);
      }
      const existing = currentVente.lignes?.find((l) => l.produitId === produit.id);
      const payload = { produitId: produit.id, quantite: 1, prixUnitaire: produit.prixVente };
      await addLigne.mutateAsync({ venteId: currentVente.id, payload });
    } catch (e) {
      toast.error(apiErrorMessage(e));
    }
  }

  const lignes = vente?.lignes || [];
  const sousTotal = vente?.sousTotal ?? lignes.reduce((s, l) => s + (l.montant ?? l.quantite * l.prixUnitaire), 0);
  const total = vente?.total ?? sousTotal;

  return (
    <div>
      <PageHeader
        title="Ventes / Caisse"
        subtitle={sessionOuverte ? `Session : ${sessionOuverte.caisseNom} · ouverte par ${sessionOuverte.ouvertPar}` : 'Aucune session de caisse ouverte'}
        actions={!sessionOuverte && !loadingSessions && (
          <button className="btn-primary" onClick={() => setOpenSessionModal(true)}>Ouvrir une caisse</button>
        )}
      />

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Product catalog */}
        <div className="xl:col-span-2 card p-4">
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <div className="relative flex-1 min-w-[180px]">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-light/60" />
              <input className="input pl-8" placeholder="Rechercher un produit..." value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5 mb-4 overflow-x-auto pb-1">
            <button
              className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap ${categorieId === 'all' ? 'bg-bordeaux-700 text-white' : 'bg-cream-100 dark:bg-white/10 text-ink-light hover:bg-cream-200'}`}
              onClick={() => setCategorieId('all')}
            >
              Toutes
            </button>
            {(categories?.rows || []).map((c) => (
              <button
                key={c.id}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap ${categorieId === c.id ? 'bg-bordeaux-700 text-white' : 'bg-cream-100 dark:bg-white/10 text-ink-light hover:bg-cream-200'}`}
                onClick={() => setCategorieId(c.id)}
              >
                {c.nom}
              </button>
            ))}
          </div>

          {isLoading && <Loader />}
          {isError && <ErrorState message={apiErrorMessage(error, 'Impossible de charger le catalogue produits.')} onRetry={refetch} />}
          {!isLoading && !isError && (produitsPage?.rows?.length ?? 0) === 0 && <EmptyState label="Aucun produit trouvé." />}

          {!isLoading && !isError && (produitsPage?.rows?.length ?? 0) > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {produitsPage.rows.map((p) => {
                const Icon = categoryIcon(p.categorieNom);
                const rupture = p.quantiteStock <= 0;
                return (
                  <button
                    key={p.id}
                    disabled={rupture || addLigne.isPending || startVente.isPending}
                    onClick={() => handleAddProduct(p)}
                    className="group relative flex flex-col items-center gap-2 rounded-xl border border-black/5 dark:border-white/10 hover:border-bordeaux-300 hover:shadow-card p-3 text-center transition disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <div className="h-14 w-14 rounded-lg bg-bordeaux-700/10 text-bordeaux-700 dark:text-gold flex items-center justify-center group-hover:bg-bordeaux-700 group-hover:text-white transition-colors">
                      <Icon size={24} />
                    </div>
                    <div className="min-w-0 w-full">
                      <p className="text-xs font-semibold text-ink dark:text-cream-100 truncate">{p.nom}</p>
                      <p className="text-[11px] text-ink-light">{formatFCFA(p.prixVente)}</p>
                    </div>
                    {rupture && <span className="absolute top-1 right-1 text-[9px] font-bold text-danger bg-danger/10 rounded px-1 py-0.5">Rupture</span>}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Running ticket */}
        <div className="card p-4 flex flex-col h-fit xl:sticky xl:top-20">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-ink dark:text-cream-100">Ticket en cours</h3>
            {vente?.numero && <span className="text-xs font-mono text-ink-light">{vente.numero}</span>}
          </div>

          <input
            className="input mb-3"
            placeholder="Nom du client (optionnel)"
            value={clientNom}
            onChange={(e) => setClientNom(e.target.value)}
            disabled={!!vente}
          />

          <div className="flex-1 flex flex-col gap-2 min-h-[120px] max-h-[380px] overflow-y-auto">
            {lignes.length === 0 && (
              <p className="text-sm text-ink-light text-center py-10">Le panier est vide.<br />Cliquez sur un produit pour commencer.</p>
            )}
            {lignes.map((l) => (
              <div key={l.id} className="flex items-center gap-2 border-b border-black/5 dark:border-white/5 pb-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-ink dark:text-cream-100 truncate">{l.produitNom}</p>
                  <p className="text-xs text-ink-light">{l.quantite} × {formatFCFA(l.prixUnitaire)}</p>
                </div>
                <span className="text-sm font-semibold text-ink dark:text-cream-100 shrink-0">{formatFCFA(l.montant ?? l.quantite * l.prixUnitaire)}</span>
                <button
                  className="text-danger p-1 hover:bg-danger/10 rounded shrink-0"
                  onClick={() => removeLigne.mutate({ venteId: vente.id, ligneId: l.id })}
                  disabled={removeLigne.isPending}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>

          <div className="border-t border-black/10 dark:border-white/10 mt-3 pt-3 space-y-1.5">
            <div className="flex justify-between text-sm text-ink-light">
              <span>Sous-total</span><span>{formatFCFA(sousTotal)}</span>
            </div>
            {vente?.remiseMontant > 0 && (
              <div className="flex justify-between text-sm text-success">
                <span>Remise</span><span>-{formatFCFA(vente.remiseMontant)}</span>
              </div>
            )}
            <div className="flex justify-between text-base font-extrabold text-ink dark:text-cream-100 pt-1">
              <span>Total</span><span>{formatFCFA(total)}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 mt-4">
            <button
              className="btn-secondary"
              disabled={!vente || lignes.length === 0}
              onClick={() => setVente(null)}
            >
              Annuler
            </button>
            <button
              className="btn-primary"
              disabled={!vente || lignes.length === 0}
              onClick={() => setPayModalOpen(true)}
            >
              Encaisser
            </button>
          </div>
        </div>
      </div>

      {/* Open cash session modal */}
      <Modal
        open={openSessionModal}
        onClose={() => setOpenSessionModal(false)}
        title="Ouvrir une session de caisse"
        footer={
          <>
            <button className="btn-secondary" onClick={() => setOpenSessionModal(false)}>Annuler</button>
            <button className="btn-primary" onClick={() => ouvrirSession.mutate()} disabled={ouvrirSession.isPending}>
              {ouvrirSession.isPending ? <Loader2 size={15} className="animate-spin" /> : null} Ouvrir
            </button>
          </>
        }
      >
        <Field label="Nom de la caisse" required>
          <input className="input" value={caisseNom} onChange={(e) => setCaisseNom(e.target.value)} />
        </Field>
        <Field label="Fond de caisse initial (FCFA)" required>
          <input type="number" className="input" value={fondInitial} onChange={(e) => setFondInitial(e.target.value)} />
        </Field>
      </Modal>

      {/* Payment modal */}
      <Modal
        open={payModalOpen}
        onClose={() => setPayModalOpen(false)}
        title="Encaissement"
        footer={
          <>
            <button className="btn-secondary" onClick={() => setPayModalOpen(false)}>Annuler</button>
            <button className="btn-primary" onClick={() => encaisser.mutate()} disabled={encaisser.isPending}>
              {encaisser.isPending ? <Loader2 size={15} className="animate-spin" /> : null} Valider le paiement
            </button>
          </>
        }
      >
        <div className="mb-4 flex items-center justify-between rounded-lg bg-cream-100 dark:bg-white/5 px-3 py-2.5">
          <span className="text-sm font-medium text-ink-light">Total à payer</span>
          <span className="text-lg font-extrabold text-ink dark:text-cream-100">{formatFCFA(total)}</span>
        </div>
        <Field label="Mode de paiement" required>
          <Select value={modePaiement} onChange={(e) => setModePaiement(e.target.value)}>
            {PAYMENT_MODES.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
          </Select>
        </Field>
        <Field label="Montant reçu (FCFA)" hint="Laisser vide pour le montant exact.">
          <input type="number" className="input" value={montantRecu} onChange={(e) => setMontantRecu(e.target.value)} placeholder={String(total)} />
        </Field>
      </Modal>
    </div>
  );
}
