import { useMutation, useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  ShoppingCart, Boxes, Wallet, Users, ArrowRight, ArrowUpRight, ArrowDownRight,
  UtensilsCrossed, Wine, ChefHat, PackageSearch, TrendingUp, Settings, LifeBuoy, DatabaseBackup, Lightbulb,
} from 'lucide-react';
import api, { apiErrorMessage } from '../../lib/api';
import { Loader, ErrorState } from '../../components/ui/Feedback';
import { SalesLineChart, MultiLineChart, DonutChart, Legend2, PALETTE } from '../../components/ui/Charts';
import { formatFCFA, formatPercent, formatDateTime } from '../../lib/format';
import { useToast } from '../../components/ui/Toast';
import { useAuthStore } from '../../store/authStore';
import { isSuperAdmin } from '../../lib/perimetre';
import bannerImage from '../../assets/banner.jpg';
import restaurantImage from '../../assets/restaurant.jpg';
import caveImage from '../../assets/cave.jpg';
import maquisImage from '../../assets/maquis.jpg';

const ETABLISSEMENT_ICON = { Restaurant: UtensilsCrossed, 'Cave à vin': Wine, Maquis: ChefHat };
const ETABLISSEMENT_IMAGE = { Restaurant: restaurantImage, 'Cave à vin': caveImage, Maquis: maquisImage };
// Couleur pleine du bandeau de texte (pas un simple voile sur la photo) — reprend l'esprit de
// maquette.png : couleurs distinctes par établissement (fournies par le client), texte toujours
// sur un fond opaque donc pleinement lisible, plutôt qu'un dégradé translucide sur l'image.
const ETABLISSEMENT_COLOR = { Restaurant: 'bg-[#7C0714]', 'Cave à vin': 'bg-[#440514]', Maquis: 'bg-[#1B2B29]' };

