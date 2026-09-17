import { useEffect, useRef, useState } from 'react';
import QrScanner from 'qr-scanner';
// Chemin du worker requis par qr-scanner sous Vite (cf. README du paquet) — sans ça, le décodage
// tourne sur le thread principal ou échoue à charger le worker en production.
import QrScannerWorkerPath from 'qr-scanner/qr-scanner-worker.min.js?url';
import Modal from './Modal';

QrScanner.WORKER_PATH = QrScannerWorkerPath;

/** Recommandations et corrections.md §7 : scanner caméra réutilisable (Nouvelle commande,
 * Nouvelle entrée/sortie de stock). N'appelle {@code onScan} qu'une fois par ouverture — c'est
 * à l'appelant de fermer la modale (elle ne se ferme pas toute seule) après avoir traité le
 * résultat, pour pouvoir d'abord afficher une erreur si le code scanné n'est pas valide. */
export default function QrScannerModal({ open, onClose, onScan, title = 'Scanner un QR code' }) {
  const videoRef = useRef(null);
  const [erreur, setErreur] = useState('');

  useEffect(() => {
    if (!open || !videoRef.current) return undefined;
    setErreur('');
    let dejaScanne = false;
    const scanner = new QrScanner(
      videoRef.current,
      (result) => {
        if (dejaScanne) return;
        dejaScanne = true;
        onScan(result.data);
      },
      { highlightScanRegion: true, highlightCodeOutline: true, preferredCamera: 'environment' }
    );
    scanner.start().catch(() => setErreur("Impossible d'accéder à la caméra. Vérifiez les autorisations du navigateur."));
    return () => {
      scanner.stop();
      scanner.destroy();
    };
  }, [open, onScan]);

  return (
    <Modal open={open} onClose={onClose} title={title}>
      <div className="flex flex-col items-center gap-3">
        <video ref={videoRef} className="w-full max-w-sm rounded-lg bg-black aspect-square object-cover" muted playsInline />
        {erreur && <p className="text-sm text-danger">{erreur}</p>}
        <p className="text-xs text-ink-light">Visez le QR code du produit avec la caméra.</p>
      </div>
    </Modal>
  );
}
