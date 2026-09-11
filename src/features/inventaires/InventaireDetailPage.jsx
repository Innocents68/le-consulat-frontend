import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, ClipboardCheck, PackageCheck, ShieldCheck } from 'lucide-react';
import api, { apiErrorMessage } from '../../lib/api';
import Modal from '../../components/ui/Modal';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import PageHeader from '../../components/ui/PageHeader';
import StatusBadge from '../../components/ui/StatusBadge';
import { Loader, ErrorState } from '../../components/ui/Feedback';
import { formatDate, formatDateTime, formatFCFA } from '../../lib/format';
import { useToast } from '../../components/ui/Toast';

/** Détail + cycle de vie d'un inventaire (§6.6.5) : Brouillon -> En comptage -> Clôturé -> Validé.
 * Chaque transition passe par une action explicite, jamais un saut arbitraire (RG-087). */
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

  if (isLoading) return <Loader />;
  if (isError) return <ErrorState message={apiErrorMessage(error)} onRetry={refetch} />;

  const statut = inventaire.statut;
  const enComptage = statut === 'EN_COMPTAGE';
  const toutesLignesComptees = inventaire.lignes.every((l) => l.stockPhysique !== null && l.stockPhysique !== undefined);

  function submitLigne(ligneId) {
    const valeur = saisie[ligneId];
    if (valeur === undefined || valeur === '') return;
    saisirLigne.mutate({ ligneId, stockPhysique: Number(valeur) });
  }

  return (
    <div>
      <Link to="/inventaires" className="inline-flex items-center gap-1 text-sm text-ink-light hover:text-ink mb-3">
        <ArrowLeft size={14} /> Retour aux inventaires
      </Link>

      <PageHeader
        title={inventaire.numero}
        subtitle={`${inventaire.etablissementNom} · ${formatDate(inventaire.dateInventaire)}`}
        actions={<>
          <StatusBadge status={statut} />
          {statut === 'BROUILLON' && (
            <button className="btn-primary" onClick={() => demarrer.mutate()} disabled={demarrer.isPending}>
              <ClipboardCheck size={16} /> Démarrer le comptage
            </button>
          )}
          {statut === 'EN_COMPTAGE' && (
            <button className="btn-primary" onClick={() => { setCommentaireCloture(inventaire.commentaire || ''); setClotureOpen(true); }} disabled={!toutesLignesComptees}>
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

      {statut === 'EN_COMPTAGE' && !toutesLignesComptees && (
        <p className="text-xs text-warning mb-3">Toutes les lignes doivent être comptées avant de pouvoir clôturer.</p>
      )}

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-cream-100/70 dark:bg-white/5 text-left">
                <th className="px-4 py-2.5 text-[11px] font-bold uppercase tracking-wide text-ink-light">Produit</th>
                <th className="px-4 py-2.5 text-[11px] font-bold uppercase tracking-wide text-ink-light">Stock théorique</th>
                <th className="px-4 py-2.5 text-[11px] font-bold uppercase tracking-wide text-ink-light">Stock physique</th>
                {statut !== 'BROUILLON' && statut !== 'EN_COMPTAGE' && (
                  <>
                    <th className="px-4 py-2.5 text-[11px] font-bold uppercase tracking-wide text-ink-light">Écart quantité</th>
                    <th className="px-4 py-2.5 text-[11px] font-bold uppercase tracking-wide text-ink-light">Écart valeur</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {inventaire.lignes.map((l) => (
                <tr key={l.id} className="border-t border-black/5 dark:border-white/5">
                  <td className="px-4 py-2.5">{l.produitNom}</td>
                  <td className="px-4 py-2.5">{l.stockTheorique}</td>
                  <td className="px-4 py-2.5">
                    {enComptage ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="number" min="0" step="0.001" className="input w-28 py-1"
                          defaultValue={l.stockPhysique ?? ''}
                          onChange={(e) => setSaisie((s) => ({ ...s, [l.id]: e.target.value }))}
                          onBlur={() => submitLigne(l.id)}
                        />
                      </div>
                    ) : (l.stockPhysique ?? '—')}
                  </td>
                  {statut !== 'BROUILLON' && statut !== 'EN_COMPTAGE' && (
                    <>
                      <td className={`px-4 py-2.5 font-semibold ${l.ecartQuantite > 0 ? 'text-success' : l.ecartQuantite < 0 ? 'text-danger' : ''}`}>
                        {l.ecartQuantite > 0 ? `+${l.ecartQuantite}` : l.ecartQuantite}
                      </td>
                      <td className="px-4 py-2.5">{l.ecartValeur != null ? formatFCFA(l.ecartValeur) : '—'}</td>
                    </>
                  )}
                </tr>
              ))}
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
        <p className="text-sm text-ink-light mb-3">Les écarts seront calculés et les lignes figées. Vous pourrez ensuite valider l'inventaire pour générer les ajustements de stock.</p>
        <label className="label">Commentaire (justification des écarts)</label>
        <textarea className="input min-h-[80px]" value={commentaireCloture} onChange={(e) => setCommentaireCloture(e.target.value)} />
      </Modal>

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
