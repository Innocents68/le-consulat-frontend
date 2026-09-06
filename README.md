# Le Consulat — Frontend

Interface de gestion (React 18 + Vite) pour l'établissement multi-activités
**Le Consulat** (restaurant, cave à vin, maquis, ventes au comptoir), conforme au
cahier des charges et à `API_CONTRACT.md` (source de vérité partagée avec le backend
Spring Boot).

## Démarrage

```bash
npm install
cp .env.example .env   # ajuster VITE_API_URL si besoin
npm run dev
```

L'application est servie sur `http://localhost:5173`. Elle attend le backend Spring
Boot sur `http://localhost:8080/api/v1` (voir `VITE_API_URL`). Si le backend n'est pas
démarré, chaque écran affiche un état de chargement/erreur propre au lieu de planter.

```bash
npm run build     # build de production dans dist/
npm run preview   # sert le build de production localement
```

## Variables d'environnement

| Variable | Défaut | Description |
|---|---|---|
| `VITE_API_URL` | `http://localhost:8080/api/v1` | Base URL de l'API REST Spring Boot |

## Comptes de démonstration (seed backend, §9 du contrat)

Mot de passe unique : `password123`

| Identifiant | Rôle |
|---|---|
| `admin` | Administrateur (ADMIN) |
| `jean` | Caissier |
| `mariam` | Serveuse |
| `paul` | Manager |
| `sophie` | Comptable |

La page de connexion propose des raccourcis pour remplir ces comptes.

## Stack technique

- **React 18** + **Vite** (JavaScript)
- **React Router v6** — routes protégées (`ProtectedRoute`) + visibilité du menu par rôle
- **Tailwind CSS** — palette bordeaux / crème / or définie dans `tailwind.config.js`
- **Zustand** (+ `persist`) — session utilisateur (`authStore`) et préférences UI (`appStore`: mode sombre, sidebar réduite)
- **@tanstack/react-query** — tous les appels serveur (lecture + mutations), avec gestion d'erreur uniforme
- **Axios** — instance unique avec intercepteur JWT (`Authorization: Bearer <token>`) et redirection vers `/login` sur 401
- **Recharts** — graphiques (courbes, barres, donuts) stylés à la charte
- **lucide-react** — icônes
- **@stomp/stompjs` + `sockjs-client`** — WebSocket STOMP sur `/ws` (topics `/topic/commandes`, `/topic/tables`, `/topic/cuisine`) avec repli automatique sur du polling REST (5s) si la connexion échoue — voir `src/lib/ws.js` et `src/hooks/useLiveTopic.js`

## Structure

```
src/
  lib/            api.js (axios + JWT), format.js, permissions.js, ws.js
  store/          authStore.js (session), appStore.js (thème, sidebar)
  hooks/          useTableState, useResource (CRUD générique), usePermissions, useLiveTopic
  layout/         Sidebar (27 items groupés), Topbar, AppLayout, navConfig.js
  components/ui/  DataTable, Modal, Drawer, StatCard, StatusBadge, Charts, Toast, ConfirmDialog...
  components/crud/SimpleCrudPage.jsx   page CRUD générique (catégories, remises...)
  features/<module>/   un dossier par module métier (voir ci-dessous)
  pages/          Login.jsx, NotFoundPage.jsx
  routes.jsx      configuration des routes (lazy-loaded)
```

## Carte des modules (menu latéral, 27 entrées du cahier des charges)

| Groupe sidebar | Écrans | Endpoints principaux |
|---|---|---|
| Tableau de bord | Dashboard complet (KPI, courbes, donut, alertes, activité, top produits, caisse, météo) | `/dashboard/summary` |
| Ventes & Caisse | Ventes/Caisse (POS + panier), Factures, Gestion des caisses, Remises, Avoirs | `/ventes`, `/sessions-caisse`, `/factures`, `/remises`, `/avoirs` |
| Restaurant | Tables (plan de salle temps réel), Commandes, Suivi cuisine (Kanban), Menus/tarifs | `/tables`, `/commandes-restaurant`, `/plats`, `/categories-plats`, WS `/topic/tables` `/topic/cuisine` |
| Cave à vin | Références, stock, historique des mouvements | `/boissons`, `/mouvements-cave`, `/fournisseurs` |
| Maquis | Commandes bar/grillades | `/commandes-maquis` |
| Stocks | Produits + KPIs + inventaires | `/produits`, `/categories-produits`, `/inventaires`, `/depots` |
| — | Entrées en stock, Sorties de stock | `/entrees-stock`, `/sorties-stock` |
| Financier | Vue d'ensemble, Recettes, Dépenses | `/finance/vue-ensemble`, `/recettes`, `/depenses` |
| Utilisateurs | Comptes, Profils/droits (matrice éditable), Journal (lecture seule) | `/utilisateurs`, `/droits/matrice`, `/journal-operations` |
| Reporting | Dashboard reporting + 4 rapports détaillés avec export PDF/Excel | `/reporting/ventes|stocks|recettes-depenses|benefices` + `/export` |
| Paramètres | Paramètres généraux, Sauvegarde/Restauration, Aide/FAQ | `/parametres`, `/sauvegardes`, `/aide/faq` |

Les modules cœurs (Tableau de bord, Ventes/Caisse, Tables, Suivi cuisine, Cave à vin,
Stocks, Financier, Utilisateurs) sont les plus complets (formulaires de création/édition,
actions métier — encaissement, clôture de caisse, validation d'entrée/sortie de stock,
envoi en cuisine...). Les modules secondaires (catégories, fournisseurs, dépôts...)
utilisent un composant CRUD générique (`SimpleCrudPage`) pour rester cohérents et
rapides à maintenir.

## Simplifications assumées

- Les formes de réponse des 4 endpoints `/reporting/*` ne sont pas détaillées champ par
  champ dans `API_CONTRACT.md` : le frontend lit les champs les plus probables avec des
  alias de repli (`??`) pour rester robuste si le backend nomme légèrement différemment,
  sans jamais planter (état vide affiché si un champ attendu est absent).
- Le composant "Météo locale" du tableau de bord est un widget décoratif statique
  (aucun endpoint météo n'est prévu au contrat).
- La matrice des droits (`/droits/matrice`) utilise les libellés de modules affichés à
  l'écran comme clés ; les rôles `ADMIN` et `GERANT` sont toujours autorisés côté
  frontend (fail-open) pour rester utilisables même si l'endpoint n'est pas encore
  branché côté backend.
- Le mode sombre est une implémentation Tailwind `dark:` fonctionnelle sur l'ensemble
  des écrans, sans recherche de pixel-perfect sur les graphiques.
- L'inventaire (module Stocks) attend que le backend renvoie déjà les lignes théoriques
  à la création (`POST /inventaires`) ; l'écran permet de saisir le comptage réel et de
  valider.

## Backend attendu

Voir `../API_CONTRACT.md` à la racine du projet — c'est la spécification faisant foi
pour les deux projets développés en parallèle.
