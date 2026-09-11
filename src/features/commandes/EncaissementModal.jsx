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
 * exigé et vérifié pour un paiement en espèces (RG-048), monnaie calculée en direct (RG-023). */
export default function EncaissementModal({ commande, onClose, onEncaisse }) {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [mode, setMode] = useState('ESPECES');
  const [montantRecu, setMontantRecu] = useState('');

  const montantNet = commande?.montantNet || 0;
  const monnaie = useMemo(() => {
    if (mode !== 'ESPECES' || !montantRecu) return 0;
    return Math.max(0, Number(montantRecu) - montantNet);
  }, [mode, montantRecu, montantNet]);

  const encaisser = useMutation({
    mutationFn: () => api.post(`/commandes/${commande.id}/encaisser`, {
      modePaiement: mode,
      montantRecu: mode === 'ESPECES' ? Number(montantRecu) : undefined,
    }).then((r) => r.data),
    onSuccess: (facture) => {
      queryClient.invalidateQueries({ queryKey: ['commandes'] });
      queryClient.invalidateQueries({ queryKey: ['tables-libres'] });
      toast.success(`Paiement validé — facture ${facture.numero}.`);
      onEncaisse(facture);
    },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });

  if (!commande) return null;

  const especesInsuffisant = mode === 'ESPECES' && (!montantRecu || Number(montantRecu) < montantNet);

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
        <div className="flex justify-between font-semibold text-base pt-1 border-t border-black/10"><span>Total net à payer</span><span>{formatFCFA(montantNet)}</span></div>
      </div>

      <Field label="Mode de paiement" required>
        <Select value={mode} onChange={(e) => setMode(e.target.value)}>
          {MODES.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
        </Select>
      </Field>

      {mode === 'ESPECES' && (
        <>
          <Field label="Montant reçu" required>
            <input type="number" min="0" className="input" value={montantRecu} onChange={(e) => setMontantRecu(e.target.value)} autoFocus />
          </Field>
          <div className="flex justify-between text-sm font-semibold mt-2">
            <span>Monnaie à rendre</span>
            <span>{formatFCFA(monnaie)}</span>
          </div>
        </>
      )}
    </Modal>
  );
}
