import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Minus, QrCode, Pencil, Power } from 'lucide-react';
import api, { apiErrorMessage } from '../../lib/api';
import DataTable from '../../components/ui/DataTable';
import Modal from '../../components/ui/Modal';
import QrScannerModal from '../../components/ui/QrScannerModal';
import PageHeader from '../../components/ui/PageHeader';
import { Field, Select } from '../../components/ui/Field';
import ProduitFormModal from '../produits/ProduitFormModal';
import { useTableState } from '../../hooks/useTableState';
import { useListQuery } from '../../hooks/useResource';
import { formatDateTime } from '../../lib/format';
import { useToast } from '../../components/ui/Toast';
import { useAuthStore } from '../../store/authStore';
import { isSuperAdmin } from '../../lib/perimetre';

const TYPE_LABEL = {
  ENTREE: 'Entrée',
  SORTIE: 'Sortie manuelle',
  SORTIE_VENTE: 'Sortie (vente)',
  RETOUR_AVOIR: 'Retour (avoir)',
  TRANSFERT_SORTANT: 'Transfert sortant',
  TRANSFERT_ENTRANT: 'Transfert entrant',
  AJUSTEMENT_INVENTAIRE: 'Ajustement inventaire',
};

const EMPTY_SORTIE = { produitId: '', quantite: '', motif: '' };

/** §6.6.2 : historique des mouvements, "Stock actuel" (RUD produit) et sortie manuelle. Les
 * mouvements SORTIE_VENTE/RETOUR_AVOIR/TRANSFERT_* sont générés automatiquement ailleurs
 * (RG-031/RG-062/RG-084) et n'apparaissent ici qu'en lecture.
 * Retour utilisateur (2026-09-18) : augmenter le stock d'un produit EXISTANT se fait désormais
 * via "Modifier" (ProduitFormModal, champ "Quantité à ajouter") plutôt que via "Nouvelle entrée" —
 * ce bouton ouvre maintenant la création d'un nouveau produit. Réduire reste exclusivement via
 * "Nouvelle sortie" (motif obligatoire, RG-081). */
