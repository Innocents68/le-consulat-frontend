import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Download, FileSpreadsheet } from 'lucide-react';
import api, { apiErrorMessage } from '../../lib/api';
import { downloadExport } from '../../lib/download';
import PageHeader from '../../components/ui/PageHeader';
import { Select } from '../../components/ui/Field';
import { Loader, ErrorState } from '../../components/ui/Feedback';
import { SalesLineChart, DonutChart, Legend2, PALETTE } from '../../components/ui/Charts';
import { formatFCFA, formatNumber, periodePreset, todayISO } from '../../lib/format';
import { useToast } from '../../components/ui/Toast';
import { useAuthStore } from '../../store/authStore';
import { isSuperAdmin } from '../../lib/perimetre';

const PRESETS = [
  { value: 'mois', label: 'Ce mois' },
  { value: 'aujourdhui', label: "Aujourd'hui" },
  { value: 'hier', label: 'Hier' },
  { value: 'semaine', label: 'Cette semaine' },
  { value: 'annee', label: 'Cette année' },
];

/** §6.9.3 : synthèse graphique — évolution du CA, répartition par établissement/mode, top produits. */
export default function DashboardReportingPage() {
  const toast = useToast();
  const user = useAuthStore((s) => s.user);
  const superAdmin = isSuperAdmin(user);

  const [preset, setPreset] = useState('mois');
  const [{ dateDebut, dateFin }, setPeriode] = useState(() => periodePreset('mois'));
  const [etablissementId, setEtablissementId] = useState('');

  const { data: etablissements } = useQuery({ queryKey: ['etablissements'], queryFn: async () => (await api.get('/etablissements')).data });

  const params = { dateDebut, dateFin, etablissementId: etablissementId || undefined };
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['reporting-dashboard', params],
    queryFn: async () => (await api.get('/reporting/dashboard', { params })).data,
  });

  function applyPreset(value) {
    setPreset(value);
    setPeriode(periodePreset(value));
  }

  async function exporter(format) {
    try {
      await downloadExport('/reporting/dashboard/export', { ...params, format }, `dashboard.${format === 'excel' ? 'xlsx' : 'pdf'}`);
    } catch (e) {
      toast.error(apiErrorMessage(e));
    }
  }

  const parEtablissement = (data?.parEtablissement || []).map((r) => ({ label: r.label, pourcentage: r.montant }));
  const parMode = (data?.parModePaiement || []).map((r) => ({ label: r.label, value: r.montant, color: undefined }));

  return (
    <div>
      <PageHeader
        title="Tableau de bord"
        subtitle="Synthèse graphique du chiffre d'affaires (§6.9.3, EF-042 : période et périmètre indiqués ci-dessous)."
        actions={<>
          <button className="btn-secondary" onClick={() => exporter('pdf')}><Download size={15} /> PDF</button>
          <button className="btn-secondary" onClick={() => exporter('excel')}><FileSpreadsheet size={15} /> Excel</button>
        </>}
      />

      <div className="card p-4 mb-4 flex flex-wrap items-end gap-3">
        <div>
          <p className="label mb-1">Période</p>
          <div className="flex flex-wrap gap-1">
            {PRESETS.map((p) => (
              <button key={p.value} type="button"
                className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border ${preset === p.value ? 'bg-bordeaux-700 text-white border-bordeaux-700' : 'border-black/10 dark:border-white/10 text-ink-light hover:bg-black/5 dark:hover:bg-white/5'}`}
                onClick={() => applyPreset(p.value)}>
                {p.label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-end gap-2">
          <div><p className="label mb-1">Du</p><input type="date" max={todayISO()} className="input" value={dateDebut} onChange={(e) => { setPreset(''); setPeriode((p) => ({ ...p, dateDebut: e.target.value })); }} /></div>
          <div><p className="label mb-1">Au</p><input type="date" max={todayISO()} className="input" value={dateFin} onChange={(e) => { setPreset(''); setPeriode((p) => ({ ...p, dateFin: e.target.value })); }} /></div>
        </div>
        {superAdmin && (
          <div>
            <p className="label mb-1">Établissement</p>
            <Select className="w-auto" value={etablissementId} onChange={(e) => setEtablissementId(e.target.value)}>
              <option value="">Tous (comparaison)</option>
              {(etablissements || []).map((et) => <option key={et.id} value={et.id}>{et.nom}</option>)}
            </Select>
          </div>
        )}
      </div>

      {isLoading && <Loader />}
      {isError && <ErrorState message={apiErrorMessage(error)} onRetry={refetch} />}

      {!isLoading && !isError && data && (
        <div className="flex flex-col gap-4">
          <div className="card p-5">
            <p className="text-xs font-semibold uppercase text-ink-light">Chiffre d'affaires total</p>
            <p className="text-3xl font-extrabold text-bordeaux-700 dark:text-gold mt-1">{formatFCFA(data.caTotal)}</p>
          </div>

          <div className="card p-5">
            <p className="font-bold mb-3">Évolution du chiffre d'affaires</p>
            {data.evolutionCA.length > 0
              ? <SalesLineChart data={data.evolutionCA} xKey="date" yKey="montant" />
              : <p className="text-sm text-ink-light py-8 text-center">Aucune vente sur cette période.</p>}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {parEtablissement.length > 0 && (
              <div className="card p-5">
                <p className="font-bold mb-3">Répartition par établissement</p>
                <DonutChart data={parEtablissement} />
                <Legend2 items={parEtablissement.map((r, i) => ({ label: r.label, value: formatFCFA(r.pourcentage), color: PALETTE[i % PALETTE.length] }))} />
              </div>
            )}
            <div className="card p-5">
              <p className="font-bold mb-3">Répartition par mode de paiement</p>
              {parMode.length > 0 ? (
                <Legend2 items={parMode.map((r, i) => ({ label: r.label, value: formatFCFA(r.value), color: PALETTE[i % PALETTE.length] }))} />
              ) : <p className="text-sm text-ink-light py-4 text-center">Aucune donnée.</p>}
            </div>
          </div>

          <div className="card overflow-hidden">
            <p className="font-bold px-5 pt-4 pb-2">Top produits</p>
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-cream-100/70 dark:bg-white/5 text-left">
                  <th className="px-4 py-2 text-[11px] font-bold uppercase text-ink-light">Produit</th>
                  <th className="px-4 py-2 text-[11px] font-bold uppercase text-ink-light text-right">Quantité</th>
                  <th className="px-4 py-2 text-[11px] font-bold uppercase text-ink-light text-right">Montant</th>
                </tr>
              </thead>
              <tbody>
                {data.topProduits.map((p) => (
                  <tr key={p.produitId} className="border-t border-black/5 dark:border-white/5">
                    <td className="px-4 py-2">{p.produitNom}</td>
                    <td className="px-4 py-2 text-right">{formatNumber(p.quantite)}</td>
                    <td className="px-4 py-2 text-right">{formatFCFA(p.montant)}</td>
                  </tr>
                ))}
                {data.topProduits.length === 0 && (
                  <tr><td colSpan={3} className="px-4 py-6 text-center text-ink-light">Aucune vente sur cette période.</td></tr>
                )}
              </tbody>
            </table>
          </div>

          <p className="text-xs text-ink-light">Généré par {data.genereParNom} le {new Date(data.dateGeneration).toLocaleString('fr-FR')}</p>
        </div>
      )}
    </div>
  );
}
