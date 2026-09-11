import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Download, FileSpreadsheet } from 'lucide-react';
import api, { apiErrorMessage } from '../../lib/api';
import { downloadExport } from '../../lib/download';
import PageHeader from '../../components/ui/PageHeader';
import { Select } from '../../components/ui/Field';
import { Loader, ErrorState } from '../../components/ui/Feedback';
import { formatDateTime, formatFCFA, periodePreset, todayISO } from '../../lib/format';
import { useToast } from '../../components/ui/Toast';
import { useAuthStore } from '../../store/authStore';
import { isSuperAdmin } from '../../lib/perimetre';

const PRESETS = [
  { value: 'mois', label: 'Ce mois' },
  { value: 'semaine', label: 'Cette semaine' },
  { value: 'annee', label: 'Cette année' },
];

const TYPE_LABEL = {
  ENTREE: 'Entrée', SORTIE: 'Sortie manuelle', SORTIE_VENTE: 'Sortie (vente)', RETOUR_AVOIR: 'Retour (avoir)',
  TRANSFERT_SORTANT: 'Transfert sortant', TRANSFERT_ENTRANT: 'Transfert entrant', AJUSTEMENT_INVENTAIRE: 'Ajustement inventaire',
};

/** §6.9.3 : stock actuel (photo de l'instant présent), mouvements et écarts d'inventaire de la
 * période choisie. */
