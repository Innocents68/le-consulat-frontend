import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Wallet, TrendingUp, TrendingDown, Landmark } from 'lucide-react';
import api, { fetchPage, apiErrorMessage } from '../../lib/api';
import PageHeader from '../../components/ui/PageHeader';
import StatCard from '../../components/ui/StatCard';
import DataTable from '../../components/ui/DataTable';
import { Loader, ErrorState } from '../../components/ui/Feedback';
import { MultiLineChart } from '../../components/ui/Charts';
import { formatFCFA, formatDate } from '../../lib/format';
import { useTableState } from '../../hooks/useTableState';
import { useListQuery } from '../../hooks/useResource';

const PERIODES = [{ value: 'jour', label: "Aujourd'hui" }, { value: 'semaine', label: 'Cette semaine' }, { value: 'mois', label: 'Ce mois' }];

function VueEnsemble({ periode }) {
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['finance-vue-ensemble', periode],
    queryFn: async () => (await api.get('/finance/vue-ensemble', { params: { periode } })).data,
    retry: 1,
  });

  if (isLoading) return <Loader />;
  if (isError) return <ErrorState message={apiErrorMessage(error, 'Impossible de charger la vue financière.')} onRetry={refetch} />;

  return (
    <div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <StatCard icon={TrendingUp} label="Recettes du jour" value={formatFCFA(data.recettesDuJour)} accent />
        <StatCard icon={TrendingDown} label="Dépenses du jour" value={formatFCFA(data.depensesDuJour)} />
        <StatCard icon={Wallet} label="Bénéfice du jour" value={formatFCFA(data.beneficeDuJour)} />
      </div>
      <div className="card p-5">
        <h3 className="section-title mb-3">Évolution (7 jours)</h3>
        {data.evolution7Jours?.length > 0 ? (
          <MultiLineChart
            data={data.evolution7Jours.map((d) => ({ date: d.date?.slice(5), recettes: d.recettes, depenses: d.depenses }))}
            lines={[{ key: 'recettes', name: 'Recettes', color: '#2E9E4F' }, { key: 'depenses', name: 'Dépenses', color: '#C0392B' }]}
          />
        ) : <p className="text-sm text-ink-light py-10 text-center">Pas encore de données.</p>}
      </div>
    </div>
  );
}

function RecettesTab() {
  const table = useTableState({ initialSize: 10 });
  const { data, isLoading, isError, error, refetch } = useListQuery('recettes', table.params);
  return (
    <DataTable
      columns={[
        { key: 'date', header: 'Date', render: (r) => formatDate(r.date), sortable: true },
        { key: 'source', header: 'Source', render: (r) => r.source === 'VENTE' ? 'Vente' : 'Autre' },
        { key: 'description', header: 'Description' },
        { key: 'montant', header: 'Montant', render: (r) => formatFCFA(r.montant), className: 'font-semibold text-success' },
      ]}
      rows={data?.rows || []}
      total={data?.total || 0}
      totalPages={data?.totalPages || 0}
      page={table.page}
      isLoading={isLoading}
      isError={isError}
      errorMessage={apiErrorMessage(error)}
      onRetry={refetch}
      search={table.search}
      onSearchChange={table.setSearch}
      onPageChange={table.setPage}
      emptyLabel="Aucune recette enregistrée."
    />
  );
}

export default function FinancierPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState('vue');
  const [periode, setPeriode] = useState('jour');

  return (
    <div>
      <PageHeader
        title="Gestion financière"
        subtitle="Recettes, dépenses et états financiers de l'établissement."
        actions={
          <select value={periode} onChange={(e) => setPeriode(e.target.value)} className="input w-auto py-2">
            {PERIODES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
          </select>
        }
      />

      <div className="flex gap-1.5 mb-5 flex-wrap">
        {[
          { id: 'vue', label: "Vue d'ensemble" },
          { id: 'recettes', label: 'Recettes' },
          { id: 'depenses', label: 'Dépenses' },
          { id: 'etats', label: 'États financiers' },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => t.id === 'depenses' ? navigate('/depenses') : setTab(t.id)}
            className={`px-4 py-1.5 rounded-full text-sm font-semibold ${tab === t.id ? 'bg-bordeaux-700 text-white' : 'bg-white dark:bg-white/10 text-ink-light border border-black/10'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'vue' && <VueEnsemble periode={periode} />}
      {tab === 'recettes' && <RecettesTab />}
      {tab === 'etats' && (
        <div className="card p-8 text-center">
          <Landmark size={32} className="mx-auto text-bordeaux-700 mb-3" />
          <p className="font-semibold text-ink dark:text-cream-100 mb-1">États financiers simplifiés</p>
          <p className="text-sm text-ink-light mb-4">Consultez le détail dans les rapports dédiés : ventes, recettes/dépenses et bénéfices.</p>
          <div className="flex justify-center gap-2 flex-wrap">
            <button className="btn-secondary" onClick={() => navigate('/reporting/recettes')}>Rapport des recettes</button>
            <button className="btn-secondary" onClick={() => navigate('/reporting/benefices')}>Rapport des bénéfices</button>
          </div>
        </div>
      )}
    </div>
  );
}
