import { lazy, Suspense } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import AppLayout from './layout/AppLayout';
import ProtectedRoute from './routes/ProtectedRoute';
import RequireSuperAdmin from './routes/RequireSuperAdmin';
import Login from './pages/Login';
import { Loader } from './components/ui/Feedback';

const TableauDeBordPage = lazy(() => import('./features/tableau-de-bord/TableauDeBordPage'));
const UtilisateursPage = lazy(() => import('./features/utilisateurs/UtilisateursPage'));
const JournalOperationsPage = lazy(() => import('./features/journal-operations/JournalOperationsPage'));
const ProduitsPage = lazy(() => import('./features/produits/ProduitsPage'));
const TablesPage = lazy(() => import('./features/tables/TablesPage'));
const CommandesPage = lazy(() => import('./features/commandes/CommandesPage'));
const FacturesPage = lazy(() => import('./features/factures/FacturesPage'));
const SuiviCuisinePage = lazy(() => import('./features/suivi-cuisine/SuiviCuisinePage'));
const RemisesPage = lazy(() => import('./features/remises/RemisesPage'));
const AvoirsPage = lazy(() => import('./features/avoirs/AvoirsPage'));
const FournisseursPage = lazy(() => import('./features/fournisseurs/FournisseursPage'));
const MouvementsStockPage = lazy(() => import('./features/stocks/MouvementsStockPage'));
const TransfertsPage = lazy(() => import('./features/stocks/TransfertsPage'));
const InventairesPage = lazy(() => import('./features/inventaires/InventairesPage'));
const InventaireDetailPage = lazy(() => import('./features/inventaires/InventaireDetailPage'));
const DepensesPage = lazy(() => import('./features/depenses/DepensesPage'));
const CategoriesDepensesPage = lazy(() => import('./features/depenses/CategoriesDepensesPage'));
const GestionFinancierePage = lazy(() => import('./features/financier/GestionFinancierePage'));
const DashboardReportingPage = lazy(() => import('./features/reporting/DashboardReportingPage'));
const RapportVentesPage = lazy(() => import('./features/reporting/RapportVentesPage'));
const RapportRecettesPage = lazy(() => import('./features/reporting/RapportRecettesPage'));
const RapportStocksPage = lazy(() => import('./features/reporting/RapportStocksPage'));
const RapportBeneficesPage = lazy(() => import('./features/reporting/RapportBeneficesPage'));
const ParametresPage = lazy(() => import('./features/parametres/ParametresPage'));
const SauvegardesPage = lazy(() => import('./features/sauvegardes/SauvegardesPage'));
const AidePage = lazy(() => import('./features/aide/AidePage'));
const AccessDeniedPage = lazy(() => import('./pages/AccessDeniedPage'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));

function withSuspense(element) {
  return <Suspense fallback={<Loader />}>{element}</Suspense>;
}

export const router = createBrowserRouter([
  { path: '/login', element: <Login /> },
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <AppLayout />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: withSuspense(<TableauDeBordPage />) },
      { path: 'tableau-de-bord', element: withSuspense(<TableauDeBordPage />) },
      { path: 'reporting/dashboard', element: withSuspense(<DashboardReportingPage />) },
      { path: 'reporting/ventes', element: withSuspense(<RapportVentesPage />) },
      { path: 'reporting/recettes', element: withSuspense(<RapportRecettesPage />) },
      { path: 'reporting/stocks', element: withSuspense(<RapportStocksPage />) },
      { path: 'reporting/benefices', element: withSuspense(<RapportBeneficesPage />) },
      { path: 'commandes', element: withSuspense(<CommandesPage />) },
      { path: 'factures', element: withSuspense(<FacturesPage />) },
      { path: 'suivi-cuisine', element: withSuspense(<SuiviCuisinePage />) },
      { path: 'remises', element: withSuspense(<RemisesPage />) },
      { path: 'avoirs', element: withSuspense(<AvoirsPage />) },
      { path: 'produits', element: withSuspense(<ProduitsPage />) },
      { path: 'fournisseurs', element: withSuspense(<FournisseursPage />) },
      { path: 'mouvements-stock', element: withSuspense(<MouvementsStockPage />) },
      { path: 'inventaires', element: withSuspense(<InventairesPage />) },
      { path: 'inventaires/:id', element: withSuspense(<InventaireDetailPage />) },
      { path: 'transferts', element: withSuspense(<RequireSuperAdmin><TransfertsPage /></RequireSuperAdmin>) },
      { path: 'tables', element: withSuspense(<TablesPage />) },
      { path: 'depenses', element: withSuspense(<DepensesPage />) },
      { path: 'categories-depenses', element: withSuspense(<RequireSuperAdmin><CategoriesDepensesPage /></RequireSuperAdmin>) },
      { path: 'gestion-financiere', element: withSuspense(<RequireSuperAdmin><GestionFinancierePage /></RequireSuperAdmin>) },
      { path: 'utilisateurs', element: withSuspense(<RequireSuperAdmin><UtilisateursPage /></RequireSuperAdmin>) },
      { path: 'journal-operations', element: withSuspense(<JournalOperationsPage />) },
      { path: 'parametres', element: withSuspense(<RequireSuperAdmin><ParametresPage /></RequireSuperAdmin>) },
      { path: 'sauvegardes', element: withSuspense(<RequireSuperAdmin><SauvegardesPage /></RequireSuperAdmin>) },
      { path: 'aide', element: withSuspense(<AidePage />) },
      { path: 'acces-refuse', element: withSuspense(<AccessDeniedPage />) },
      { path: '*', element: withSuspense(<NotFoundPage />) },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
]);
