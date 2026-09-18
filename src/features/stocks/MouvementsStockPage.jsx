import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Minus, QrCode } from 'lucide-react';
import api, { apiErrorMessage } from '../../lib/api';
import DataTable from '../../components/ui/DataTable';
import Modal from '../../components/ui/Modal';
import QrScannerModal from '../../components/ui/QrScannerModal';
import PageHeader from '../../components/ui/PageHeader';
import { Field, Select } from '../../components/ui/Field';
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

const EMPTY_ENTREE = { produitId: '', quantite: '', prixUnitaire: '' };
const EMPTY_SORTIE = { produitId: '', quantite: '', motif: '' };

/** §6.6.2 : historique des mouvements + saisie manuelle d'entrées/sorties. Les mouvements
 * SORTIE_VENTE/RETOUR_AVOIR/TRANSFERT_* sont générés automatiquement ailleurs (RG-031/RG-062/RG-084)
 * et n'apparaissent ici qu'en lecture. */
export default function MouvementsStockPage() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const superAdmin = isSuperAdmin(user);

  // Préremplissage depuis un raccourci du menu (?etablissementId=X&type=ENTREE|SORTIE).
  const paramsUrl = new URLSearchParams(window.location.search);
  const table = useTableState({ initialSize: 10, extraFilters: {
    etablissementId: paramsUrl.get('etablissementId') || '', produitId: '', type: paramsUrl.get('type') || '',
  } });
  const { data, isLoading, isError, error, refetch } = useListQuery('mouvements-stock', table.params);
  const { data: etablissements } = useQuery({ queryKey: ['etablissements'], queryFn: async () => (await api.get('/etablissements')).data });

  const [entreeOpen, setEntreeOpen] = useState(false);
  const [sortieOpen, setSortieOpen] = useState(false);
  const [entreeForm, setEntreeForm] = useState(EMPTY_ENTREE);
  const [sortieForm, setSortieForm] = useState(EMPTY_SORTIE);
  const [scannerCible, setScannerCible] = useState(null); // 'ENTREE' | 'SORTIE' | null
  // Établissement choisi DANS la modale (Super Admin) — indépendant du filtre de la liste
  // ci-dessous, pour que "Nouvelle entrée/sortie" reste utilisable sans avoir dû filtrer la page
  // au préalable (source de confusion : Recommandations et corrections.md).
  const [formEtablissementId, setFormEtablissementId] = useState('');
  const [rechercheProduit, setRechercheProduit] = useState('');

  const etablissementIdActif = superAdmin ? formEtablissementId : user?.etablissementId;
  const { data: produits } = useQuery({
    queryKey: ['produits-suivis', etablissementIdActif],
    queryFn: async () => {
      const { data } = await api.get('/produits', { params: { etablissementId: etablissementIdActif, size: 200 } });
      return (data.content || []).filter((p) => p.suiviStock);
    },
    enabled: !!etablissementIdActif,
  });
  const produitsFiltres = (produits || []).filter((p) => p.nom.toLowerCase().includes(rechercheProduit.trim().toLowerCase()));
  const produitSelectionneEntree = (produits || []).find((p) => String(p.id) === String(entreeForm.produitId));
  const produitSelectionneSortie = (produits || []).find((p) => String(p.id) === String(sortieForm.produitId));
  const sortieDepasseStock = produitSelectionneSortie && sortieForm.quantite
    && Number(sortieForm.quantite) > Number(produitSelectionneSortie.quantiteStock);

  function openEntree() {
    setFormEtablissementId(superAdmin ? (table.filters.etablissementId || '') : '');
    setRechercheProduit('');
    setEntreeForm(EMPTY_ENTREE);
    setEntreeOpen(true);
  }
  function openSortie() {
    setFormEtablissementId(superAdmin ? (table.filters.etablissementId || '') : '');
    setRechercheProduit('');
    setSortieForm(EMPTY_SORTIE);
    setSortieOpen(true);
  }

  // Recommandations et corrections.md §6/7 : associe le produit scanné au bon formulaire, à
  // condition qu'il soit bien suivi en stock (sinon absent du menu déroulant lui-même). Pour un
  // Super Admin, l'établissement du produit scanné est repris automatiquement — pas besoin de
  // l'avoir choisi avant de scanner.
  async function traiterScan(texteDecode) {
    const cible = scannerCible;
    setScannerCible(null);
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
      if (cible === 'ENTREE') setEntreeForm((f) => ({ ...f, produitId: String(produit.id) }));
      else if (cible === 'SORTIE') setSortieForm((f) => ({ ...f, produitId: String(produit.id) }));
    } catch (e) {
      toast.error(apiErrorMessage(e, 'QR code non reconnu.'));
    }
  }

  const entree = useMutation({
    mutationFn: (payload) => api.post('/mouvements-stock/entrees', payload).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mouvements-stock'] });
      queryClient.invalidateQueries({ queryKey: ['produits'] });
      toast.success('Entrée de stock enregistrée.');
      setEntreeOpen(false);
      setEntreeForm(EMPTY_ENTREE);
    },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });
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

  function submitEntree(e) {
    e.preventDefault();
    entree.mutate({
      produitId: Number(entreeForm.produitId),
      quantite: Number(entreeForm.quantite),
      prixUnitaire: entreeForm.prixUnitaire ? Number(entreeForm.prixUnitaire) : null,
    });
  }
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
          <button className="btn-primary" onClick={openEntree}><Plus size={16} /> Nouvelle entrée</button>
        </>}
      />

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
        open={entreeOpen}
        onClose={() => setEntreeOpen(false)}
        title="Nouvelle entrée de stock"
        footer={<>
          <button className="btn-secondary" onClick={() => setEntreeOpen(false)}>Annuler</button>
          <button className="btn-primary" onClick={submitEntree} disabled={entree.isPending}>Enregistrer</button>
        </>}
      >
        <form onSubmit={submitEntree}>
          {superAdmin && (
            <Field label="Établissement" required>
              <Select
                value={formEtablissementId}
                onChange={(e) => { setFormEtablissementId(e.target.value); setEntreeForm((f) => ({ ...f, produitId: '' })); setRechercheProduit(''); }}
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
              <button type="button" className="btn-secondary shrink-0" onClick={() => setScannerCible('ENTREE')}><QrCode size={15} /></button>
            </div>
            <Select
              value={entreeForm.produitId}
              onChange={(e) => setEntreeForm((f) => ({ ...f, produitId: e.target.value }))}
              disabled={!etablissementIdActif}
            >
              <option value="" disabled>{etablissementIdActif ? 'Choisir un produit' : 'Choisissez d\'abord un établissement'}</option>
              {produitsFiltres.map((p) => <option key={p.id} value={p.id}>{p.nom} (stock : {p.quantiteStock})</option>)}
            </Select>
          </Field>

          {produitSelectionneEntree && (
            <div className="rounded-lg bg-cream-100 dark:bg-white/5 p-3 mb-3 text-sm space-y-1">
              <div className="flex justify-between">
                <span>Stock actuellement disponible</span>
                <span className="font-semibold">{produitSelectionneEntree.quantiteStock} {produitSelectionneEntree.unite}</span>
              </div>
              {entreeForm.quantite !== '' && (
                <div className="flex justify-between text-success font-semibold">
                  <span>Nouveau stock après entrée</span>
                  <span>{Number(produitSelectionneEntree.quantiteStock) + Number(entreeForm.quantite)} {produitSelectionneEntree.unite}</span>
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <Field label="Quantité à ajouter" required><input type="number" min="0.001" step="0.001" className="input" value={entreeForm.quantite} onChange={(e) => setEntreeForm((f) => ({ ...f, quantite: e.target.value }))} required /></Field>
            <Field label="Prix d'achat unitaire (FCFA)"><input type="number" min="0" className="input" value={entreeForm.prixUnitaire} onChange={(e) => setEntreeForm((f) => ({ ...f, prixUnitaire: e.target.value }))} /></Field>
          </div>
        </form>
      </Modal>

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
              <button type="button" className="btn-secondary shrink-0" onClick={() => setScannerCible('SORTIE')}><QrCode size={15} /></button>
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

      <QrScannerModal open={!!scannerCible} onClose={() => setScannerCible(null)} onScan={traiterScan} title="Scanner un produit" />
    </div>
  );
}