export default function MouvementsStockPage() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const superAdmin = isSuperAdmin(user);
  const location = useLocation();

  const table = useTableState({ initialSize: 10, extraFilters: { etablissementId: '', produitId: '', type: '' } });
  // Un raccourci du menu (Stock Restaurant/Cave à vin/Maquis) pointe vers cette même route en ne
  // changeant que le paramètre d'URL — React Router ne redémarre pas le composant dans ce cas, donc
  // relire l'URL uniquement à l'état initial (comme avant) laissait la page bloquée sur le premier
  // établissement visité : passer d'un lien à l'autre ne faisait plus rien.
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    table.setFilters({ etablissementId: params.get('etablissementId') || '', type: params.get('type') || '' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.search]);

  const { data, isLoading, isError, error, refetch } = useListQuery('mouvements-stock', table.params);
  const { data: etablissements } = useQuery({ queryKey: ['etablissements'], queryFn: async () => (await api.get('/etablissements')).data });

  const [sortieOpen, setSortieOpen] = useState(false);
  const [sortieForm, setSortieForm] = useState(EMPTY_SORTIE);
  const [scannerOuvert, setScannerOuvert] = useState(false);
  // Établissement choisi DANS la modale de sortie (Super Admin) — indépendant du filtre de la
  // liste ci-dessous, pour rester utilisable sans avoir dû filtrer la page au préalable.
  const [formEtablissementId, setFormEtablissementId] = useState('');
  const [rechercheProduit, setRechercheProduit] = useState('');

  const etablissementIdActif = superAdmin ? formEtablissementId : user?.etablissementId;
  // Clé préfixée par 'produits' (et non 'produits-suivis') pour que
  // queryClient.invalidateQueries({ queryKey: ['produits'] }), appelé après chaque sortie/entrée,
  // la rafraîchisse elle aussi — sinon le stock affiché restait périmé jusqu'à un F5.
  const { data: produits } = useQuery({
    queryKey: ['produits', 'suivis', etablissementIdActif],
    queryFn: async () => {
      const { data } = await api.get('/produits', { params: { etablissementId: etablissementIdActif, size: 200 } });
      return (data.content || []).filter((p) => p.suiviStock);
    },
    enabled: !!etablissementIdActif,
  });

  // Liste visible sur la page (pas seulement dans les modales), paginée et avec RUD : suit le
  // filtre établissement de la liste des mouvements ci-dessous, se rafraîchit automatiquement
  // après chaque mouvement.
  const stockEtablissementId = superAdmin ? table.filters.etablissementId : user?.etablissementId;
  const stockTable = useTableState({ initialSize: 10, extraFilters: { suiviStock: true } });
  useEffect(() => { stockTable.setPage(0); }, [stockEtablissementId]); // eslint-disable-line react-hooks/exhaustive-deps
  const {
    data: stockData, isLoading: stockLoading, isError: stockIsError, error: stockError, refetch: stockRefetch,
  } = useListQuery('produits', { ...stockTable.params, etablissementId: stockEtablissementId }, { enabled: !!stockEtablissementId });

  const [editingProduit, setEditingProduit] = useState(null);
  const [produitFormOpen, setProduitFormOpen] = useState(false);
  const toggleActifProduit = useMutation({
    mutationFn: (id) => api.patch(`/produits/${id}/statut`).then((r) => r.data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['produits'] }); toast.success('Statut mis à jour.'); },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });

  function ouvrirNouveauProduit() { setEditingProduit(null); setProduitFormOpen(true); }
  function ouvrirModifierProduit(p) { setEditingProduit(p); setProduitFormOpen(true); }

  const produitsFiltres = (produits || []).filter((p) => p.nom.toLowerCase().includes(rechercheProduit.trim().toLowerCase()));
  const produitSelectionneSortie = (produits || []).find((p) => String(p.id) === String(sortieForm.produitId));
  const sortieDepasseStock = produitSelectionneSortie && sortieForm.quantite
    && Number(sortieForm.quantite) > Number(produitSelectionneSortie.quantiteStock);

  function openSortie() {
    setFormEtablissementId(superAdmin ? (table.filters.etablissementId || '') : '');
    setRechercheProduit('');
    setSortieForm(EMPTY_SORTIE);
    setSortieOpen(true);
  }

  // Recommandations et corrections.md §6/7 : associe le produit scanné au formulaire de sortie, à
  // condition qu'il soit bien suivi en stock (sinon absent du menu déroulant lui-même). Pour un
  // Super Admin, l'établissement du produit scanné est repris automatiquement.
  async function traiterScan(texteDecode) {
    setScannerOuvert(false);
    try {
      const { data: produit } = await api.get('/produits/scanner', { params: { code: texteDecode } });
      if (!superAdmin && String(produit.etablissementId) !== String(user?.etablissementId)) {
        toast.error(`Ce produit appartient à un autre établissement (${produit.etablissementNom}).`);
        return;
      }
      if (!produit.suiviStock) {
        toast.error(`${produit.nom} n'a pas de suivi de stock activé.`);
        return;
      }
      if (superAdmin) setFormEtablissementId(String(produit.etablissementId));
      setSortieForm((f) => ({ ...f, produitId: String(produit.id) }));
    } catch (e) {
      toast.error(apiErrorMessage(e, 'QR code non reconnu.'));
    }
  }

  const sortie = useMutation({
    mutationFn: (payload) => api.post('/mouvements-stock/sorties', payload).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mouvements-stock'] });
      queryClient.invalidateQueries({ queryKey: ['produits'] });
      toast.success('Sortie de stock enregistrée.');
      setSortieOpen(false);
      setSortieForm(EMPTY_SORTIE);
    },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });

  function submitSortie(e) {
    e.preventDefault();
    sortie.mutate({
      produitId: Number(sortieForm.produitId),
      quantite: Number(sortieForm.quantite),
      motif: sortieForm.motif,
    });
  }

  return (
    <div>
      <PageHeader
        title="Mouvements de stock"
        subtitle="Historique des entrées, sorties et transferts (§6.6.2)."
        actions={<>
          <button className="btn-secondary" onClick={openSortie}><Minus size={16} /> Nouvelle sortie</button>
          <button className="btn-primary" onClick={ouvrirNouveauProduit}><Plus size={16} /> Nouvelle entrée</button>
        </>}
      />

      <p className="section-title mb-2">Stock actuel</p>
      {!stockEtablissementId ? (
        <p className="text-sm text-ink-light mb-6">Choisissez un établissement ci-dessous pour voir le stock actuel de ses produits.</p>
      ) : (
        <div className="mb-6">
          <DataTable
            columns={[
              { key: 'nom', header: 'Produit' },
              { key: 'categorieNom', header: 'Catégorie' },
              {
                key: 'quantiteStock',
                header: 'Stock actuel',
                render: (r) => (
                  <span className={r.seuilAlerte != null && r.quantiteStock <= r.seuilAlerte ? 'text-danger font-bold' : ''}>
                    {r.quantiteStock} {r.unite}
                  </span>
                ),
              },
              { key: 'seuilAlerte', header: 'Seuil d\'alerte', render: (r) => r.seuilAlerte ?? '—' },
              { key: 'actif', header: 'Statut', render: (r) => r.actif ? 'Actif' : 'Désactivé' },
            ]}
            rows={stockData?.rows || []}
            total={stockData?.total || 0}
            totalPages={stockData?.totalPages || 0}
            page={stockTable.page}
            isLoading={stockLoading}
            isError={stockIsError}
            errorMessage={apiErrorMessage(stockError)}
            onRetry={stockRefetch}
            search={stockTable.search}
            onSearchChange={stockTable.setSearch}
            searchPlaceholder="Rechercher un produit..."
            onPageChange={stockTable.setPage}
            rowActions={(row) => (
              <>
                <button className="btn-ghost p-1.5" title="Modifier (permet aussi d'augmenter le stock)" onClick={() => ouvrirModifierProduit(row)}><Pencil size={15} /></button>
                <button
                  className={`btn-ghost p-1.5 ${row.actif ? 'text-danger' : 'text-success'}`}
                  title={row.actif ? 'Désactiver' : 'Activer'}
                  onClick={() => toggleActifProduit.mutate(row.id)}
                >
                  <Power size={15} />
                </button>
              </>
            )}
            emptyLabel="Aucun produit suivi en stock pour cet établissement."
          />
        </div>
      )}

      <p className="section-title mb-2">Historique des mouvements</p>
      <DataTable
        columns={[
          { key: 'dateMouvement', header: 'Date', render: (r) => formatDateTime(r.dateMouvement) },
          { key: 'produitNom', header: 'Produit' },
          { key: 'type', header: 'Type', render: (r) => TYPE_LABEL[r.type] || r.type },
          {
            key: 'quantite',
            header: 'Quantité',
            // AJUSTEMENT_INVENTAIRE porte une quantité déjà signée (surplus positif, perte négative) —
            // c'est le seul type sans sens univoque porté par le type lui-même (cf. MouvementStock.quantite).
            render: (r) => r.type === 'AJUSTEMENT_INVENTAIRE'
              ? (r.quantite > 0 ? `+${r.quantite}` : r.quantite)
              : `${['SORTIE', 'SORTIE_VENTE', 'TRANSFERT_SORTANT'].includes(r.type) ? '-' : '+'}${r.quantite}`,
          },
          { key: 'motif', header: 'Motif', render: (r) => r.motif || '—' },
          { key: 'etablissementNom', header: 'Établissement' },
          { key: 'auteurNom', header: 'Auteur' },
        ]}
        rows={data?.rows || []}
        total={data?.total || 0}
        totalPages={data?.totalPages || 0}
        page={table.page}
        isLoading={isLoading}
        isError={isError}
        errorMessage={apiErrorMessage(error)}
        onRetry={refetch}
        onPageChange={table.setPage}
        toolbar={<>
          {superAdmin && (
            <Select className="w-auto" value={table.filters.etablissementId} onChange={(e) => table.setFilters({ etablissementId: e.target.value })}>
              <option value="">Tous les établissements</option>
              {(etablissements || []).map((et) => <option key={et.id} value={et.id}>{et.nom}</option>)}
            </Select>
          )}
          <Select className="w-auto" value={table.filters.type} onChange={(e) => table.setFilters({ type: e.target.value })}>
            <option value="">Tous les types</option>
            {Object.entries(TYPE_LABEL).map(([k, label]) => <option key={k} value={k}>{label}</option>)}
          </Select>
        </>}
        emptyLabel="Aucun mouvement de stock."
      />

      <Modal
        open={sortieOpen}
        onClose={() => setSortieOpen(false)}
        title="Nouvelle sortie de stock"
        footer={<>
          <button className="btn-secondary" onClick={() => setSortieOpen(false)}>Annuler</button>
          <button className="btn-primary" onClick={submitSortie} disabled={sortie.isPending || sortieDepasseStock}>Enregistrer</button>
        </>}
      >
        <form onSubmit={submitSortie}>
          {superAdmin && (
            <Field label="Établissement" required>
              <Select
                value={formEtablissementId}
                onChange={(e) => { setFormEtablissementId(e.target.value); setSortieForm((f) => ({ ...f, produitId: '' })); setRechercheProduit(''); }}
              >
                <option value="" disabled>Choisir un établissement</option>
                {(etablissements || []).map((et) => <option key={et.id} value={et.id}>{et.nom}</option>)}
              </Select>
            </Field>
          )}
          <Field label="Produit" required>
            <div className="flex gap-2 mb-2">
              <input
                className="input flex-1"
                placeholder={etablissementIdActif ? 'Rechercher un produit...' : 'Choisissez un établissement'}
                value={rechercheProduit}
                onChange={(e) => setRechercheProduit(e.target.value)}
                disabled={!etablissementIdActif}
              />
              <button type="button" className="btn-secondary shrink-0" onClick={() => setScannerOuvert(true)}><QrCode size={15} /></button>
            </div>
            <Select
              value={sortieForm.produitId}
              onChange={(e) => setSortieForm((f) => ({ ...f, produitId: e.target.value }))}
              disabled={!etablissementIdActif}
            >
              <option value="" disabled>{etablissementIdActif ? 'Choisir un produit' : 'Choisissez d\'abord un établissement'}</option>
              {produitsFiltres.map((p) => <option key={p.id} value={p.id}>{p.nom} (stock : {p.quantiteStock})</option>)}
            </Select>
          </Field>

          {produitSelectionneSortie && (
            <div className="rounded-lg bg-cream-100 dark:bg-white/5 p-3 mb-3 text-sm space-y-1">
              <div className="flex justify-between">
                <span>Stock actuellement disponible</span>
                <span className="font-semibold">{produitSelectionneSortie.quantiteStock} {produitSelectionneSortie.unite}</span>
              </div>
              {sortieForm.quantite !== '' && (
                <div className={`flex justify-between font-semibold ${sortieDepasseStock ? 'text-danger' : 'text-success'}`}>
                  <span>Nouveau stock après sortie</span>
                  <span>{Number(produitSelectionneSortie.quantiteStock) - Number(sortieForm.quantite)} {produitSelectionneSortie.unite}</span>
                </div>
              )}
            </div>
          )}
          {sortieDepasseStock && <p className="text-xs text-danger mb-2">La quantité dépasse le stock disponible.</p>}

          <Field label="Quantité à retirer" required><input type="number" min="0.001" step="0.001" className="input" value={sortieForm.quantite} onChange={(e) => setSortieForm((f) => ({ ...f, quantite: e.target.value }))} required /></Field>
          <Field label="Motif" required hint="Obligatoire pour toute sortie manuelle (RG-081).">
            <input className="input" value={sortieForm.motif} onChange={(e) => setSortieForm((f) => ({ ...f, motif: e.target.value }))} required />
          </Field>
        </form>
      </Modal>

      <QrScannerModal open={scannerOuvert} onClose={() => setScannerOuvert(false)} onScan={traiterScan} title="Scanner un produit" />

      <ProduitFormModal
        open={produitFormOpen}
        onClose={() => setProduitFormOpen(false)}
        editing={editingProduit}
        defaultEtablissementId={table.filters.etablissementId}
      />
    </div>
  );
}
