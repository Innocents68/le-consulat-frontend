// Maps sidebar/route modules to the keys used in the droits matrix.
// GET /droits/matrice -> { [role]: { [moduleKey]: { voir, ajouter, modifier, supprimer } } }
// IMPORTANT: moduleKey must be the short slug the backend actually stores (see
// ModulesCatalogue.MODULES on the backend), NOT the French label — the matrix is keyed by
// slug. MODULE_LIST pairs each slug with its French label for display (Profils et droits screen).
export const MODULE_LIST = [
  { key: 'dashboard', label: 'Tableau de bord' },
  { key: 'ventes', label: 'Ventes / Caisse' },
  { key: 'factures', label: 'Factures' },
  { key: 'caisses', label: 'Gestion des caisses' },
  { key: 'remises', label: 'Remises et promotions' },
  { key: 'avoirs', label: 'Avoirs' },
  { key: 'tables', label: 'Gestion des tables' },
  { key: 'commandes-restaurant', label: 'Commandes restaurant' },
  { key: 'cuisine', label: 'Suivi cuisine' },
  { key: 'plats', label: 'Menus et tarifs' },
  { key: 'cave', label: 'Cave à vin' },
  { key: 'maquis', label: 'Maquis' },
  { key: 'stocks', label: 'Stocks et inventaire' },
  { key: 'entrees-stock', label: 'Entrées en stock' },
  { key: 'sorties-stock', label: 'Sorties de stock' },
  { key: 'finance', label: 'Financier' },
  { key: 'depenses', label: 'Dépenses' },
  { key: 'utilisateurs', label: 'Utilisateurs' },
  { key: 'profils', label: 'Profils et droits' },
  { key: 'journal', label: 'Journal des opérations' },
  { key: 'reporting', label: 'Reporting' },
  { key: 'parametres', label: 'Paramètres généraux' },
  { key: 'sauvegardes', label: 'Sauvegarde / Restauration' },
  { key: 'aide', label: 'Aide / Support' },
];

// { DASHBOARD: 'dashboard', VENTES_CAISSE: 'ventes', ... } — the actual slug each matrix
// entry is keyed by. Used throughout navConfig.js / Sidebar.jsx as the `module` passed to
// canView()/can(), so these MUST stay the backend slugs, never the French label.
export const MODULES = {
  DASHBOARD: 'dashboard',
  VENTES_CAISSE: 'ventes',
  FACTURES: 'factures',
  CAISSES: 'caisses',
  REMISES: 'remises',
  AVOIRS: 'avoirs',
  TABLES: 'tables',
  COMMANDES: 'commandes-restaurant',
  CUISINE: 'cuisine',
  MENUS: 'plats',
  CAVE: 'cave',
  MAQUIS: 'maquis',
  STOCKS: 'stocks',
  ENTREES_STOCK: 'entrees-stock',
  SORTIES_STOCK: 'sorties-stock',
  FINANCIER: 'finance',
  DEPENSES: 'depenses',
  UTILISATEURS: 'utilisateurs',
  PROFILS: 'profils',
  JOURNAL: 'journal',
  REPORTING: 'reporting',
  PARAMETRES: 'parametres',
  SAUVEGARDE: 'sauvegardes',
  AIDE: 'aide',
};

// slug -> French label, e.g. MODULE_LABEL['dashboard'] === 'Tableau de bord'.
export const MODULE_LABEL = Object.fromEntries(MODULE_LIST.map(({ key, label }) => [key, label]));

// The 4 profils of the application (cahier des charges — matrice des droits).
export const ROLES = [
  { value: 'ADMIN', label: 'Administrateur' },
  { value: 'GERANT', label: 'Gérant' },
  { value: 'CAISSIER_SERVEUR', label: 'Caissier / Serveur' },
  { value: 'CUISINIER', label: 'Cuisinier' },
];

export const ROLE_LABEL = Object.fromEntries(ROLES.map((r) => [r.value, r.label]));

// ADMIN and GERANT always see/do everything regardless of the matrix (fail-open for the
// two top roles so the app stays usable if the matrix endpoint is unavailable yet).
export const FULL_ACCESS_ROLES = ['ADMIN', 'GERANT'];

export function canView(matrix, role, moduleKey) {
  if (!role) return false;
  if (FULL_ACCESS_ROLES.includes(role)) return true;
  if (!matrix || !matrix[role]) return true; // fail-open when matrix not loaded yet
  const entry = matrix[role][moduleKey];
  if (!entry) return true; // module not restricted explicitly
  return !!entry.voir;
}

export function can(matrix, role, moduleKey, action) {
  if (!role) return false;
  if (FULL_ACCESS_ROLES.includes(role)) return true;
  if (!matrix || !matrix[role]) return true;
  const entry = matrix[role][moduleKey];
  if (!entry) return true;
  return !!entry[action];
}
