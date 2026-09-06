import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { TrendingUp, TrendingDown, Percent } from 'lucide-react';
import api, { apiErrorMessage } from '../../lib/api';
import PageHeader from '../../components/ui/PageHeader';
import StatCard from '../../components/ui/StatCard';
import PeriodFilter from '../../components/ui/PeriodFilter';
import ExportButtons from '../../components/ui/ExportButtons';
import { MultiLineChart } from '../../components/ui/Charts';
import { Loader, ErrorState } from '../../components/ui/Feedback';
import { formatFCFA, todayISO, daysAgoISO } from '../../lib/format';

export default function RapportRecettesPage() {
  const [periode, setPeriode] = useState('mois');
  const [dateDebut, setDateDebut] = useState(daysAgoISO(30));
  const [dateFin, setDateFin] = useState(todayISO());

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['reporting-recettes-depenses', periode, dateDebut, dateFin],
    queryFn: async () => (await api.get('/reporting/recettes-depenses', { params: { periode, dateDebut, dateFin } })).data,
    retry: 1,
  });

  return (
    <div>
      <PageHeader
        title="Rapport des recettes et dépenses"
        subtitle="Détail des flux financiers et marge."
        actions={<ExportButtons endpoint="/reporting/recettes-depenses" filenamePrefix="rapport-recettes" />}
      />

      <div className="mb-5"><PeriodFilter periode={periode} onPeriodeChange={setPeriode} dateDebut={dateDebut} dateFin={dateFin} onDateDebutChange={setDateDebut} onDateFinChange={setDateFin} /></div>

      {isLoading && <Loader />}
      {isError && <ErrorState message={apiErrorMessage(error, 'Impossible de charger le rapport.')} onRetry={refetch} />}

      {!isLoading && !isError && data && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            <StatCard icon={TrendingUp} label="Recettes totales" value={formatFCFA(data.recettesTotales)} />
            <StatCard icon={TrendingDown} label="Dépenses totales" value={formatFCFA(data.depensesTotales)} />
            <StatCard icon={Percent} label="Marge" value={data.marge != null ? `${data.marge}%` : formatFCFA(data.margeMontant)} />
          </div>

          <div className="card p-5">
            <h3 className="section-title mb-3">Flux par jour</h3>
            {(data.fluxParJour?.length ?? 0) > 0 ? (
              <MultiLineChart
                data={data.fluxParJour.map((d) => ({ date: d.date?.slice(5), recettes: d.recettes, depenses: d.depenses }))}
                lines={[{ key: 'recettes', name: 'Recettes', color: '#2E9E4F' }, { key: 'depenses', name: 'Dépenses', color: '#C0392B' }]}
              />
            ) : <p className="text-sm text-ink-light py-10 text-center">Pas de données sur la période.</p>}
          </div>
        </>
      )}
    </div>
  );
}
