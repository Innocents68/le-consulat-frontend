import { useMemo, useRef, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, ClipboardCheck, PackageCheck, ShieldCheck, Search, CheckCheck, Zap, Download } from 'lucide-react';
import api, { apiErrorMessage } from '../../lib/api';
import { downloadExport } from '../../lib/download';
import Modal from '../../components/ui/Modal';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import PageHeader from '../../components/ui/PageHeader';
import StatusBadge from '../../components/ui/StatusBadge';
import { Select } from '../../components/ui/Field';
import { Loader, ErrorState } from '../../components/ui/Feedback';
import { formatDate, formatDateTime, formatFCFA } from '../../lib/format';
import { useToast } from '../../components/ui/Toast';

const ETAT_OPTIONS = [
  { value: 'TOUS', label: 'Tous les produits' },
  { value: 'AVEC_STOCK', label: 'Produits avec stock' },
  { value: 'A_ZERO', label: 'Produits à zéro' },
  { value: 'COMPTES', label: 'Produits déjà comptés' },
  { value: 'NON_COMPTES', label: 'Produits non comptés' },
  { value: 'AVEC_ECART', label: 'Produits avec écart' },
];

// Cahier_des_charges_amelioration_inventaire_Le_Consulat.docx §2 : une cellule vide n'est PAS une
// quantité nulle — tant qu'aucun comptage n'a été saisi, la quantité retenue reste le théorique.
function estCompte(ligne) {
  return ligne.stockPhysique !== null && ligne.stockPhysique !== undefined;
}
function quantiteRetenue(ligne) {
  return estCompte(ligne) ? Number(ligne.stockPhysique) : Number(ligne.stockTheorique);
}
function ecartLigne(ligne) {
  return quantiteRetenue(ligne) - Number(ligne.stockTheorique);
}
function resumerLignes(lignes) {
  let conformes = 0, ecartsPos = 0, ecartsNeg = 0;
  for (const l of lignes) {
    const ecart = ecartLigne(l);
    if (ecart === 0) conformes++;
    else if (ecart > 0) ecartsPos++;
    else ecartsNeg++;
  }
  return { total: lignes.length, conformes, ecartsPos, ecartsNeg, avecEcart: ecartsPos + ecartsNeg };
}

/** Détail + cycle de vie d'un inventaire (§6.6.5) : Brouillon -> En comptage -> Clôturé -> Validé.
 * Chaque transition passe par une action explicite, jamais un saut arbitraire (RG-087).
 * Cahier_des_charges_amelioration_inventaire_Le_Consulat.docx : refonte de l'écran de comptage
 * (filtres, progression, validation intelligente, saisie clavier, résumé avant clôture). */
