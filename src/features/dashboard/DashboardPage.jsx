import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ShoppingCart, Wallet, UtensilsCrossed, Wine, TrendingUp, AlertTriangle,
  CheckCircle2, ShoppingBag, ClipboardList, PackagePlus, CircleDollarSign,
  BarChart3, Users, Sun, Cloud, ChevronDown,
} from 'lucide-react';
import api from '../../lib/api';
import { apiErrorMessage } from '../../lib/api';
import StatCard from '../../components/ui/StatCard';
import { Loader, ErrorState } from '../../components/ui/Feedback';
import { SalesLineChart, DonutChart, PALETTE } from '../../components/ui/Charts';
import { formatFCFA } from '../../lib/format';
import { useAuthStore } from '../../store/authStore';

const PERIODS = [
  { value: 7, label: '7 jours' },
  { value: 14, label: '14 jours' },
  { value: 30, label: '30 jours' },
];

const QUICK_ACCESS = [
  { label: 'Nouvelle vente', icon: ShoppingCart, to: '/ventes' },
  { label: 'Nouvelle commande', icon: ClipboardList, to: '/commandes-restaurant' },
  { label: 'Ajouter stock', icon: PackagePlus, to: '/entrees-stock' },
  { label: 'Dépense', icon: CircleDollarSign, to: '/depenses' },
  { label: 'Rapport des ventes', icon: TrendingUp, to: '/reporting/ventes' },
  { label: 'Rapport des stocks', icon: BarChart3, to: '/reporting/stocks' },
  { label: 'Clôture caisse', icon: Wallet, to: '/caisses' },
  { label: 'Utilisateurs', icon: Users, to: '/utilisateurs' },
];

const ACTIVITY_ICON = {
  VENTE: ShoppingCart,
  COMMANDE: UtensilsCrossed,
  STOCK: PackagePlus,
  DEPENSE: CircleDollarSign,
  PAIEMENT: Wallet,
};

