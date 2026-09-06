import { Link } from 'react-router-dom';
import { CompassIcon } from 'lucide-react';

export default function NotFoundPage() {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <CompassIcon size={40} className="text-bordeaux-700 mb-4" />
      <h1 className="text-2xl font-extrabold text-ink dark:text-cream-100 mb-2">Page introuvable</h1>
      <p className="text-sm text-ink-light mb-4">Ce module n'existe pas ou a été déplacé.</p>
      <Link to="/dashboard" className="btn-primary">Retour au tableau de bord</Link>
    </div>
  );
}
