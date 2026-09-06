import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { TrendingUp, ShoppingBag, Wallet, Percent } from 'lucide-react';
import api, { apiErrorMessage } from '../../lib/api';
import PageHeader from '../../components/ui/PageHeader';
import StatCard from '../../components/ui/StatCard';
import PeriodFilter from '../../components/ui/PeriodFilter';
import ExportButtons from '../../components/ui/ExportButtons';
import { SimpleBarChart } from '../../components/ui/Charts';
import { Loader, ErrorState } from '../../components/ui/Feedback';
import { formatFCFA, formatNumber, todayISO, daysAgoISO } from '../../lib/format';

export default function RapportVentesPage() {
  const [periode, setPeriode] = useState('mois');
  const [dateDebut, setDateDebut] = useState(daysAgoISO(30));
  const [dateFin, setDateFin] = useState(todayISO());

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['reporting-ventes', periode, dateDebut, dateFin],
    queryFn: async () => (await api.get('/reporting/ventes', { params: { periode, dateDebut, dateFin } })).data,
    retry: 1,
  });

  return (
    <div>
      <PageHeader
        title="Rapport des ventes"
        subtitle="Chiffre d'affaires, quantités et panier moyen."
        actions={<ExportButtons endpoint="/reporting/ventes" filenamePrefix="rapport-ventes" />}
      />

      <div className="mb-5"><PeriodFilter periode={periode} onPeriodeChange={setPeriode} dateDebut={dateDebut} dateFin={dateFin} onDateDebutChange={setDateDebut} onDateFinChange={setDateFin} /></div>

      {isLoading && <Loader />}
      {isError && <ErrorState message={apiErrorMessage(error, 'Impossible de charger le rapport des ventes.')} onRetry={refetch} />}

      {!isLoading && !isError && data && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <StatCard icon={Wallet} label="Chiffre d'affaires" value={formatFCFA(data.ca ?? data.chiffreAffaires)} />
            <StatCard icon={ShoppingBag} label="Quantités vendues" value={formatNumber(data.quantiteVendue ?? data.quantites)} />
            <StatCard icon={Percent} label="Panier moyen" value={formatFCFA(data.panierMoyen)} />
            <StatCard icon={TrendingUp} label="Total ventes" value={formatNumber(data.nombreVentes ?? data.ventesParJour?.length)} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="card p-5 lg:col-span-2">
              <h3 className="section-title mb-3">Ventes par jour</h3>
              {(data.ventesParJour?.length ?? 0) > 0 ? (
                <SimpleBarChart data={data.ventesParJour.map((d) => ({ label: d.date?.slice(5), value: d.montant }))} />
              ) : <p className="text-sm text-ink-light py-10 text-center">Pas de données sur la période.</p>}
            </div>
            <div className="card p-5">
              <h3 className="section-title mb-3">Top produits vendus</h3>
              <div className="flex flex-col gap-3">
                {(data.topProduits || []).length === 0 && <p className="text-sm text-ink-light py-6 text-center">Aucune vente.</p>}
                {(data.topProduits || []).map((p, i) => (
                  <div key={p.nom} className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2 truncate"><span className="text-xs font-bold text-ink-light/60">{i + 1}</span>{p.nom}</span>
                    <span className="font-semibold shrink-0">{formatFCFA(p.montant)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