export default function InventaireDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const queryClient = useQueryClient();

  const { data: inventaire, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['inventaire', id],
    queryFn: async () => (await api.get(`/inventaires/${id}`)).data,
  });

  const [saisie, setSaisie] = useState({});
  const [clotureOpen, setClotureOpen] = useState(false);
  const [commentaireCloture, setCommentaireCloture] = useState('');
  const [validerOpen, setValiderOpen] = useState(false);
  const [validerLignesVidesMode, setValiderLignesVidesMode] = useState(null); // 'INCHANGEES' | 'TOUT' | null
  const [filtres, setFiltres] = useState({ recherche: '', categorieId: '', etat: 'TOUS' });
  const inputRefs = useRef([]);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['inventaire', id] });
    queryClient.invalidateQueries({ queryKey: ['inventaires'] });
  };

  const demarrer = useMutation({
    mutationFn: () => api.post(`/inventaires/${id}/demarrer-comptage`).then((r) => r.data),
    onSuccess: () => { invalidate(); toast.success('Comptage démarré.'); },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });
  const saisirLigne = useMutation({
    mutationFn: ({ ligneId, stockPhysique }) => api.patch(`/inventaires/${id}/lignes/${ligneId}`, { stockPhysique }).then((r) => r.data),
    onSuccess: () => invalidate(),
    onError: (e) => toast.error(apiErrorMessage(e)),
  });
  const validerLignesVides = useMutation({
    mutationFn: () => api.post(`/inventaires/${id}/valider-lignes-vides`).then((r) => r.data),
    onSuccess: () => { invalidate(); toast.success('Lignes vides validées comme conformes au théorique.'); setValiderLignesVidesMode(null); },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });
  const cloturer = useMutation({
    mutationFn: (commentaire) => api.post(`/inventaires/${id}/cloturer`, { commentaire: commentaire || null }).then((r) => r.data),
    onSuccess: () => { invalidate(); toast.success('Inventaire clôturé, écarts calculés.'); setClotureOpen(false); },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });
  const valider = useMutation({
    mutationFn: () => api.post(`/inventaires/${id}/valider`).then((r) => r.data),
    onSuccess: () => { invalidate(); toast.success('Inventaire validé, ajustements générés.'); setValiderOpen(false); },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });

  const categories = useMemo(() => {
    if (!inventaire) return [];
    const map = new Map();
    for (const l of inventaire.lignes) {
      if (l.produitCategorieId != null) map.set(l.produitCategorieId, l.produitCategorieNom);
    }
    return [...map.entries()].map(([cid, nom]) => ({ id: cid, nom }));
  }, [inventaire]);

  const lignesFiltrees = useMemo(() => {
    if (!inventaire) return [];
    return inventaire.lignes.filter((l) => {
      if (filtres.recherche && !l.produitNom.toLowerCase().includes(filtres.recherche.trim().toLowerCase())) return false;
      if (filtres.categorieId && String(l.produitCategorieId) !== String(filtres.categorieId)) return false;
      switch (filtres.etat) {
        case 'AVEC_STOCK': return Number(l.stockTheorique) > 0;
        case 'A_ZERO': return Number(l.stockTheorique) === 0;
        case 'COMPTES': return estCompte(l);
        case 'NON_COMPTES': return !estCompte(l);
        case 'AVEC_ECART': return ecartLigne(l) !== 0;
        default: return true;
      }
    });
  }, [inventaire, filtres]);

  if (isLoading) return <Loader />;
  if (isError) return <ErrorState message={apiErrorMessage(error)} onRetry={refetch} />;

  const statut = inventaire.statut;
  const enComptage = statut === 'EN_COMPTAGE';
  const modeComplet = inventaire.mode === 'COMPLET';
  const compteesCount = inventaire.lignes.filter(estCompte).length;
  const totalLignes = inventaire.lignes.length;
  const nonComptees = totalLignes - compteesCount;
  const toutesLignesComptees = nonComptees === 0;
  const bloqueParModeComplet = modeComplet && !toutesLignesComptees;
  const resume = resumerLignes(inventaire.lignes);

  function submitLigne(ligneId) {
    const valeur = saisie[ligneId];
    if (valeur === undefined || valeur === '') return;
    saisirLigne.mutate({ ligneId, stockPhysique: Number(valeur) });
  }

  async function exporter(format) {
    try {
      await downloadExport(`/inventaires/${id}/export`, { format }, `inventaire-${inventaire.numero}.${format === 'excel' ? 'xlsx' : 'pdf'}`);
    } catch (e) {
      toast.error(apiErrorMessage(e));
    }
  }

  function handleKeyDown(e, ligneId, idx) {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    submitLigne(ligneId);
    const next = inputRefs.current[idx + 1];
    if (next) next.focus();
  }

  return (
    <div>
      <Link to="/inventaires" className="inline-flex items-center gap-1 text-sm text-ink-light hover:text-ink mb-3">
        <ArrowLeft size={14} /> Retour aux inventaires
      </Link>

      <PageHeader
        title={inventaire.numero}
        subtitle={`${inventaire.etablissementNom} · ${formatDate(inventaire.dateInventaire)} · Mode ${modeComplet ? 'complet' : 'rapide'}`}
        actions={<>
          <StatusBadge status={statut} />
          <button className="btn-secondary" onClick={() => exporter('pdf')}><Download size={15} /> PDF</button>
          <button className="btn-secondary" onClick={() => exporter('excel')}><Download size={15} /> Excel</button>
          {statut === 'BROUILLON' && (
            <button className="btn-primary" onClick={() => demarrer.mutate()} disabled={demarrer.isPending}>
              <ClipboardCheck size={16} /> Démarrer le comptage
            </button>
          )}
          {statut === 'EN_COMPTAGE' && (
            <button className="btn-primary" onClick={() => { setCommentaireCloture(inventaire.commentaire || ''); setClotureOpen(true); }} disabled={bloqueParModeComplet}>
              <PackageCheck size={16} /> Clôturer l'inventaire
            </button>
          )}
          {statut === 'CLOTURE' && (
            <button className="btn-primary" onClick={() => setValiderOpen(true)}>
              <ShieldCheck size={16} /> Valider l'inventaire
            </button>
          )}
        </>}
      />

      {enComptage && (
        <div className="card p-4 mb-4">
          <div className="flex items-center justify-between mb-2 text-sm">
            <span className="font-semibold">{compteesCount} / {totalLignes} produits traités</span>
            <span className="text-ink-light">{resume.avecEcart} écart(s)</span>
          </div>
          <div className="h-2 rounded-full bg-black/5 dark:bg-white/10 overflow-hidden">
            <div className="h-full bg-bordeaux-500 transition-all" style={{ width: `${totalLignes ? (compteesCount / totalLignes) * 100 : 0}%` }} />
          </div>
          {bloqueParModeComplet && (
            <p className="text-xs text-warning mt-2">Mode complet : toutes les lignes doivent être comptées avant de pouvoir clôturer.</p>
          )}

          <div className="flex flex-wrap items-center gap-2 mt-4">
            <div className="relative flex-1 min-w-[180px]">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-light" />
              <input
                className="input pl-8"
                placeholder="Rechercher un produit..."
                value={filtres.recherche}
                onChange={(e) => setFiltres((f) => ({ ...f, recherche: e.target.value }))}
              />
            </div>
            <Select className="w-auto" value={filtres.categorieId} onChange={(e) => setFiltres((f) => ({ ...f, categorieId: e.target.value }))}>
              <option value="">Toutes les catégories</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.nom}</option>)}
            </Select>
            <Select className="w-auto" value={filtres.etat} onChange={(e) => setFiltres((f) => ({ ...f, etat: e.target.value }))}>
              {ETAT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </Select>
            <button
              type="button"
              className="btn-secondary"
              disabled={nonComptees === 0}
              onClick={() => setValiderLignesVidesMode('INCHANGEES')}
            >
              <CheckCheck size={15} /> Valider les stocks inchangés
            </button>
            <button
              type="button"
              className="btn-secondary"
              disabled={nonComptees === 0}
              onClick={() => setValiderLignesVidesMode('TOUT')}
            >
              <Zap size={15} /> Valider tout le théorique
            </button>
          </div>
        </div>
      )}

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-cream-100/70 dark:bg-white/5 text-left">
                <th className="px-4 py-2.5 text-[11px] font-bold uppercase tracking-wide text-ink-light">Produit</th>
                <th className="px-4 py-2.5 text-[11px] font-bold uppercase tracking-wide text-ink-light">Stock théorique</th>
                <th className="px-4 py-2.5 text-[11px] font-bold uppercase tracking-wide text-ink-light">Stock physique</th>
                {enComptage && <th className="px-4 py-2.5 text-[11px] font-bold uppercase tracking-wide text-ink-light">Écart</th>}
                {enComptage && <th className="px-4 py-2.5 text-[11px] font-bold uppercase tracking-wide text-ink-light">État</th>}
                {!enComptage && statut !== 'BROUILLON' && (
                  <>
                    <th className="px-4 py-2.5 text-[11px] font-bold uppercase tracking-wide text-ink-light">Écart quantité</th>
                    <th className="px-4 py-2.5 text-[11px] font-bold uppercase tracking-wide text-ink-light">Écart valeur</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {lignesFiltrees.map((l, idx) => {
                const ecartVif = enComptage ? ecartLigne(l) : null;
                return (
                  <tr key={l.id} className="border-t border-black/5 dark:border-white/5">
                    <td className="px-4 py-2.5">{l.produitNom}</td>
                    <td className="px-4 py-2.5">{l.stockTheorique}</td>
                    <td className="px-4 py-2.5">
                      {enComptage ? (
                        <input
                          ref={(el) => { inputRefs.current[idx] = el; }}
                          type="number" min="0" step="0.001" className="input w-28 py-1"
                          defaultValue={l.stockPhysique ?? ''}
                          onChange={(e) => setSaisie((s) => ({ ...s, [l.id]: e.target.value }))}
                          onBlur={() => submitLigne(l.id)}
                          onKeyDown={(e) => handleKeyDown(e, l.id, idx)}
                        />
                      ) : (l.stockPhysique ?? '—')}
                    </td>
                    {enComptage && (
                      <td className={`px-4 py-2.5 font-semibold ${ecartVif > 0 ? 'text-success' : ecartVif < 0 ? 'text-danger' : ''}`}>
                        {ecartVif > 0 ? `+${ecartVif}` : ecartVif}
                      </td>
                    )}
                    {enComptage && (
                      <td className="px-4 py-2.5">
                        {ecartVif === 0
                          ? <StatusBadge status="CONFORME" color="green" label="Conforme" />
                          : <StatusBadge status="ECART" color="orange" label="Écart" />}
                      </td>
                    )}
                    {!enComptage && statut !== 'BROUILLON' && (
                      <>
                        <td className={`px-4 py-2.5 font-semibold ${l.ecartQuantite > 0 ? 'text-success' : l.ecartQuantite < 0 ? 'text-danger' : ''}`}>
                          {l.ecartQuantite > 0 ? `+${l.ecartQuantite}` : l.ecartQuantite}
                        </td>
                        <td className="px-4 py-2.5">{l.ecartValeur != null ? formatFCFA(l.ecartValeur) : '—'}</td>
                      </>
                    )}
                  </tr>
                );
              })}
              {lignesFiltrees.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-6 text-center text-sm text-ink-light">Aucun produit ne correspond à ce filtre.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {inventaire.commentaire && (
        <p className="text-sm text-ink-light mt-3"><span className="font-semibold">Commentaire :</span> {inventaire.commentaire}</p>
      )}
      <p className="text-xs text-ink-light mt-2">
        Créé par {inventaire.auteurNom} le {formatDateTime(inventaire.dateCreation)}
        {inventaire.validateurNom && <> · Validé par {inventaire.validateurNom} le {formatDateTime(inventaire.dateValidation)}</>}
      </p>

      <Modal
        open={clotureOpen}
        onClose={() => setClotureOpen(false)}
        title="Clôturer l'inventaire"
        footer={<>
          <button className="btn-secondary" onClick={() => setClotureOpen(false)}>Annuler</button>
          <button className="btn-primary" onClick={() => cloturer.mutate(commentaireCloture)} disabled={cloturer.isPending}>Clôturer</button>
        </>}
      >
        <p className="text-sm text-ink-light mb-3">Les quantités retenues seront enregistrées (théorique pour toute ligne restée vide) et l'inventaire sera clôturé.</p>
        <div className="rounded-lg bg-cream-100 dark:bg-white/5 p-3 mb-3 text-sm grid grid-cols-2 gap-y-1.5">
          <span>Produits traités</span><span className="text-right font-semibold">{totalLignes} / {totalLignes}</span>
          <span>Produits conformes</span><span className="text-right font-semibold text-success">{resume.conformes}</span>
          <span>Produits avec écart</span><span className="text-right font-semibold">{resume.avecEcart}</span>
          <span>Écarts négatifs</span><span className="text-right font-semibold text-danger">{resume.ecartsNeg}</span>
          <span>Écarts positifs</span><span className="text-right font-semibold text-success">{resume.ecartsPos}</span>
        </div>
        <label className="label">Commentaire (justification des écarts)</label>
        <textarea className="input min-h-[80px]" value={commentaireCloture} onChange={(e) => setCommentaireCloture(e.target.value)} />
      </Modal>

      <ConfirmDialog
        open={validerLignesVidesMode === 'INCHANGEES'}
        onClose={() => setValiderLignesVidesMode(null)}
        onConfirm={() => validerLignesVides.mutate()}
        title="Valider les stocks inchangés"
        message={`${nonComptees} ligne(s) actuellement vide(s) seront considérées conformes au stock théorique. Vous pourrez toujours corriger une ligne ensuite.`}
        confirmLabel="Valider"
        loading={validerLignesVides.isPending}
      />
      <ConfirmDialog
        open={validerLignesVidesMode === 'TOUT'}
        onClose={() => setValiderLignesVidesMode(null)}
        onConfirm={() => validerLignesVides.mutate()}
        title="Valider tout le stock théorique"
        message={`Cette action applique le stock théorique à l'ensemble des ${nonComptees} ligne(s) restée(s) vide(s), sans distinction. À utiliser pour un inventaire entièrement rapide. Confirmez-vous ?`}
        confirmLabel="Valider tout"
        danger
        loading={validerLignesVides.isPending}
      />
      <ConfirmDialog
        open={validerOpen}
        onClose={() => setValiderOpen(false)}
        onConfirm={() => valider.mutate()}
        title="Valider l'inventaire"
        message="Cette action est irréversible : elle génère les mouvements d'ajustement de stock et fige définitivement l'inventaire (RG-086/RG-087)."
        confirmLabel="Valider définitivement"
        loading={valider.isPending}
      />
    </div>
  );
}