const ALERT_STYLE = {
  CRITICAL: { bg: 'bg-danger/10', text: 'text-danger', icon: AlertTriangle },
  WARNING: { bg: 'bg-warning/10', text: 'text-warning', icon: AlertTriangle },
  INFO: { bg: 'bg-success/10', text: 'text-success', icon: CheckCircle2 },
};

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();
  const [days, setDays] = useState(7);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['dashboard-summary'],
    queryFn: async () => (await api.get('/dashboard/summary')).data,
    retry: 1,
  });

  const today = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date());

  if (isLoading) return <Loader label="Chargement du tableau de bord..." />;
  if (isError) return <ErrorState message={apiErrorMessage(error, "Impossible de charger le tableau de bord.")} onRetry={refetch} />;

  const evolution = (data?.evolutionVentes || []).slice(-days);
  const repartition = data?.repartitionActivites || [];
  const alertes = data?.alertes || [];
  const topProduits = data?.topProduits || [];
  const activite = data?.activiteRecente || [];
  const maxTop = Math.max(1, ...topProduits.map((p) => p.ventes || 0));

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-extrabold text-ink dark:text-cream-100">
            Bienvenue, {user?.nom?.split(' ')[0] || user?.username} 👋
          </h1>
          <p className="text-sm text-ink-light dark:text-cream-300/70 mt-0.5">Voici un aperçu de votre activité aujourd'hui.</p>
        </div>
        <span className="inline-flex items-center gap-2 text-sm font-medium bg-white dark:bg-night-800 border border-black/5 dark:border-white/10 rounded-lg px-3.5 py-2 capitalize shadow-card">
          {today}
        </span>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <StatCard icon={ShoppingCart} label="Ventes du jour" value={formatFCFA(data.ventesDuJour)} delta={data.variations?.ventes} />
        <StatCard icon={Wallet} label="Recettes du jour" value={formatFCFA(data.recettesDuJour)} delta={data.variations?.recettes} />
        <StatCard icon={UtensilsCrossed} label="Commandes (restaurant)" value={data.commandesRestaurant} delta={data.variations?.commandes} />
        <StatCard icon={Wine} label="Consommations (maquis)" value={data.consommationsMaquis} delta={data.variations?.consommations} />
        <StatCard icon={TrendingUp} label="Bénéfice du jour" value={formatFCFA(data.beneficeDuJour)} delta={data.variations?.benefice} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <div className="card p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-2">
            <h3 className="section-title">Évolution des ventes</h3>
            <div className="relative">
              <select
                value={days}
                onChange={(e) => setDays(Number(e.target.value))}
                className="appearance-none text-xs font-semibold bg-cream-100 dark:bg-white/10 border border-black/10 dark:border-white/10 rounded-lg pl-3 pr-7 py-1.5 cursor-pointer"
              >
                {PERIODS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
              <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-ink-light" />
            </div>
          </div>
          {evolution.length > 0 ? (
            <SalesLineChart data={evolution.map((e) => ({ date: e.date?.slice(5), montant: e.montant }))} />
          ) : <p className="text-sm text-ink-light py-12 text-center">Pas encore de données.</p>}
        </div>

        <div className="card p-5">
          <h3 className="section-title mb-3">Répartition des activités</h3>
          {repartition.length > 0 ? (
            <div className="flex items-center gap-4">
              <div className="w-32 shrink-0">
                <DonutChart data={repartition} dataKey="pourcentage" nameKey="label" height={130} />
              </div>
              <div className="flex-1 flex flex-col gap-1.5 text-sm">
                {repartition.map((r, i) => (
                  <div key={r.label} className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-1.5 text-ink dark:text-cream-100">
                      <span className="h-2 w-2 rounded-full" style={{ background: PALETTE[i % PALETTE.length] }} />
                      {r.label}
                    </span>
                    <span className="font-semibold text-ink-light dark:text-cream-300/70">{r.pourcentage}%</span>
                  </div>
                ))}
              </div>
            </div>
          ) : <p className="text-sm text-ink-light py-12 text-center">Pas encore de données.</p>}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <div className="card p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="section-title">Alertes</h3>
            <button className="text-xs font-semibold text-bordeaux-700 hover:underline" onClick={() => navigate('/stocks-inventaire')}>Voir tout</button>
          </div>
          <div className="flex flex-col gap-2.5">
            {alertes.length === 0 && <p className="text-sm text-ink-light py-6 text-center">Aucune alerte active.</p>}
            {alertes.map((a, i) => {
              const style = ALERT_STYLE[a.niveau] || ALERT_STYLE.INFO;
              const Icon = style.icon;
              return (
                <div key={i} className={`flex items-start gap-2.5 rounded-lg ${style.bg} px-3 py-2.5`}>
                  <Icon size={16} className={`${style.text} mt-0.5 shrink-0`} />
                  <p className={`text-sm ${style.text} font-medium leading-snug`}>{a.message}</p>
                </div>
              );
            })}
          </div>
        </div>

        <div className="card p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="section-title">Activité récente</h3>
            <button className="text-xs font-semibold text-bordeaux-700 hover:underline" onClick={() => navigate('/journal-operations')}>Voir tout</button>
          </div>
          <div className="flex flex-col divide-y divide-black/5 dark:divide-white/5">
            {activite.length === 0 && <p className="text-sm text-ink-light py-6 text-center">Aucune activité récente.</p>}
            {activite.map((a, i) => {
              const Icon = ACTIVITY_ICON[a.type] || ShoppingBag;
              return (
                <div key={i} className="flex items-center gap-2.5 py-2.5 first:pt-0 last:pb-0">
                  <div className="h-8 w-8 rounded-lg bg-cream-100 dark:bg-white/10 flex items-center justify-center text-bordeaux-700 dark:text-gold shrink-0">
                    <Icon size={15} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-ink dark:text-cream-100 truncate">{a.libelle}</p>
                    <p className="text-xs text-ink-light/70">{a.ilYA}</p>
                  </div>
                  {a.montant != null && <span className="text-sm font-semibold text-ink dark:text-cream-100 shrink-0">{formatFCFA(a.montant)}</span>}
                </div>
              );
            })}
          </div>
        </div>

        <div className="card p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="section-title">Top produits vendus</h3>
            <button className="text-xs font-semibold text-bordeaux-700 hover:underline" onClick={() => navigate('/reporting/ventes')}>Voir le rapport</button>
          </div>
          <div className="flex flex-col gap-3">
            {topProduits.length === 0 && <p className="text-sm text-ink-light py-6 text-center">Aucune vente pour le moment.</p>}
            {topProduits.map((p, i) => (
              <div key={p.nom} className="flex items-center gap-3">
                <span className="text-xs font-bold text-ink-light/60 w-4">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-ink dark:text-cream-100 truncate">{p.nom}</span>
                    <span className="font-semibold text-ink dark:text-cream-100 shrink-0 ml-2">{formatFCFA(p.montant)}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-black/5 dark:bg-white/10 mt-1 overflow-hidden">
                    <div className="h-full rounded-full bg-bordeaux-700" style={{ width: `${(p.ventes / maxTop) * 100}%` }} />
                  </div>
                  <p className="text-[11px] text-ink-light/60 mt-0.5">{p.ventes} ventes</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <div className="card p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <h3 className="section-title">Rapport de caisse</h3>
            <button className="text-xs font-semibold text-bordeaux-700 hover:underline" onClick={() => navigate('/caisses')}>Voir le détail</button>
          </div>
          <div className="grid grid-cols-2 gap-4 items-center">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-ink-light">Encaissements</span>
                <span className="font-bold text-ink dark:text-cream-100">{formatFCFA(data.recettesDuJour)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-ink-light">Décaissements</span>
                <span className="font-bold text-danger">{formatFCFA(data.recettesDuJour - data.beneficeDuJour)}</span>
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-black/5 dark:border-white/10">
                <span className="text-sm font-semibold text-ink dark:text-cream-100">Solde</span>
                <span className="font-extrabold text-success text-lg">{formatFCFA(data.beneficeDuJour)}</span>
              </div>
            </div>
            <div className="h-24 rounded-xl bg-bordeaux-700 flex items-center justify-center text-white/90">
              <Wallet size={40} strokeWidth={1.2} />
            </div>
          </div>
        </div>

        <div className="card p-5">
          <h3 className="section-title mb-3">Météo locale</h3>
          <div className="flex items-center gap-4">
            <Sun size={38} className="text-gold" />
            <div>
              <p className="text-2xl font-extrabold text-ink dark:text-cream-100">28°C</p>
              <p className="text-xs text-ink-light">Ouagadougou · Ciel dégagé</p>
            </div>
          </div>
          <div className="flex justify-between text-xs text-ink-light mt-4 pt-3 border-t border-black/5 dark:border-white/10">
            <span>Humidité : 45%</span>
            <span className="flex items-center gap-1"><Cloud size={13} /> Vent : 11 km/h</span>
          </div>
        </div>
      </div>

      <div className="card p-5">
        <h3 className="section-title mb-4">Accès rapides</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
          {QUICK_ACCESS.map((q) => (
            <button
              key={q.label}
              onClick={() => navigate(q.to)}
              className="flex flex-col items-center gap-2 rounded-xl border border-black/5 dark:border-white/10 hover:border-bordeaux-300 hover:bg-bordeaux-50 dark:hover:bg-white/5 px-2 py-4 text-center transition-colors"
            >
              <div className="h-10 w-10 rounded-full bg-bordeaux-700/10 text-bordeaux-700 dark:text-gold flex items-center justify-center">
                <q.icon size={19} />
              </div>
              <span className="text-xs font-medium text-ink dark:text-cream-100 leading-tight">{q.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