function KpiCard({ icon: Icon, iconBg, label, value, variation }) {
  return (
    <div className="card p-4">
      <div className="flex items-start justify-between">
        <div className={`h-9 w-9 rounded-lg flex items-center justify-center ${iconBg}`}>
          <Icon size={18} className="text-white" />
        </div>
        {variation !== undefined && variation !== null && (
          <span className={`flex items-center gap-0.5 text-xs font-semibold ${variation >= 0 ? 'text-success' : 'text-danger'}`}>
            {variation >= 0 ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
            {formatPercent(variation, 0)}
          </span>
        )}
      </div>
      <p className="text-xs text-ink-light mt-2.5">{label}</p>
      <p className="text-xl font-extrabold text-ink dark:text-cream-100">{value}</p>
    </div>
  );
}

/** §6.1 — page d'accueil, distincte du « Dashboard reporting » (Lot 5b, sous-écran filtrable du
 * module Reporting). Vue allégée pour un Gérant/Caissier (son seul établissement, pas de
 * comparaison) vs vue consolidée pour le Super Administrateur (maquette.png). */
export default function TableauDeBordPage() {
  const toast = useToast();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const superAdmin = isSuperAdmin(user);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['tableau-de-bord'],
    queryFn: async () => (await api.get('/tableau-de-bord')).data,
  });

  const sauvegarder = useMutation({
    mutationFn: () => api.post('/sauvegardes').then((r) => r.data),
    onSuccess: () => toast.success('Sauvegarde déclenchée avec succès.'),
    onError: (e) => toast.error(apiErrorMessage(e)),
  });

  const today = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date());
  const now = new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' }).format(new Date());

  const raccourcis = [
    { label: 'Nouvelle commande', icon: ShoppingCart, to: '/commandes', color: 'bg-bordeaux-700' },
    { label: 'Gestion des tables', icon: UtensilsCrossed, to: '/tables', color: 'bg-blue-600' },
    { label: 'Mouvements de stock', icon: PackageSearch, to: '/mouvements-stock', color: 'bg-warning' },
    { label: 'Rapport des ventes', icon: TrendingUp, to: '/reporting/ventes', color: 'bg-gold-dark' },
    ...(superAdmin ? [{ label: 'Paramètres', icon: Settings, to: '/parametres', color: 'bg-ink-light' }] : []),
    { label: 'Aide / Support', icon: LifeBuoy, to: '/aide', color: 'bg-success' },
  ];

  if (isLoading) return <Loader />;
  if (isError) return <ErrorState message={apiErrorMessage(error)} onRetry={refetch} />;

  const evolutionParJour = {};
  data.evolutionVentes.forEach((v) => {
    evolutionParJour[v.date] ??= { date: v.date };
    evolutionParJour[v.date][v.etablissementNom] = v.montant;
  });
  const evolutionData = Object.values(evolutionParJour).sort((a, b) => a.date.localeCompare(b.date));
  const lignesEvolution = data.etablissements.map((e, i) => ({ key: e.nom, name: e.nom, color: PALETTE[i % PALETTE.length] }));

  return (
    <div className="flex flex-col gap-5">
      <div
        className="relative rounded-2xl text-[#F7F2F3] p-6 flex flex-wrap items-center justify-between gap-4 overflow-hidden bg-cover bg-center"
        style={{ backgroundImage: `url(${bannerImage})` }}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-bordeaux-950/90 via-bordeaux-900/75 to-bordeaux-950/40" />
        <div className="relative">
          <h1 className="text-2xl font-extrabold">Bonjour {user?.nom || user?.username} !</h1>
          <p className="text-[#F7F2F3]/80 text-sm mt-1">Bienvenue sur votre espace de gestion Le Consulat — Maquis, Restaurant, Cave à vin.</p>
        </div>
        <div className="relative text-right text-sm text-[#F7F2F3]/80 capitalize">
          <p>{today}</p>
          <p className="font-semibold text-[#F7F2F3]">{now}</p>
        </div>
      </div>

      <div className={`grid grid-cols-1 sm:grid-cols-2 ${superAdmin ? 'lg:grid-cols-4' : 'lg:grid-cols-3'} gap-4`}>
        <KpiCard icon={ShoppingCart} iconBg="bg-bordeaux-700" label="Ventes du jour" value={formatFCFA(data.ventesDuJour)} variation={data.ventesVariationPourcent} />
        <KpiCard icon={Boxes} iconBg="bg-gold-dark" label="Stocks (articles suivis)" value={data.stockNombreArticles} />
        <KpiCard icon={Wallet} iconBg="bg-warning" label="Dépenses du jour" value={formatFCFA(data.depensesDuJour)} variation={data.depensesVariationPourcent} />
        {superAdmin && (
          <KpiCard icon={Users} iconBg="bg-blue-600" label="Utilisateurs actifs" value={`${data.utilisateursActifs} / ${data.utilisateursTotal}`} />
        )}
      </div>

      <div className={`grid grid-cols-1 ${data.etablissements.length > 1 ? 'md:grid-cols-3' : ''} gap-4`}>
        {data.etablissements.map((e) => {
          const Icon = ETABLISSEMENT_ICON[e.nom] || UtensilsCrossed;
          const image = ETABLISSEMENT_IMAGE[e.nom];
          const color = ETABLISSEMENT_COLOR[e.nom] || 'bg-bordeaux-700';
          return (
            <button
              key={e.id}
              onClick={() => navigate(`/commandes?etablissementId=${e.id}`)}
              className="rounded-xl overflow-hidden text-left hover:shadow-popover transition-shadow flex flex-col"
            >
              {image && <div className="h-28 bg-cover bg-center" style={{ backgroundImage: `url(${image})` }} />}
              <div className={`p-4 flex items-center justify-between text-white ${color}`}>
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-9 w-9 rounded-lg bg-white/20 flex items-center justify-center shrink-0"><Icon size={18} /></div>
                  <div className="min-w-0">
                    <p className="font-bold truncate">{e.nom}</p>
                    <p className="text-[11px] text-white/85 truncate">Gestion des tables, commandes, menus...</p>
                  </div>
                </div>
                <div className="h-8 w-8 rounded-full bg-white/20 flex items-center justify-center shrink-0"><ArrowRight size={15} /></div>
              </div>
            </button>
          );
        })}
      </div>

      <div className={`grid grid-cols-1 ${superAdmin ? 'lg:grid-cols-3' : ''} gap-4`}>
        <div className={`card p-5 ${superAdmin ? 'lg:col-span-2' : ''}`}>
          <p className="font-bold mb-3">Évolution des ventes (7 derniers jours)</p>
          {superAdmin
            ? <MultiLineChart data={evolutionData} lines={lignesEvolution} xKey="date" />
            : <SalesLineChart data={evolutionData} xKey="date" yKey={data.etablissements[0]?.nom} />}
        </div>
        {superAdmin && data.repartitionVentes && (
          <div className="card p-5">
            <p className="font-bold mb-3">Répartition des ventes</p>
            <DonutChart data={data.repartitionVentes.map((r) => ({ label: r.label, pourcentage: r.montant }))} centerLabel={
              <div className="text-center">
                <p className="text-[11px] text-ink-light">Total</p>
                <p className="font-extrabold text-sm">{formatFCFA(data.repartitionVentes.reduce((s, r) => s + r.montant, 0))}</p>
              </div>
            } />
            <Legend2 items={data.repartitionVentes.map((r, i) => ({ label: r.label, value: formatFCFA(r.montant), color: PALETTE[i % PALETTE.length] }))} />
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="card overflow-hidden lg:col-span-2">
          <p className="font-bold px-5 pt-4 pb-2">Dernières opérations</p>
          <div className="divide-y divide-black/5 dark:divide-white/5">
            {data.dernieresOperations.map((op) => (
              <div key={op.id} className="flex items-center justify-between px-5 py-2.5">
                <div>
                  <p className="text-sm font-medium">{op.action}</p>
                  <p className="text-xs text-ink-light">{op.details}</p>
                </div>
                <p className="text-xs text-ink-light shrink-0 ml-3">{formatDateTime(op.dateOperation)}</p>
              </div>
            ))}
            {data.dernieresOperations.length === 0 && <p className="px-5 py-6 text-sm text-ink-light text-center">Aucune opération récente.</p>}
          </div>
        </div>

        <div className="card p-5">
          <p className="font-bold mb-3">Raccourcis</p>
          <div className="grid grid-cols-2 gap-2.5">
            {raccourcis.map((r) => (
              <button key={r.label} onClick={() => navigate(r.to)} className="flex flex-col items-center gap-1.5 p-3 rounded-xl border border-black/5 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5 text-center">
                <div className={`h-9 w-9 rounded-lg flex items-center justify-center ${r.color}`}><r.icon size={16} className="text-white" /></div>
                <p className="text-xs font-medium leading-tight">{r.label}</p>
              </button>
            ))}
          </div>
        </div>
      </div>

      {superAdmin && (
        <div className="card p-4 flex flex-wrap items-center justify-between gap-3 bg-gold/10 border-gold/30">
          <div className="flex items-center gap-3">
            <Lightbulb size={18} className="text-gold-dark shrink-0" />
            <p className="text-sm">Bon à savoir : n'oubliez pas de faire la sauvegarde de vos données régulièrement pour éviter toute perte d'informations.</p>
          </div>
          <button className="btn-primary shrink-0" onClick={() => sauvegarder.mutate()} disabled={sauvegarder.isPending}>
            <DatabaseBackup size={15} /> Sauvegarder maintenant
          </button>
        </div>
      )}

      <p className="text-xs text-ink-light">Généré par {data.genereParNom} le {formatDateTime(data.dateGeneration)}</p>
    </div>
  );
}
