// Deux profils fixes (cahier des charges RG-004b) : pas de matrice de droits à charger, la
// visibilité du menu se déduit directement du `profil` porté par l'utilisateur connecté.
export const PROFIL_LABEL = {
  SUPER_ADMINISTRATEUR: 'Super Administrateur',
  GERANT_CAISSIER: 'Gérant / Caissier',
};

export function isSuperAdmin(user) {
  return user?.profil === 'SUPER_ADMINISTRATEUR';
}
