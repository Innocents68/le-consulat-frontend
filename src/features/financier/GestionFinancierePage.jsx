import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Info } from 'lucide-react';
import api, { apiErrorMessage } from '../../lib/api';
import PageHeader from '../../components/ui/PageHeader';
import { Select } from '../../components/ui/Field';
import { Loader, ErrorState } from '../../components/ui/Feedback';
import { formatFCFA, periodePreset, todayISO } from '../../lib/format';

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

/** §6.7.1 — module entièrement réservé au Super Administrateur (EF-031). */
export default function GestionFinancierePage() {
  const [preset, setPreset] = useState('mois');
  const [{ dateDebut, dateFin }, setPeriode] = useState(() => periodePreset('mois'));
  const [etablissementId, setEtablissementId] = useState('');
  const [utilisateurId, setUtilisateurId] = useState('');
  const [modePaiement, setModePaiement] = useState('');

  const { data: etablissements } = useQuery({ queryKey: ['etablissements'], queryFn: async () => (await api.get('/etablissements')).data });
  const { data: utilisateurs } = useQuery({ queryKey: ['utilisateurs-financier'], queryFn: async () => (await api.get('/utilisateurs', { params: { size: 200 } })).data.content });

  const utilisateursFiltres = useMemo(
    () => (utilisateurs || []).filter((u) => !etablissementId || String(u.etablissementId) === String(etablissementId)),
    [utilisateurs, etablissementId]
  );

  const params = { dateDebut, dateFin, etablissementId: etablissementId || undefined, utilisateurId: utilisateurId || undefined, modePaiement: modePaiement || undefined };
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['financier-synthese', params],
    queryFn: async () => (await api.get('/financier/synthese', { params })).data,
  });

  function applyPreset(value) {
    setPreset(value);
    setPeriode(periodePreset(value));
  }

  const lignes = data?.lignes || [];
  const total = data?.total;

  return (
    <div>
      <PageHeader
        title="Gestion financière"
        subtitle="Recettes, dépenses et soldes consolidés par établissement (§6.7.1, réservé au Super Administrateur)."
      />

      <div className="card p-4 mb-4 flex flex-wrap items-end gap-3">
        <div>
          <p className="label mb-1">Période</p>
          <div className="flex flex-wrap gap-1">
            {PRESETS.map((p) => (
              <button
                key={p.value}
                type="button"
                className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border ${preset === p.value ? 'bg-bordeaux-700 text-white border-bordeaux-700' : 'border-black/10 dark:border-white/10 text-ink-light hover:bg-black/5 dark:hover:bg-white/5'}`}
                onClick={() => applyPreset(p.value)}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-end gap-2">
          <div>
            <p className="label mb-1">Du</p>
            <input type="date" max={todayISO()} className="input" value={dateDebut} onChange={(e) => { setPreset(''); setPeriode((p) => ({ ...p, dateDebut: e.target.value })); }} />
          </div>
          <div>
            <p className="label mb-1">Au</p>
            <input type="date" max={todayISO()} className="input" value={dateFin} onChange={(e) => { setPreset(''); setPeriode((p) => ({ ...p, dateFin: e.target.value })); }} />
          </div>
        </div>
        <div>
          <p className="label mb-1">Établissement</p>
          <Select className="w-auto" value={etablissementId} onChange={(e) => { setEtablissementId(e.target.value); setUtilisateurId(''); }}>
            <option value="">Tous</option>
            {(etablissements || []).map((et) => <option key={et.id} value={et.id}>{et.nom}</option>)}
          </Select>
        </div>
        <div>
          <p className="label mb-1">Utilisateur</p>
          <Select className="w-auto" value={utilisateurId} onChange={(e) => setUtilisateurId(e.target.value)}>
            <option value="">Tous</option>
            {utilisateursFiltres.map((u) => <option key={u.id} value={u.id}>{u.nom}</option>)}
          </Select>
        </div>
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

      {!isLoading && !isError && (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-cream-100/70 dark:bg-white/5 text-left">
                  <th className="px-4 py-2.5 text-[11px] font-bold uppercase tracking-wide text-ink-light">Établissement</th>
                  <th className="px-4 py-2.5 text-[11px] font-bold uppercase tracking-wide text-ink-light text-right">Recettes</th>
                  <th className="px-4 py-2.5 text-[11px] font-bold uppercase tracking-wide text-ink-light text-right">Avoirs</th>
                  <th className="px-4 py-2.5 text-[11px] font-bold uppercase tracking-wide text-ink-light text-right">Dépenses</th>
                  <th className="px-4 py-2.5 text-[11px] font-bold uppercase tracking-wide text-ink-light text-right">
                    <span className="inline-flex items-center gap-1 justify-end w-full" title="Solde = Recettes encaissées − Avoirs − Dépenses (RG-088)">
                      Solde <Info size={12} />
                    </span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {lignes.map((l) => (
                  <tr key={l.etablissementId} className="border-t border-black/5 dark:border-white/5">
                    <td className="px-4 py-2.5 font-medium">{l.etablissementNom}</td>
                    <td className="px-4 py-2.5 text-right">{formatFCFA(l.recettes)}</td>
                    <td className="px-4 py-2.5 text-right">-{formatFCFA(l.avoirs)}</td>
                    <td className="px-4 py-2.5 text-right">-{formatFCFA(l.depenses)}</td>
                    <td className={`px-4 py-2.5 text-right font-bold ${l.solde < 0 ? 'text-danger' : 'text-success'}`}>{formatFCFA(l.solde)}</td>
                  </tr>
                ))}
                {total && (
                  <tr className="border-t-2 border-black/10 dark:border-white/20 bg-cream-100/50 dark:bg-white/5 font-bold">
                    <td className="px-4 py-2.5">TOTAL</td>
                    <td className="px-4 py-2.5 text-right">{formatFCFA(total.recettes)}</td>
                    <td className="px-4 py-2.5 text-right">-{formatFCFA(total.avoirs)}</td>
                    <td className="px-4 py-2.5 text-right">-{formatFCFA(total.depenses)}</td>
                    <td className={`px-4 py-2.5 text-right ${total.solde < 0 ? 'text-danger' : 'text-success'}`}>{formatFCFA(total.solde)}</td>
                  </tr>
                )}
                {lignes.length === 0 && (
                  <tr><td colSpan={5} className="px-4 py-8 text-center text-ink-light">Aucune donnée pour ce périmètre.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
