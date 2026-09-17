import {
  Users, ScrollText, Package, UtensilsCrossed, ShoppingCart, Receipt, ChefHat, Gift, Undo2, Truck,
  ArrowLeftRight, PackageSearch, ClipboardList, Wallet, Tags, LineChart, BarChart3, TrendingUp,
  Banknote, Boxes, PiggyBank, Settings, LifeBuoy, DatabaseBackup, Home, Wine, ArrowDownToLine, ArrowUpFromLine,
} from 'lucide-react';

// Arborescence imposée par menu_maquis_restaurant_cave.md (fourni par le client), dans son ordre
// exact : navigation organisée PAR ÉTABLISSEMENT (Restaurant/Cave à vin/Maquis, chacun avec ses
// propres Tables/Commandes/Menus/Factures/Remises/Avoirs) plutôt que la structure plate par module
// précédente. Un groupe/item porteur de `etablissementNom` ne s'affiche, pour un Gérant/Caissier,
// que si `user.etablissementNom` correspond — le Super Administrateur voit tout (Sidebar.jsx).
// « Performance des caisses » (Reporting) reste absent : aucune page ne existe encore (nécessite
// une session de caisse non construite, cf. Lot 5c). Les items « Stock X > Entrées/Sorties »
// sont des raccourcis pré-filtrés vers la page unique Mouvements de stock (Sidebar ne gère que 2
// niveaux de menu, pas 3) plutôt que des pages dédiées par établissement.
export const NAV_GROUPS = [
  { id: 'tableau-de-bord', label: 'Tableau de bord', icon: Home, to: '/tableau-de-bord' },
  {
    id: 'restaurant', label: 'Restaurant', icon: UtensilsCrossed, etablissementNom: 'Restaurant', items: [
      { label: 'Gestion des tables', icon: UtensilsCrossed, to: '/tables?etablissementId=2' },
      { label: 'Commandes restaurant', icon: ShoppingCart, to: '/commandes?etablissementId=2' },
      { label: 'Suivi cuisine', icon: ChefHat, to: '/suivi-cuisine' },
      { label: 'Produits (menus et tarifs)', icon: Package, to: '/produits?etablissementId=2' },
      { label: 'Factures', icon: Receipt, to: '/factures?etablissementId=2' },
      { label: 'Remises et promotions', icon: Gift, to: '/remises?etablissementId=2' },
      { label: 'Avoirs', icon: Undo2, to: '/avoirs?etablissementId=2' },
    ],
  },
  {
    id: 'cave', label: 'Cave à vin', icon: Wine, etablissementNom: 'Cave à vin', items: [
      { label: 'Gestion des tables', icon: UtensilsCrossed, to: '/tables?etablissementId=3' },
      { label: 'Commandes cave à vin', icon: ShoppingCart, to: '/commandes?etablissementId=3' },
      { label: 'Produits (menus et tarifs)', icon: Package, to: '/produits?etablissementId=3' },
      { label: 'Factures', icon: Receipt, to: '/factures?etablissementId=3' },
      { label: 'Remises et promotions', icon: Gift, to: '/remises?etablissementId=3' },
      { label: 'Avoirs', icon: Undo2, to: '/avoirs?etablissementId=3' },
    ],
  },
  {
    id: 'maquis', label: 'Maquis', icon: ChefHat, etablissementNom: 'Maquis', items: [
      { label: 'Gestion des tables', icon: UtensilsCrossed, to: '/tables?etablissementId=1' },
      { label: 'Commandes maquis', icon: ShoppingCart, to: '/commandes?etablissementId=1' },
      { label: 'Produits (menus et tarifs)', icon: Package, to: '/produits?etablissementId=1' },
      { label: 'Factures', icon: Receipt, to: '/factures?etablissementId=1' },
      { label: 'Remises et promotions', icon: Gift, to: '/remises?etablissementId=1' },
      { label: 'Avoirs', icon: Undo2, to: '/avoirs?etablissementId=1' },
    ],
  },
  {
    id: 'stocks', label: 'Stocks / Inventaire', icon: PackageSearch, items: [
      { label: 'Fournisseurs', icon: Truck, to: '/fournisseurs' },
      { label: 'Stock Restaurant — Entrées', icon: ArrowDownToLine, to: '/mouvements-stock?etablissementId=2&type=ENTREE', etablissementNom: 'Restaurant' },
      { label: 'Stock Restaurant — Sorties', icon: ArrowUpFromLine, to: '/mouvements-stock?etablissementId=2&type=SORTIE', etablissementNom: 'Restaurant' },
      { label: 'Stock Cave à vin — Entrées', icon: ArrowDownToLine, to: '/mouvements-stock?etablissementId=3&type=ENTREE', etablissementNom: 'Cave à vin' },
      { label: 'Stock Cave à vin — Sorties', icon: ArrowUpFromLine, to: '/mouvements-stock?etablissementId=3&type=SORTIE', etablissementNom: 'Cave à vin' },
      { label: 'Stock Maquis — Entrées', icon: ArrowDownToLine, to: '/mouvements-stock?etablissementId=1&type=ENTREE', etablissementNom: 'Maquis' },
      { label: 'Stock Maquis — Sorties', icon: ArrowUpFromLine, to: '/mouvements-stock?etablissementId=1&type=SORTIE', etablissementNom: 'Maquis' },
      { label: 'Inventaires', icon: ClipboardList, to: '/inventaires' },
      { label: 'Transferts', icon: ArrowLeftRight, to: '/transferts', superAdminOnly: true },
    ],
  },
  {
    id: 'financier', label: 'Financier', icon: Wallet, items: [
      { label: 'Gestion financière', icon: LineChart, to: '/gestion-financiere', superAdminOnly: true },
      { label: 'Dépenses', icon: Wallet, to: '/depenses' },
      { label: 'Catégories de dépenses', icon: Tags, to: '/categories-depenses', superAdminOnly: true },
    ],
  },
  {
    id: 'reporting', label: 'Reporting', icon: BarChart3, items: [
      { label: 'Dashboard reporting', icon: BarChart3, to: '/reporting/dashboard' },
      { label: 'Rapport des ventes', icon: TrendingUp, to: '/reporting/ventes' },
      { label: 'Rapport des stocks', icon: Boxes, to: '/reporting/stocks' },
      { label: 'Rapport des recettes', icon: Banknote, to: '/reporting/recettes' },
      { label: 'Rapport des bénéfices', icon: PiggyBank, to: '/reporting/benefices' },
    ],
  },
  {
    // Le groupe lui-même reste visible des deux profils : "Journal des opérations" l'est
    // (RG-099, un Gérant/Caissier voit les entrées de son établissement), seul l'item
    // "Utilisateurs" est réservé au Super Administrateur (matrice §3.3).
    id: 'utilisateurs-groupe', label: 'Utilisateurs', icon: Users, items: [
      { label: 'Utilisateurs', icon: Users, to: '/utilisateurs', superAdminOnly: true },
      { label: 'Journal des opérations', icon: ScrollText, to: '/journal-operations' },
    ],
  },
  {
    // Le groupe reste visible des deux profils : "Aide / Support" l'est (EF-046) — seuls
    // "Paramètres généraux" et "Sauvegarde/Restauration" sont réservés au Super Administrateur
    // (RG-105/106).
    id: 'parametres-groupe', label: 'Paramètres', icon: Settings, items: [
      { label: 'Paramètres généraux', icon: Settings, to: '/parametres', superAdminOnly: true },
      { label: 'Sauvegarde / Restauration', icon: DatabaseBackup, to: '/sauvegardes', superAdminOnly: true },
      { label: 'Aide / Support', icon: LifeBuoy, to: '/aide' },
    ],
  },
];

export function flattenNavLinks() {
  const links = [];
  for (const group of NAV_GROUPS) {
    if (group.items) {
      for (const item of group.items) links.push({ to: item.to });
    } else if (group.to) {
      links.push({ to: group.to });
    }
  }
  return links;
}