export default function RapportStocksPage() {
  const toast = useToast();
  const user = useAuthStore((s) => s.user);
  const superAdmin = isSuperAdmin(user);

  const [preset, setPreset] = useState('mois');
  const [{ dateDebut, dateFin }, setPeriode] = useState(() => periodePreset('mois'));
  const [etablissementId, setEtablissementId] = useState('');
  const [categorieId, setCategorieId] = useState('');

  const { data: etablissements } = useQuery({ queryKey: ['etablissements'], queryFn: async () => (await api.get('/etablissements')).data });
  const { data: categories } = useQuery({
    queryKey: ['categories', etablissementId],
    queryFn: async () => (await api.get('/categories', { params: etablissementId ? { etablissementId } : {} })).data,
    enabled: superAdmin ? !!etablissementId : true,
  });

  const params = { dateDebut, dateFin, etablissementId: etablissementId || undefined, categorieId: categorieId || undefined };
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['reporting-stocks', params],
    queryFn: async () => (await api.get('/reporting/stocks', { params })).data,
  });

  function applyPreset(value) {
    setPreset(value);
    setPeriode(periodePreset(value));
  }

  async function exporter(format) {
    try {
      await downloadExport('/reporting/stocks/export', { ...params, format }, `rapport-stocks.${format === 'excel' ? 'xlsx' : 'pdf'}`);
    } catch (e) {
      toast.error(apiErrorMessage(e));
    }
  }

  return (
    <div>
      <PageHeader
        title="Rapport des stocks"
        subtitle="Stock actuel, mouvements et écarts d'inventaire (§6.9.3)."
        actions={<>
          <button className="btn-secondary" onClick={() => exporter('pdf')}><Download size={15} /> PDF</button>
          <button className="btn-secondary" onClick={() => exporter('excel')}><FileSpreadsheet size={15} /> Excel</button>
        </>}
      />

      <div className="card p-4 mb-4 flex flex-wrap items-end gap-3">
        {superAdmin && (
          <div>
            <p className="label mb-1">Établissement</p>
            <Select className="w-auto" value={etablissementId} onChange={(e) => { setEtablissementId(e.target.value); setCategorieId(''); }}>
              <option value="">Tous</option>
              {(etablissements || []).map((et) => <option key={et.id} value={et.id}>{et.nom}</option>)}
            </Select>
          </div>
        )}
        <div>
          <p className="label mb-1">Catégorie</p>
          <Select className="w-auto" value={categorieId} onChange={(e) => setCategorieId(e.target.value)}>
            <option value="">Toutes</option>
            {(categories || []).map((c) => <option key={c.id} value={c.id}>{c.nom}</option>)}
          </Select>
        </div>
        <div>
          <p className="label mb-1">Période (mouvements / écarts)</p>
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
      </div>

      {isLoading && <Loader />}
      {isError && <ErrorState message={apiErrorMessage(error)} onRetry={refetch} />}

      {!isLoading && !isError && data && (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="card p-4"><p className="text-xs text-ink-light uppercase font-semibold">Valorisation totale</p><p className="text-xl font-bold">{formatFCFA(data.valorisationTotale)}</p></div>
            <div className="card p-4"><p className="text-xs text-ink-light uppercase font-semibold">Ruptures</p><p className="text-xl font-bold text-danger">{data.nombreRuptures}</p></div>
            <div className="card p-4"><p className="text-xs text-ink-light uppercase font-semibold">Sous seuil</p><p className="text-xl font-bold text-warning">{data.nombreSousSeuil}</p></div>
          </div>

          <div className="card overflow-hidden">
            <p className="font-bold px-5 pt-4 pb-2">Stock actuel</p>
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-cream-100/70 dark:bg-white/5 text-left">
                  <th className="px-4 py-2 text-[11px] font-bold uppercase text-ink-light">Produit</th>
                  <th className="px-4 py-2 text-[11px] font-bold uppercase text-ink-light">Catégorie</th>
                  <th className="px-4 py-2 text-[11px] font-bold uppercase text-ink-light text-right">Stock</th>
                  <th className="px-4 py-2 text-[11px] font-bold uppercase text-ink-light text-right">Seuil</th>
                  <th className="px-4 py-2 text-[11px] font-bold uppercase text-ink-light text-right">Valorisation</th>
                  <th className="px-4 py-2 text-[11px] font-bold uppercase text-ink-light">Statut</th>
                </tr>
              </thead>
              <tbody>
                {data.stockActuel.map((s) => (
                  <tr key={s.produitId} className="border-t border-black/5 dark:border-white/5">
                    <td className="px-4 py-2">{s.produitNom}</td>
                    <td className="px-4 py-2">{s.categorieNom}</td>
                    <td className={`px-4 py-2 text-right font-semibold ${s.rupture ? 'text-danger' : s.sousSeuil ? 'text-warning' : ''}`}>{s.quantiteStock}</td>
                    <td className="px-4 py-2 text-right">{s.seuilAlerte ?? '—'}</td>
                    <td className="px-4 py-2 text-right">{s.valorisation != null ? formatFCFA(s.valorisation) : '—'}</td>
                    <td className="px-4 py-2">
                      {s.rupture ? <span className="text-danger font-semibold">Rupture</span> : s.sousSeuil ? <span className="text-warning font-semibold">Sous seuil</span> : <span className="text-success">OK</span>}
                    </td>
                  </tr>
                ))}
                {data.stockActuel.length === 0 && <tr><td colSpan={6} className="px-4 py-6 text-center text-ink-light">Aucun produit suivi.</td></tr>}
              </tbody>
            </table>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="card overflow-hidden">
              <p className="font-bold px-5 pt-4 pb-2">Mouvements par type (période)</p>
              <table className="w-full text-sm">
                <tbody>
                  {data.mouvementsParType.map((m) => (
                    <tr key={m.type} className="border-t border-black/5 dark:border-white/5">
                      <td className="px-4 py-2">{TYPE_LABEL[m.type] || m.type}</td>
                      <td className="px-4 py-2 text-right font-semibold">{m.quantiteTotale}</td>
                    </tr>
                  ))}
                  {data.mouvementsParType.length === 0 && <tr><td className="px-4 py-6 text-center text-ink-light">Aucun mouvement sur cette période.</td></tr>}
                </tbody>
              </table>
            </div>
            <div className="card overflow-hidden">
              <p className="font-bold px-5 pt-4 pb-2">Écarts d'inventaire (période)</p>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left">
                    <th className="px-4 py-1 text-[11px] font-bold uppercase text-ink-light">Produit</th>
                    <th className="px-4 py-1 text-[11px] font-bold uppercase text-ink-light text-right">Écart</th>
                    <th className="px-4 py-1 text-[11px] font-bold uppercase text-ink-light text-right">Valeur</th>
                  </tr>
                </thead>
                <tbody>
                  {data.ecartsInventaire.map((e, i) => (
                    <tr key={i} className="border-t border-black/5 dark:border-white/5">
                      <td className="px-4 py-2">{e.produitNom} <span className="text-ink-light text-xs">({e.inventaireNumero})</span></td>
                      <td className={`px-4 py-2 text-right font-semibold ${e.ecartQuantite < 0 ? 'text-danger' : 'text-success'}`}>{e.ecartQuantite > 0 ? `+${e.ecartQuantite}` : e.ecartQuantite}</td>
                      <td className="px-4 py-2 text-right">{e.ecartValeur != null ? formatFCFA(e.ecartValeur) : '—'}</td>
                    </tr>
                  ))}
                  {data.ecartsInventaire.length === 0 && <tr><td colSpan={3} className="px-4 py-6 text-center text-ink-light">Aucun écart sur cette période.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>

          <p className="text-xs text-ink-light">Généré par {data.genereParNom} le {formatDateTime(data.dateGeneration)}</p>
        </div>
      )}
    </div>
  );
}
