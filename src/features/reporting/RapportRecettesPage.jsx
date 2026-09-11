import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Download, FileSpreadsheet } from 'lucide-react';
import api, { apiErrorMessage } from '../../lib/api';
import { downloadExport } from '../../lib/download';
import PageHeader from '../../components/ui/PageHeader';
import { Select } from '../../components/ui/Field';
import { Loader, ErrorState } from '../../components/ui/Feedback';
import { formatDate, formatFCFA, periodePreset, todayISO } from '../../lib/format';
import { useToast } from '../../components/ui/Toast';
import { useAuthStore } from '../../store/authStore';
import { isSuperAdmin } from '../../lib/perimetre';

const MODES = [
  { value: 'ESPECES', label: 'Espèces' },
  { value: 'MOBILE_MONEY', label: 'Mobile Money' },
  { value: 'CARTE', label: 'Carte bancaire' },
  { value: 'VIREMENT', label: 'Virement' },
  { value: 'AUTRE', label: 'Autre' },
];

const PRESETS = [
  { value: 'mois', label: 'Ce mois' },
  { value: 'aujourdhui', label: "Aujourd'hui" },
  { value: 'hier', label: 'Hier' },
  { value: 'semaine', label: 'Cette semaine' },
  { value: 'annee', label: 'Cette année' },
];

/** §6.9.3 : recettes encaissées par jour, par mode de paiement, par utilisateur ; remises et
 * avoirs déduits. */
export default function RapportRecettesPage() {
  const toast = useToast();
  const user = useAuthStore((s) => s.user);
  const superAdmin = isSuperAdmin(user);

  const [preset, setPreset] = useState('mois');
  const [{ dateDebut, dateFin }, setPeriode] = useState(() => periodePreset('mois'));
  const [etablissementId, setEtablissementId] = useState('');
  const [utilisateurId, setUtilisateurId] = useState('');
  const [modePaiement, setModePaiement] = useState('');

  const { data: etablissements } = useQuery({ queryKey: ['etablissements'], queryFn: async () => (await api.get('/etablissements')).data });
  const { data: utilisateurs } = useQuery({
    queryKey: ['utilisateurs-reporting'],
    queryFn: async () => (await api.get('/utilisateurs', { params: { size: 200 } })).data.content,
    enabled: superAdmin,
  });

  function applyPreset(value) {
    setPreset(value);
    setPeriode(periodePreset(value));
  }

  const params = { dateDebut, dateFin, etablissementId: etablissementId || undefined, utilisateurId: utilisateurId || undefined, modePaiement: modePaiement || undefined };
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['reporting-recettes', params],
    queryFn: async () => (await api.get('/reporting/recettes', { params })).data,
  });

  async function exporter(format) {
    try {
      await downloadExport('/reporting/recettes/export', { ...params, format }, `rapport-recettes.${format === 'excel' ? 'xlsx' : 'pdf'}`);
    } catch (e) {
      toast.error(apiErrorMessage(e));
    }
  }

  return (
    <div>
      <PageHeader
        title="Rapport des recettes"
        subtitle="Recettes encaissées par jour, mode de paiement et utilisateur — avoirs déduits (§6.9.3)."
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
              <option value="">Tous</option>
              {(etablissements || []).map((et) => <option key={et.id} value={et.id}>{et.nom}</option>)}
            </Select>
          </div>
        )}
        {superAdmin && (
          <div>
            <p className="label mb-1">Utilisateur</p>
            <Select className="w-auto" value={utilisateurId} onChange={(e) => setUtilisateurId(e.target.value)}>
              <option value="">Tous</option>
              {(utilisateurs || []).map((u) => <option key={u.id} value={u.id}>{u.nom}</option>)}
            </Select>
          </div>
        )}
        <div>
          <p className="label mb-1">Mode de paiement</p>
          <Select className="w-auto" value={modePaiement} onChange={(e) => setModePaiement(e.target.value)}>
            <option value="">Tous</option>
            {MODES.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
          </Select>
        </div>
      </div>

      {isLoading && <Loader />}
      {isError && <ErrorState message={apiErrorMessage(error)} onRetry={refetch} />}

      {!isLoading && !isError && data && (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="card p-4"><p className="text-xs text-ink-light uppercase font-semibold">Avoirs déduits</p><p className="text-xl font-bold text-danger">-{formatFCFA(data.avoirsTotal)}</p></div>
            <div className="card p-4"><p className="text-xs text-ink-light uppercase font-semibold">Total net</p><p className="text-xl font-bold text-success">{formatFCFA(data.totalNet)}</p></div>
          </div>

          <div className="card overflow-hidden">
            <p className="font-bold px-5 pt-4 pb-2">Recettes par jour</p>
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-cream-100/70 dark:bg-white/5 text-left">
                  <th className="px-4 py-2 text-[11px] font-bold uppercase text-ink-light">Jour</th>
                  <th className="px-4 py-2 text-[11px] font-bold uppercase text-ink-light text-right">Brut</th>
                  <th className="px-4 py-2 text-[11px] font-bold uppercase text-ink-light text-right">Remises</th>
                  <th className="px-4 py-2 text-[11px] font-bold uppercase text-ink-light text-right">Net</th>
                </tr>
              </thead>
              <tbody>
                {data.parJour.map((j) => (
                  <tr key={j.date} className="border-t border-black/5 dark:border-white/5">
                    <td className="px-4 py-2">{formatDate(j.date)}</td>
                    <td className="px-4 py-2 text-right">{formatFCFA(j.brut)}</td>
                    <td className="px-4 py-2 text-right">-{formatFCFA(j.remises)}</td>
                    <td className="px-4 py-2 text-right font-semibold">{formatFCFA(j.net)}</td>
                  </tr>
                ))}
                {data.parJour.length === 0 && <tr><td colSpan={4} className="px-4 py-6 text-center text-ink-light">Aucune recette sur cette période.</td></tr>}
              </tbody>
            </table>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="card overflow-hidden">
              <p className="font-bold px-5 pt-4 pb-2">Par mode de paiement</p>
              <table className="w-full text-sm">
                <tbody>
                  {data.parMode.map((m) => (
                    <tr key={m.label} className="border-t border-black/5 dark:border-white/5">
                      <td className="px-4 py-2">{MODES.find((x) => x.value === m.label)?.label || m.label}</td>
                      <td className="px-4 py-2 text-right font-semibold">{formatFCFA(m.montant)}</td>
                    </tr>
                  ))}
                  {data.parMode.length === 0 && <tr><td className="px-4 py-6 text-center text-ink-light">Aucune donnée.</td></tr>}
                </tbody>
              </table>
            </div>
            <div className="card overflow-hidden">
              <p className="font-bold px-5 pt-4 pb-2">Par utilisateur</p>
              <table className="w-full text-sm">
                <tbody>
                  {data.parUtilisateur.map((u) => (
                    <tr key={u.label} className="border-t border-black/5 dark:border-white/5">
                      <td className="px-4 py-2">{u.label}</td>
                      <td className="px-4 py-2 text-right font-semibold">{formatFCFA(u.montant)}</td>
                    </tr>
                  ))}
                  {data.parUtilisateur.length === 0 && <tr><td className="px-4 py-6 text-center text-ink-light">Aucune donnée.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>

          <p className="text-xs text-ink-light">Généré par {data.genereParNom} le {new Date(data.dateGeneration).toLocaleString('fr-FR')}</p>
        </div>
      )}
    </div>
  );
}
