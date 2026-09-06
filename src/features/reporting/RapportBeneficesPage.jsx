import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { TrendingUp } from 'lucide-react';
import api, { apiErrorMessage } from '../../lib/api';
import PageHeader from '../../components/ui/PageHeader';
import StatCard from '../../components/ui/StatCard';
import ExportButtons from '../../components/ui/ExportButtons';
import { SalesLineChart } from '../../components/ui/Charts';
import { Loader, ErrorState } from '../../components/ui/Feedback';
import { formatFCFA, formatPercent } from '../../lib/format';

const PERIODES = [{ value: 'jour', label: 'Journalier' }, { value: 'semaine', label: 'Hebdomadaire' }, { value: 'mois', label: 'Mensuel' }];

export default function RapportBeneficesPage() {
  const [periode, setPeriode] = useState('mois');

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['reporting-benefices', periode],
    queryFn: async () => (await api.get('/reporting/benefices', { params: { periode } })).data,
    retry: 1,
  });

  return (
    <div>
      <PageHeader
        title="Rapport des bénéfices"
        subtitle="Bénéfice net par jour, semaine ou mois."
        actions={<>
          <select value={periode} onChange={(e) => setPeriode(e.target.value)} className="input w-auto py-2">
            {PERIODES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
          </select>
          <ExportButtons endpoint="/reporting/benefices" filenamePrefix="rapport-benefices" />
        </>}
      />

      {isLoading && <Loader />}
      {isError && <ErrorState message={apiErrorMessage(error, 'Impossible de charger le rapport des bénéfices.')} onRetry={refetch} />}

      {!isLoading && !isError && data && (
        <>
          <div className="grid grid-cols-2 gap-4 mb-6">
            <StatCard icon={TrendingUp} label="Bénéfice total" value={formatFCFA(data.beneficeTotal)} delta={data.variation} />
            <StatCard icon={TrendingUp} label="Marge moyenne" value={data.margeMoyenne != null ? formatPercent(data.margeMoyenne) : '—'} />
          </div>
          <div className="card p-5">
            <h3 className="section-title mb-3">Évolution du bénéfice</h3>
            {(data.evolution?.length ?? 0) > 0 ? (
              <SalesLineChart data={data.evolution.map((d) => ({ date: d.date?.slice(5), montant: d.benefice ?? d.montant }))} />
            ) : <p className="text-sm text-ink-light py-10 text-center">Pas de données sur la période.</p>}
          </div>
        </>
      )}
    </div>
  );
}
