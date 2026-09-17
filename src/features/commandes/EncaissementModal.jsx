import { useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import api, { apiErrorMessage } from '../../lib/api';
import Modal from '../../components/ui/Modal';
import { Field, Select } from '../../components/ui/Field';
import { formatFCFA } from '../../lib/format';
import { useToast } from '../../components/ui/Toast';

const MODES = [
  { value: 'ESPECES', label: 'Espèces' },
  { value: 'MOBILE_MONEY', label: 'Mobile Money' },
  { value: 'CARTE', label: 'Carte bancaire' },
  { value: 'VIREMENT', label: 'Virement' },
  { value: 'AUTRE', label: 'Autre' },
];

/** Fenêtre d'encaissement (§6.2.4) — mode de paiement obligatoire (RG-047), montant reçu
 * exigé et vérifié pour un paiement en espèces (RG-048), monnaie calculée en direct (RG-023).
 * Recommandations et corrections.md §4 : un avoir existant peut être déduit du montant net
 * (vérifié par son numéro avant application), et la monnaie non rendue peut être convertie en
 * nouvel avoir client. */
export default function EncaissementModal({ commande, onClose, onEncaisse }) {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [mode, setMode] = useState('ESPECES');
  const [montantRecu, setMontantRecu] = useState('');
  const [avoirNumero, setAvoirNumero] = useState('');
  const [avoirVerifie, setAvoirVerifie] = useState(null); // { numero, soldeRestant } une fois vérifié
  const [avoirErreur, setAvoirErreur] = useState('');
  const [convertirMonnaieEnAvoir, setConvertirMonnaieEnAvoir] = useState(false);

  const montantNet = commande?.montantNet || 0;
  const montantAvoirApplique = avoirVerifie ? Math.min(avoirVerifie.soldeRestant, montantNet) : 0;
  const montantAPayer = Math.max(0, montantNet - montantAvoirApplique);

  const monnaie = useMemo(() => {
    if (mode !== 'ESPECES' || !montantRecu) return 0;
    return Math.max(0, Number(montantRecu) - montantAPayer);
  }, [mode, montantRecu, montantAPayer]);

  const verifierAvoir = useMutation({
    mutationFn: () => api.get(`/avoirs/numero/${encodeURIComponent(avoirNumero.trim())}`, {
      params: { etablissementId: commande.etablissementId },
    }).then((r) => r.data),
    onSuccess: (avoir) => { setAvoirVerifie({ numero: avoir.numero, soldeRestant: avoir.soldeRestant }); setAvoirErreur(''); },
    onError: (e) => { setAvoirVerifie(null); setAvoirErreur(apiErrorMessage(e)); },
  });

  function retirerAvoir() {
    setAvoirVerifie(null);
    setAvoirNumero('');
    setAvoirErreur('');
  }

  const encaisser = useMutation({
    mutationFn: () => api.post(`/commandes/${commande.id}/encaisser`, {
      modePaiement: mode,
      montantRecu: mode === 'ESPECES' && montantAPayer > 0 ? Number(montantRecu) : undefined,
      avoirNumero: avoirVerifie ? avoirVerifie.numero : undefined,
      montantConvertiEnAvoir: convertirMonnaieEnAvoir && monnaie > 0 ? monnaie : undefined,
    }).then((r) => r.data),
    onSuccess: (facture) => {
      queryClient.invalidateQueries({ queryKey: ['commandes'] });
      queryClient.invalidateQueries({ queryKey: ['tables-libres'] });
      queryClient.invalidateQueries({ queryKey: ['tables'] });
      queryClient.invalidateQueries({ queryKey: ['avoirs'] });
      const messageAvoir = convertirMonnaieEnAvoir && monnaie > 0
        ? ` Un avoir de ${formatFCFA(monnaie)} a été créé pour le client.`
        : '';
      toast.success(`Paiement validé — facture ${facture.numero}.${messageAvoir}`);
      onEncaisse(facture);
    },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });

  if (!commande) return null;

  const especesInsuffisant = mode === 'ESPECES' && montantAPayer > 0 && (!montantRecu || Number(montantRecu) < montantAPayer);

  return (
    <Modal
      open={!!commande}
      onClose={onClose}
      title={`Encaissement — commande ${commande.numero}`}
      footer={<>
        <button className="btn-secondary" onClick={onClose}>Annuler</button>
        <button className="btn-primary" onClick={() => encaisser.mutate()} disabled={especesInsuffisant || encaisser.isPending}>
          Valider le paiement
        </button>
      </>}
    >
      <div className="rounded-lg bg-cream-100 dark:bg-white/5 p-3 mb-4 text-sm space-y-1">
        <div className="flex justify-between"><span>Nombre d'articles</span><span>{commande.lignes?.length || 0}</span></div>
        <div className="flex justify-between"><span>Total brut</span><span>{formatFCFA(commande.montantBrut)}</span></div>
        {commande.remise > 0 && <div className="flex justify-between"><span>Remise</span><span>-{formatFCFA(commande.remise)}</span></div>}
        <div className="flex justify-between"><span>Total net</span><span>{formatFCFA(montantNet)}</span></div>
        {avoirVerifie && (
          <div className="flex justify-between text-success"><span>Avoir {avoirVerifie.numero}</span><span>-{formatFCFA(montantAvoirApplique)}</span></div>
        )}
        <div className="flex justify-between font-semibold text-base pt-1 border-t border-black/10"><span>Reste à payer</span><span>{formatFCFA(montantAPayer)}</span></div>
      </div>

      <Field label="Utiliser un avoir (optionnel)" hint="Numéro imprimé sur l'avoir remis au client.">
        {avoirVerifie ? (
          <div className="flex items-center justify-between rounded-lg border border-success/30 bg-success/10 px-3 py-2 text-sm">
            <span>{avoirVerifie.numero} — solde {formatFCFA(avoirVerifie.soldeRestant)}</span>
            <button type="button" className="btn-ghost p-1 text-danger" onClick={retirerAvoir}>Retirer</button>
          </div>
        ) : (
          <div className="flex gap-2">
            <input
              className="input"
              placeholder="Ex. AVO-2026-000123"
              value={avoirNumero}
              onChange={(e) => setAvoirNumero(e.target.value)}
            />
            <button
              type="button"
              className="btn-secondary shrink-0"
              disabled={!avoirNumero.trim() || verifierAvoir.isPending}
              onClick={() => verifierAvoir.mutate()}
            >
              Vérifier
            </button>
          </div>
        )}
        {avoirErreur && <p className="text-xs text-danger mt-1">{avoirErreur}</p>}
      </Field>

      <Field label="Mode de paiement" required>
        <Select value={mode} onChange={(e) => setMode(e.target.value)}>
          {MODES.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
        </Select>
      </Field>

      {mode === 'ESPECES' && montantAPayer > 0 && (
        <>
          <Field label="Montant reçu" required>
            <input type="number" min="0" className="input" value={montantRecu} onChange={(e) => setMontantRecu(e.target.value)} autoFocus />
          </Field>
          <div className="flex justify-between text-sm font-semibold mt-2">
            <span>Monnaie à rendre</span>
            <span>{formatFCFA(monnaie)}</span>
          </div>
          {monnaie > 0 && (
            <label className="flex items-center gap-2 text-sm mt-2">
              <input type="checkbox" checked={convertirMonnaieEnAvoir} onChange={(e) => setConvertirMonnaieEnAvoir(e.target.checked)} />
              Caisse sans monnaie — convertir {formatFCFA(monnaie)} en avoir client
            </label>
          )}
        </>
      )}
      {mode === 'ESPECES' && montantAPayer === 0 && (
        <p className="text-sm text-success">Intégralement couvert par l'avoir — aucun montant à encaisser.</p>
      )}
    </Modal>
  );
}
