import {
  LayoutDashboard, ShoppingCart, Receipt, CreditCard, Gift, Undo2,
  UtensilsCrossed, ClipboardList, ChefHat, BookOpenText, Wine, Beer,
  Boxes, PackagePlus, PackageMinus, Wallet, CircleDollarSign, Users,
  ShieldCheck, ScrollText, BarChart3, TrendingUp, PieChart, LineChart,
  Settings, DatabaseBackup, HelpCircle,
} from 'lucide-react';
import { MODULES } from '../lib/permissions';

// Mirrors the 27-item menu from the cahier des charges §3, grouped for a
// collapsible sidebar (as in the design reference). `module` keys are used
// for role-based visibility against the droits matrix.
export const NAV_GROUPS = [
  {
    id: 'dashboard',
    label: 'Tableau de bord',
    icon: LayoutDashboard,
    to: '/dashboard',
    module: MODULES.DASHBOARD,
  },
  {
    id: 'ventes',
    label: 'Ventes & Caisse',
    icon: ShoppingCart,
    module: MODULES.VENTES_CAISSE,
    items: [
      { label: 'Ventes / Caisse', to: '/ventes', icon: ShoppingCart, module: MODULES.VENTES_CAISSE },
      { label: 'Factures', to: '/factures', icon: Receipt, module: MODULES.FACTURES },
      { label: 'Gestion des caisses', to: '/caisses', icon: CreditCard, module: MODULES.CAISSES },
      { label: 'Remises et promotions', to: '/remises', icon: Gift, module: MODULES.REMISES },
      { label: 'Avoirs', to: '/avoirs', icon: Undo2, module: MODULES.AVOIRS },
    ],
  },
  {
    id: 'restaurant',
    label: 'Restaurant',
    icon: UtensilsCrossed,
    module: MODULES.TABLES,
    items: [
      { label: 'Gestion des tables', to: '/tables', icon: UtensilsCrossed, module: MODULES.TABLES },
      { label: 'Commandes restaurant', to: '/commandes-restaurant', icon: ClipboardList, module: MODULES.COMMANDES },
      { label: 'Suivi cuisine', to: '/suivi-cuisine', icon: ChefHat, module: MODULES.CUISINE },
      { label: 'Menus et tarifs', to: '/menus-tarifs', icon: BookOpenText, module: MODULES.MENUS },
    ],
  },
  {
    id: 'cave',
    label: 'Cave à vin',
    icon: Wine,
    to: '/cave-a-vin',
    module: MODULES.CAVE,
  },
  {
    id: 'maquis',
    label: 'Maquis',
    icon: Beer,
    to: '/maquis',
    module: MODULES.MAQUIS,
  },
  {
    id: 'stocks',
    label: 'Stocks',
    icon: Boxes,
    module: MODULES.STOCKS,
    items: [
      { label: 'Stocks et inventaire', to: '/stocks-inventaire', icon: Boxes, module: MODULES.STOCKS },
      { label: 'Entrées en stock', to: '/entrees-stock', icon: PackagePlus, module: MODULES.ENTREES_STOCK },
      { label: 'Sorties de stock', to: '/sorties-stock', icon: PackageMinus, module: MODULES.SORTIES_STOCK },
    ],
  },
  {
    id: 'financier',
    label: 'Financier',
    icon: Wallet,
    module: MODULES.FINANCIER,
    items: [
      { label: 'Gestion financière', to: '/financier', icon: Wallet, module: MODULES.FINANCIER },
      { label: 'Dépenses', to: '/depenses', icon: CircleDollarSign, module: MODULES.DEPENSES },
    ],
  },
  {
    id: 'utilisateurs',
    label: 'Utilisateurs',
    icon: Users,
    module: MODULES.UTILISATEURS,
    items: [
      { label: 'Utilisateurs', to: '/utilisateurs', icon: Users, module: MODULES.UTILISATEURS },
      { label: 'Profils et droits', to: '/profils-droits', icon: ShieldCheck, module: MODULES.PROFILS },
      { label: 'Journal des opérations', to: '/journal-operations', icon: ScrollText, module: MODULES.JOURNAL },
    ],
  },
  {
    id: 'reporting',
    label: 'Reporting',
    icon: BarChart3,
    module: MODULES.REPORTING,
    items: [
      { label: 'Dashboard reporting', to: '/reporting', icon: BarChart3, module: MODULES.REPORTING },
      { label: 'Rapport des ventes', to: '/reporting/ventes', icon: TrendingUp, module: MODULES.REPORTING },
      { label: 'Rapport des stocks', to: '/reporting/stocks', icon: PieChart, module: MODULES.REPORTING },
      { label: 'Rapport des recettes', to: '/reporting/recettes', icon: CircleDollarSign, module: MODULES.REPORTING },
      { label: 'Rapport des bénéfices', to: '/reporting/benefices', icon: LineChart, module: MODULES.REPORTING },
    ],
  },
  {
    id: 'parametres',
    label: 'Paramètres',
    icon: Settings,
    module: MODULES.PARAMETRES,
    items: [
      { label: 'Paramètres généraux', to: '/parametres', icon: Settings, module: MODULES.PARAMETRES },
      { label: 'Sauvegarde / Restauration', to: '/sauvegarde', icon: DatabaseBackup, module: MODULES.SAUVEGARDE },
      { label: 'Aide / Support', to: '/aide', icon: HelpCircle, module: MODULES.AIDE },
    ],
  },
];
