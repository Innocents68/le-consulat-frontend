import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Clock, Flame, CheckCircle2, UtensilsCrossed, ArrowRight, Wifi, WifiOff } from 'lucide-react';
import { fetchPage, apiErrorMessage } from '../../lib/api';
import { commandesApi } from '../commandes-restaurant/commandesApi';
import PageHeader from '../../components/ui/PageHeader';
import { Loader, ErrorState } from '../../components/ui/Feedback';
import { useToast } from '../../components/ui/Toast';
import { useLiveTopic } from '../../hooks/useLiveTopic';
import { formatDateTime } from '../../lib/format';

const COLUMNS = [
  { key: 'EN_ATTENTE', label: 'En attente', icon: Clock, color: 'border-warning bg-warning/5' },
  { key: 'EN_PREPARATION', label: 'En préparation', icon: Flame, color: 'border-blue-500 bg-blue-500/5' },
  { key: 'PRET', label: 'Prêtes', icon: CheckCircle2, color: 'border-success bg-success/5' },
  { key: 'SERVI', label: 'Servies', icon: UtensilsCrossed, color: 'border-black/10 bg-black/[0.02]' },
];
const NEXT_STATUS = { EN_ATTENTE: 'EN_PREPARATION', EN_PREPARATION: 'PRET', PRET: 'SERVI' };
const NEXT_LABEL = { EN_ATTENTE: 'Démarrer', EN_PREPARATION: 'Marquer prêt', PRET: 'Marquer servi' };

export default function SuiviCuisinePage() {
  const toast = useToast();
  const queryClient = useQueryClient();

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['commandes-restaurant', 'cuisine'],
    queryFn: () => fetchPage('/commandes-restaurant', { size: 100, statut: 'EN_PREPARATION' }),
    retry: 1,
  });

  const { connected } = useLiveTopic('/topic/cuisine', [['commandes-restaurant', 'cuisine']], { pollMs: 5000 });

  const updateStatut = useMutation({
    mutationFn: ({ commandeId, ligneId, statut }) => commandesApi.updateLigneStatut(commandeId, ligneId, statut),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['commandes-restaurant'] }),
    onError: (e) => toast.error(apiErrorMessage(e)),
  });

  const lignesByStatus = useMemo(() => {
    const map = { EN_ATTENTE: [], EN_PREPARATION: [], PRET: [], SERVI: [] };
    (data?.rows || []).forEach((commande) => {
      (commande.lignes || []).forEach((ligne) => {
        const key = map[ligne.statut] ? ligne.statut : 'EN_ATTENTE';
        map[key].push({ ...ligne, commandeId: commande.id, tableNumero: commande.tableNumero, dateCreation: commande.dateCreation });
      });
    });
    return map;
  }, [data]);

  if (isLoading) return <Loader label="Chargement de l'écran cuisine..." />;
  if (isError) return <ErrorState message={apiErrorMessage(error, "Impossible de charger l'écran cuisine.")} onRetry={refetch} />;

  return (
    <div>
      <PageHeader
        title="Suivi cuisine"
        subtitle="Bons de préparation en temps réel."
        actions={
          <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg ${connected ? 'text-success bg-success/10' : 'text-ink-light bg-black/5'}`}>
            {connected ? <Wifi size={13} /> : <WifiOff size={13} />} {connected ? 'Temps réel actif' : 'Actualisation toutes les 5s'}
          </span>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {COLUMNS.map((col) => (
          <div key={col.key} className={`rounded-xl border-2 ${col.color} p-3 min-h-[200px]`}>
            <div className="flex items-center gap-2 mb-3 px-1">
              <col.icon size={16} />
              <h3 className="font-bold text-sm text-ink dark:text-cream-100">{col.label}</h3>
              <span className="ml-auto text-xs font-bold bg-white dark:bg-night-800 rounded-full px-2 py-0.5">{lignesByStatus[col.key].length}</span>
            </div>
            <div className="flex flex-col gap-2">
              {lignesByStatus[col.key].length === 0 && (
                <p className="text-xs text-ink-light/60 text-center py-6">Aucun élément.</p>
              )}
              {lignesByStatus[col.key].map((l) => (
                <div key={l.id} className="rounded-lg bg-white dark:bg-night-800 shadow-card p-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-bordeaux-700 dark:text-gold">Table {l.tableNumero || '—'}</span>
                    <span className="text-[10px] text-ink-light">{formatDateTime(l.dateCreation)?.split(' ')[1]}</span>
                  </div>
                  <p className="text-sm font-semibold text-ink dark:text-cream-100">{l.quantite}× {l.platNom}</p>
                  {l.options && <p className="text-xs text-ink-light italic">{l.options}</p>}
                  {NEXT_STATUS[l.statut] && (
                    <button
                      className="mt-2 w-full text-xs font-semibold text-bordeaux-700 dark:text-gold flex items-center justify-center gap-1 py-1.5 rounded-md bg-bordeaux-50 dark:bg-white/10 hover:bg-bordeaux-100"
                      onClick={() => updateStatut.mutate({ commandeId: l.commandeId, ligneId: l.id, statut: NEXT_STATUS[l.statut] })}
                      disabled={updateStatut.isPending}
                    >
                      {NEXT_LABEL[l.statut]} <ArrowRight size={12} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
