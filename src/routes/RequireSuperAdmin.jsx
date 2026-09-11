import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { isSuperAdmin } from '../lib/perimetre';

// Bloque la navigation directe par URL vers une page réservée au Super Administrateur
// (le menu masque déjà le lien, mais ça n'empêche pas une saisie d'URL directe — EF-002).
export default function RequireSuperAdmin({ children }) {
  const user = useAuthStore((s) => s.user);

  if (!isSuperAdmin(user)) {
    return <Navigate to="/acces-refuse" replace />;
  }
  return children;
}
