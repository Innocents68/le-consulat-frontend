import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Wallet, TrendingUp, TrendingDown, Percent } from 'lucide-react';
import api, { apiErrorMessage } from '../../lib/api';
import PageHeader from '../../components/ui/PageHeader';
import StatCard from '../../components/ui/StatCard';
import PeriodFilter from '../../components/ui/PeriodFilter';
import { MultiLineChart, DonutChart, PALETTE } from '../../components/ui/Charts';
import { Loader, ErrorState } from '../../components/ui/Feedback';
import { formatFCFA, todayISO, daysAgoISO } from '../../lib/format';

const REPORT_LINKS = [
  { to: '/reporting/ventes', label: 'Rapport des ventes' },
  { to: '/reporting/stocks', label: 'Rapport des stocks' },
  { to: '/reporting/recettes', label: 'Rapport des recettes' },
  { to: '/reporting/benefices', label: 'Rapport des bénéfices' },
];

export default function ReportingDashboardPage() {
  const navigate = useNavigate();
  const [periode, setPeriode] = useState('mois');
  const [dateDebut, setDateDebut] = useState(daysAgoISO(30));
  const [dateFin, setDateFin] = useState(todayISO());

  const ventes = useQuery({
    queryKey: ['reporting-ventes', 'dashboard', periode, dateDebut, dateFin],
    queryFn: async () => (await api.get('/reporting/ventes', { params: { periode, dateDebut, dateFin } })).data,
    retry: 1,
  });
  const recettesDepenses = useQuery({
    queryKey: ['reporting-recettes-depenses', 'dashboard', periode, dateDebut, dateFin],
    queryFn: async () => (await api.get('/reporting/recettes-depenses', { params: { periode, dateDebut, dateFin } })).data,
    retry: 1,
  });
  const stocks = useQuery({
    queryKey: ['reporting-stocks', 'dashboard'],
    queryFn: async () => (await api.get('/reporting/stocks')).data,
    retry: 1,
  });

  const isLoading = ventes.isLoading || recettesDepenses.isLoading;
  const isError = ventes.isError && recettesDepenses.isError;

  const benefice = (recettesDepenses.data?.recettesTotales ?? 0) - (recettesDepenses.data?.depensesTotales ?? 0);

  return (
    <div>
      <PageHeader title="Dashboard reporting" subtitle="Vue consolidée : ventes, finances, stocks et bénéfices." />

      <div className="mb-5"><PeriodFilter periode={periode} onPeriodeChange={setPeriode} dateDebut={dateDebut} dateFin={dateFin} onDateDebutChange={setDateDebut} onDateFinChange={setDateFin} /></div>

      {isLoading && <Loader />}
      {isError && <ErrorState message="Impossible de charger le dashboard reporting." onRetry={() => { ventes.refetch(); recettesDepenses.refetch(); }} />}

      {!isLoading && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <StatCard icon={Wallet} label="Ventes totales" value={formatFCFA(ventes.data?.ca)} />
            <StatCard icon={TrendingUp} label="Recettes totales" value={formatFCFA(recettesDepenses.data?.recettesTotales)} />
            <StatCard icon={TrendingDown} label="Dépenses totales" value={formatFCFA(recettesDepenses.data?.depensesTotales)} />
            <StatCard icon={Percent} label="Bénéfice total" value={formatFCFA(benefice)} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
            <div className="card p-5 lg:col-span-2">
              <h3 className="section-title mb-3">Ventes (période)</h3>
              {(ventes.data?.ventesParJour?.length ?? 0) > 0 ? (
                <MultiLineChart
                  data={ventes.data.ventesParJour.map((d) => ({ date: d.date?.slice(5), ventes: d.montant }))}
                  lines={[{ key: 'ventes', name: 'Ventes', color: '#7A1F2B' }]}
                />
              ) : <p className="text-sm text-ink-light py-10 text-center">Pas de données.</p>}
            </div>
            <div className="card p-5">
              <h3 className="section-title mb-3">Répartition par activité</h3>
              {(stocks.data?.repartitionParCategorie?.length ?? 0) > 0 ? (
                <DonutChart data={stocks.data.repartitionParCategorie} dataKey="pourcentage" nameKey="label" height={180} />
              ) : <p className="text-sm text-ink-light py-10 text-center">Pas de données.</p>}
            </div>
          </div>

          <div className="card p-5">
            <h3 className="section-title mb-4">Rapports détaillés</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {REPORT_LINKS.map((r) => (
                <button key={r.to} onClick={() => navigate(r.to)} className="rounded-xl border border-black/5 dark:border-white/10 hover:border-bordeaux-300 hover:bg-bordeaux-50 dark:hover:bg-white/5 p-4 text-left transition">
                  <p className="text-sm font-semibold text-ink dark:text-cream-100">{r.label}</p>
                  <p className="text-xs text-bordeaux-700 dark:text-gold mt-1">Voir le détail →</p>
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
