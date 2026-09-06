import { useQuery } from '@tanstack/react-query';
import { Boxes, AlertTriangle } from 'lucide-react';
import api, { apiErrorMessage } from '../../lib/api';
import PageHeader from '../../components/ui/PageHeader';
import StatCard from '../../components/ui/StatCard';
import ExportButtons from '../../components/ui/ExportButtons';
import { DonutChart, PALETTE } from '../../components/ui/Charts';
import { Loader, ErrorState } from '../../components/ui/Feedback';
import { formatFCFA } from '../../lib/format';

export default function RapportStocksPage() {
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['reporting-stocks'],
    queryFn: async () => (await api.get('/reporting/stocks')).data,
    retry: 1,
  });

  return (
    <div>
      <PageHeader
        title="Rapport des stocks"
        subtitle="Valorisation, ruptures et répartition par catégorie."
        actions={<ExportButtons endpoint="/reporting/stocks" filenamePrefix="rapport-stocks" />}
      />

      {isLoading && <Loader />}
      {isError && <ErrorState message={apiErrorMessage(error, 'Impossible de charger le rapport des stocks.')} onRetry={refetch} />}

      {!isLoading && !isError && data && (
        <>
          <div className="grid grid-cols-2 gap-4 mb-6">
            <StatCard icon={Boxes} label="Valeur totale des stocks" value={formatFCFA(data.valorisation ?? data.valorisationTotale)} />
            <StatCard icon={AlertTriangle} label="Ruptures" value={data.ruptures ?? data.nombreRuptures ?? 0} accent />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="card p-5">
              <h3 className="section-title mb-3">Top produits en stock faible</h3>
              <div className="flex flex-col divide-y divide-black/5 dark:divide-white/5">
                {(data.topProduitsStockFaible || data.topStockFaible || []).length === 0 && (
                  <p className="text-sm text-ink-light py-6 text-center">Aucun produit en stock faible.</p>
                )}
                {(data.topProduitsStockFaible || data.topStockFaible || []).map((p) => (
                  <div key={p.nom} className="flex items-center justify-between py-2 text-sm">
                    <span>{p.nom}</span>
                    <span className="text-danger font-semibold">{p.stock} / seuil {p.seuil}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="card p-5">
              <h3 className="section-title mb-3">Répartition par catégorie</h3>
              {(data.repartitionParCategorie || []).length > 0 ? (
                <div className="flex items-center gap-4">
                  <div className="w-32 shrink-0"><DonutChart data={data.repartitionParCategorie} dataKey="pourcentage" nameKey="label" height={130} /></div>
                  <div className="flex-1 flex flex-col gap-1.5 text-sm">
                    {data.repartitionParCategorie.map((r, i) => (
                      <div key={r.label} className="flex items-center justify-between gap-2">
                        <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ background: PALETTE[i % PALETTE.length] }} />{r.label}</span>
                        <span className="font-semibold text-ink-light">{r.pourcentage}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : <p className="text-sm text-ink-light py-10 text-center">Pas de données.</p>}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
