import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Minus, Trash2, Search } from 'lucide-react';
import api, { apiErrorMessage, fetchPage } from '../../lib/api';
import Modal from '../../components/ui/Modal';
import { Field, Select } from '../../components/ui/Field';
import { formatFCFA } from '../../lib/format';
import { useToast } from '../../components/ui/Toast';
import { useAuthStore } from '../../store/authStore';
import { isSuperAdmin } from '../../lib/perimetre';

/** Écran de saisie d'une commande (§6.2.2) : catalogue à gauche, panier à droite, table
 * optionnelle (PC-07 — vente à emporter/comptoir). Ne gère que la création : modifier une
 * commande non validée se fait depuis le détail dans CommandesPage. */
export default function NouvelleCommandeModal({ open, onClose, presetEtablissementId, presetTableId }) {
  const toast = useToast();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const superAdmin = isSuperAdmin(user);

  const [etablissementId, setEtablissementId] = useState('');
  const [tableId, setTableId] = useState('');
  const [clientNom, setClientNom] = useState('');
  const [cart, setCart] = useState([]); // [{ produitId, nom, prixVente, quantite }]
  const [rechercheCatalogue, setRechercheCatalogue] = useState('');

  // Ouverture depuis le plan de salle (Table.png) : la table (et son établissement) sont déjà
  // choisis, pas besoin de repasser par les champs de sélection.
  useEffect(() => {
    if (open) {
      setEtablissementId(presetEtablissementId ? String(presetEtablissementId) : '');
      setTableId(presetTableId ? String(presetTableId) : '');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const etabActif = superAdmin ? etablissementId : user?.etablissementId;

  const { data: etablissements } = useQuery({ queryKey: ['etablissements'], queryFn: async () => (await api.get('/etablissements')).data, enabled: open && superAdmin });
  const { data: produits } = useQuery({
    queryKey: ['produits-catalogue', etabActif],
    queryFn: () => fetchPage('/produits', { etablissementId: etabActif, actif: true, size: 200 }),
    enabled: open && !!etabActif,
  });
  const { data: tables } = useQuery({
    queryKey: ['tables-libres', etabActif],
    queryFn: async () => (await api.get('/tables', { params: { etablissementId: etabActif } })).data,
    enabled: open && !!etabActif,
  });

  const produitsDisponibles = (produits?.rows || [])
    .filter((p) => p.disponible)
    .filter((p) => p.nom.toLowerCase().includes(rechercheCatalogue.trim().toLowerCase()));
  const tablesLibres = (tables || []).filter((t) => t.statut === 'LIBRE' || String(t.id) === tableId);

  const total = useMemo(() => cart.reduce((sum, l) => sum + l.prixVente * l.quantite, 0), [cart]);

  const create = useMutation({
    mutationFn: (payload) => api.post('/commandes', payload).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['commandes'] });
      queryClient.invalidateQueries({ queryKey: ['tables-libres'] });
      queryClient.invalidateQueries({ queryKey: ['tables'] });
      toast.success('Commande créée.');
      resetEtFermer();
    },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });

  function resetEtFermer() {
    setTableId('');
    setClientNom('');
    setCart([]);
    setRechercheCatalogue('');
    onClose();
  }

  function ajouterAuPanier(produit) {
    setCart((prev) => {
      const existant = prev.find((l) => l.produitId === produit.id);
      if (existant) {
        return prev.map((l) => (l.produitId === produit.id ? { ...l, quantite: l.quantite + 1 } : l));
      }
      return [...prev, { produitId: produit.id, nom: produit.nom, prixVente: produit.prixVente, quantite: 1 }];
    });
  }

  function changerQuantite(produitId, delta) {
    setCart((prev) => prev
      .map((l) => (l.produitId === produitId ? { ...l, quantite: l.quantite + delta } : l))
      .filter((l) => l.quantite > 0));
  }

  function handleSubmit() {
    if (cart.length === 0) {
      toast.error('Ajoutez au moins un article au panier.');
      return;
    }
    create.mutate({
      tableId: tableId || null,
      clientNom: clientNom || null,
      lignes: cart.map((l) => ({ produitId: l.produitId, quantite: l.quantite })),
      etablissementId: superAdmin ? Number(etablissementId) : undefined,
    });
  }

  return (
    <Modal open={open} onClose={resetEtFermer} title="Nouvelle commande" size="lg"
      footer={<>
        <button className="btn-secondary" onClick={resetEtFermer}>Annuler</button>
        <button className="btn-primary" onClick={handleSubmit} disabled={create.isPending}>Créer la commande</button>
      </>}
    >
      {superAdmin && (
        <Field label="Établissement" required>
          <Select value={etablissementId} onChange={(e) => { setEtablissementId(e.target.value); setCart([]); }}>
            <option value="" disabled>Choisir un établissement</option>
            {(etablissements || []).map((et) => <option key={et.id} value={et.id}>{et.nom}</option>)}
          </Select>
        </Field>
      )}

      <div className="grid grid-cols-2 gap-3 mb-3">
        <Field label="Table (optionnel — vente à emporter sinon)">
          <Select value={tableId} onChange={(e) => setTableId(e.target.value)}>
            <option value="">Aucune (à emporter / comptoir)</option>
            {tablesLibres.map((t) => <option key={t.id} value={t.id}>{t.numero} ({t.zone || 'sans zone'})</option>)}
          </Select>
        </Field>
        <Field label="Nom du client (optionnel)">
          <input className="input" value={clientNom} onChange={(e) => setClientNom(e.target.value)} />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-xs font-semibold uppercase text-ink-light mb-2">Catalogue</p>
          <div className="relative mb-2">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-light" />
            <input
              className="input pl-8"
              placeholder="Rechercher un produit..."
              value={rechercheCatalogue}
              onChange={(e) => setRechercheCatalogue(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-2 max-h-80 overflow-y-auto">
            {produitsDisponibles.map((p) => (
              <button key={p.id} type="button" className="text-left border border-black/10 rounded-lg p-2 hover:border-bordeaux-300" onClick={() => ajouterAuPanier(p)}>
                <p className="text-sm font-semibold">{p.nom}</p>
                <p className="text-xs text-ink-light">{formatFCFA(p.prixVente)}</p>
              </button>
            ))}
            {produitsDisponibles.length === 0 && (
              <p className="text-sm text-ink-light col-span-2">
                {rechercheCatalogue ? 'Aucun produit ne correspond à cette recherche.' : 'Aucun produit disponible.'}
              </p>
            )}
          </div>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase text-ink-light mb-2">Panier</p>
          <div className="flex flex-col gap-2 max-h-80 overflow-y-auto">
            {cart.map((l) => (
              <div key={l.produitId} className="flex items-center justify-between border-b border-black/5 pb-1.5 text-sm">
                <div>
                  <p className="font-medium">{l.nom}</p>
                  <p className="text-xs text-ink-light">{formatFCFA(l.prixVente)} × {l.quantite}</p>
                </div>
                <div className="flex items-center gap-1">
                  <button type="button" className="btn-ghost p-1" onClick={() => changerQuantite(l.produitId, -1)}><Minus size={14} /></button>
                  <span className="w-5 text-center">{l.quantite}</span>
                  <button type="button" className="btn-ghost p-1" onClick={() => changerQuantite(l.produitId, 1)}><Plus size={14} /></button>
                  <button type="button" className="btn-ghost p-1 text-danger" onClick={() => setCart((prev) => prev.filter((x) => x.produitId !== l.produitId))}><Trash2 size={14} /></button>
                </div>
              </div>
            ))}
            {cart.length === 0 && <p className="text-sm text-ink-light">Panier vide.</p>}
          </div>
          <div className="mt-3 pt-2 border-t border-black/10 flex items-center justify-between font-semibold">
            <span>Total</span>
            <span>{formatFCFA(total)}</span>
          </div>
        </div>
      </div>
    </Modal>
  );
}
