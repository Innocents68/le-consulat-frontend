import { Link } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';

export default function AccessDeniedPage() {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <ShieldAlert size={40} className="text-bordeaux-700 mb-4" />
      <h1 className="text-2xl font-extrabold text-ink dark:text-cream-100 mb-2">Accès refusé</h1>
      <p className="text-sm text-ink-light mb-4">Votre rôle ne vous donne pas accès à cette page.</p>
      <Link to="/" className="btn-primary">Retour à l'accueil</Link>
    </div>
  );
}
