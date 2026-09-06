import { lazy, Suspense } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import AppLayout from './layout/AppLayout';
import ProtectedRoute from './routes/ProtectedRoute';
import Login from './pages/Login';
import { Loader } from './components/ui/Feedback';

const DashboardPage = lazy(() => import('./features/dashboard/DashboardPage'));
const VentesCaissePage = lazy(() => import('./features/ventes-caisse/VentesCaissePage'));
const FacturesPage = lazy(() => import('./features/factures/FacturesPage'));
const CaissesPage = lazy(() => import('./features/caisses/CaissesPage'));
const RemisesPage = lazy(() => import('./features/remises/RemisesPage'));
const AvoirsPage = lazy(() => import('./features/avoirs/AvoirsPage'));
const TablesPage = lazy(() => import('./features/tables/TablesPage'));
const CommandesRestaurantPage = lazy(() => import('./features/commandes-restaurant/CommandesRestaurantPage'));
const SuiviCuisinePage = lazy(() => import('./features/suivi-cuisine/SuiviCuisinePage'));
const MenusTarifsPage = lazy(() => import('./features/menus-tarifs/MenusTarifsPage'));
const CaveAVinPage = lazy(() => import('./features/cave-a-vin/CaveAVinPage'));
const MaquisPage = lazy(() => import('./features/maquis/MaquisPage'));
const StocksInventairePage = lazy(() => import('./features/stocks-inventaire/StocksInventairePage'));
const EntreesStockPage = lazy(() => import('./features/entrees-stock/EntreesStockPage'));
const SortiesStockPage = lazy(() => import('./features/sorties-stock/SortiesStockPage'));
const FinancierPage = lazy(() => import('./features/financier/FinancierPage'));
const DepensesPage = lazy(() => import('./features/depenses/DepensesPage'));
const UtilisateursPage = lazy(() => import('./features/utilisateurs/UtilisateursPage'));
const ProfilsDroitsPage = lazy(() => import('./features/profils-droits/ProfilsDroitsPage'));
const JournalOperationsPage = lazy(() => import('./features/journal-operations/JournalOperationsPage'));
const ReportingDashboardPage = lazy(() => import('./features/reporting/ReportingDashboardPage'));
const RapportVentesPage = lazy(() => import('./features/reporting/RapportVentesPage'));
const RapportStocksPage = lazy(() => import('./features/reporting/RapportStocksPage'));
const RapportRecettesPage = lazy(() => import('./features/reporting/RapportRecettesPage'));
const RapportBeneficesPage = lazy(() => import('./features/reporting/RapportBeneficesPage'));
const ParametresPage = lazy(() => import('./features/parametres/ParametresPage'));
const SauvegardePage = lazy(() => import('./features/sauvegarde/SauvegardePage'));
const AidePage = lazy(() => import('./features/aide/AidePage'));
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
      { index: true, element: <Navigate to="/dashboard" replace /> },
      { path: 'dashboard', element: withSuspense(<DashboardPage />) },
      { path: 'ventes', element: withSuspense(<VentesCaissePage />) },
      { path: 'factures', element: withSuspense(<FacturesPage />) },
      { path: 'caisses', element: withSuspense(<CaissesPage />) },
      { path: 'remises', element: withSuspense(<RemisesPage />) },
      { path: 'avoirs', element: withSuspense(<AvoirsPage />) },
      { path: 'tables', element: withSuspense(<TablesPage />) },
      { path: 'commandes-restaurant', element: withSuspense(<CommandesRestaurantPage />) },
      { path: 'suivi-cuisine', element: withSuspense(<SuiviCuisinePage />) },
      { path: 'menus-tarifs', element: withSuspense(<MenusTarifsPage />) },
      { path: 'cave-a-vin', element: withSuspense(<CaveAVinPage />) },
      { path: 'maquis', element: withSuspense(<MaquisPage />) },
      { path: 'stocks-inventaire', element: withSuspense(<StocksInventairePage />) },
      { path: 'entrees-stock', element: withSuspense(<EntreesStockPage />) },
      { path: 'sorties-stock', element: withSuspense(<SortiesStockPage />) },
      { path: 'financier', element: withSuspense(<FinancierPage />) },
      { path: 'depenses', element: withSuspense(<DepensesPage />) },
      { path: 'utilisateurs', element: withSuspense(<UtilisateursPage />) },
      { path: 'profils-droits', element: withSuspense(<ProfilsDroitsPage />) },
      { path: 'journal-operations', element: withSuspense(<JournalOperationsPage />) },
      { path: 'reporting', element: withSuspense(<ReportingDashboardPage />) },
      { path: 'reporting/ventes', element: withSuspense(<RapportVentesPage />) },
      { path: 'reporting/stocks', element: withSuspense(<RapportStocksPage />) },
      { path: 'reporting/recettes', element: withSuspense(<RapportRecettesPage />) },
      { path: 'reporting/benefices', element: withSuspense(<RapportBeneficesPage />) },
      { path: 'parametres', element: withSuspense(<ParametresPage />) },
      { path: 'sauvegarde', element: withSuspense(<SauvegardePage />) },
      { path: 'aide', element: withSuspense(<AidePage />) },
      { path: '*', element: withSuspense(<NotFoundPage />) },
    ],
  },
  { path: '*', element: <Navigate to="/dashboard" replace /> },
]);
