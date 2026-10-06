import { useEffect, useRef, useState } from 'react';
import { BrowserMultiFormatReader } from '@zxing/browser';
import Modal from './Modal';

/** Scanner caméra réutilisable (Nouvelle commande, Nouvelle entrée/sortie de stock) — lit à la
 * fois un QR code interne ET un code-barres linéaire (EAN-13 du fabricant, Code128 généré),
 * via ZXing plutôt qu'un décodeur QR-only : un seul scanner pour les deux besoins, le backend
 * (`/produits/scanner`) décide ensuite lequel des deux formats a été lu. N'appelle {@code onScan}
 * qu'une fois par ouverture — c'est à l'appelant de fermer la modale (elle ne se ferme pas toute
 * seule) après avoir traité le résultat, pour pouvoir d'abord afficher une erreur si le code
 * scanné n'est pas reconnu. */
export default function QrScannerModal({ open, onClose, onScan, title = 'Scanner un QR code ou un code-barres' }) {
  const videoRef = useRef(null);
  const [erreur, setErreur] = useState('');

  useEffect(() => {
    if (!open || !videoRef.current) return undefined;
    setErreur('');
    let dejaScanne = false;
    const reader = new BrowserMultiFormatReader();
    const controls = { current: null };

    reader.decodeFromConstraints(
      { video: { facingMode: 'environment' } },
      videoRef.current,
      (result) => {
        if (result && !dejaScanne) {
          dejaScanne = true;
          onScan(result.getText());
        }
      }
    ).then((c) => { controls.current = c; }).catch(() => setErreur("Impossible d'accéder à la caméra. Vérifiez les autorisations du navigateur."));

    return () => controls.current?.stop();
  }, [open, onScan]);

  return (
    <Modal open={open} onClose={onClose} title={title}>
      <div className="flex flex-col items-center gap-3">
        <video ref={videoRef} className="w-full max-w-sm rounded-lg bg-black aspect-square object-cover" muted playsInline />
        {erreur && <p className="text-sm text-danger">{erreur}</p>}
        <p className="text-xs text-ink-light">Visez le QR code ou le code-barres du produit avec la caméra.</p>
      </div>
    </Modal>
  );
}
