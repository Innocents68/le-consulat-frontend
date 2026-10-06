import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { QrCode } from 'lucide-react';
import api, { apiErrorMessage } from '../../lib/api';
import Modal from '../../components/ui/Modal';
import QrScannerModal from '../../components/ui/QrScannerModal';
import { Field, Select } from '../../components/ui/Field';
import { useToast } from '../../components/ui/Toast';
import { useAuthStore } from '../../store/authStore';
import { isSuperAdmin } from '../../lib/perimetre';

const UNITES = ['PIECE', 'BOUTEILLE', 'CASIER', 'VERRE', 'PORTION', 'LITRE'];
const EMPTY = {
  nom: '', categorieId: '', description: '', unite: 'PIECE', prixVente: '', prixAchat: '', etablissementId: '',
  suiviStock: false, seuilAlerte: '', emplacement: '', fournisseurId: '', codeBarre: '',
};

/** Création/modification d'un produit — extrait de ProduitsPage pour être réutilisé depuis
 * Mouvements de stock (RUD sur "Stock actuel"). Retour utilisateur (2026-09-18) : augmenter le
 * stock d'un produit existant se fait ici, via "Quantité à ajouter" — ça reste une entrée de
 * stock normale (POST /mouvements-stock/entrees, tracée dans l'historique), seulement déclenchée
 * depuis ce formulaire plutôt que depuis "Nouvelle entrée". quantiteStock elle-même reste en
 * lecture seule : seul MouvementStockService peut la modifier (RG-062, Produit.java). */
export default function ProduitFormModal({ open, onClose, editing, defaultEtablissementId }) {
  const toast = useToast();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const superAdmin = isSuperAdmin(user);
  const { data: etablissements } = useQuery({ queryKey: ['etablissements'], queryFn: async () => (await api.get('/etablissements')).data });

  const [form, setForm] = useState(EMPTY);
  const [quantiteAjout, setQuantiteAjout] = useState('');
  const [scannerOuvert, setScannerOuvert] = useState(false);

  // Demandes_amelioration_logiciel_Le_Consulat_Professionnel.docx §3 : un Gérant/Caissier ne peut
  // plus modifier les informations d'un produit (dont son prix) — seul le Super Administrateur le
  // peut. Il garde toutefois l'usage établi de ce même formulaire pour augmenter le stock d'un
  // produit existant (RG-062), d'où ce blocage ciblé sur les champs plutôt que sur l'ouverture du
  // formulaire lui-même.
  const lectureSeuleInfos = !!editing && !superAdmin;

  useEffect(() => {
    if (!open) return;
    setQuantiteAjout('');
    setForm(editing
      ? { ...editing, categorieId: editing.categorieId, etablissementId: editing.etablissementId }
      : { ...EMPTY, etablissementId: defaultEtablissementId || '' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editing]);

  const categorieEtablissementId = superAdmin ? form.etablissementId : user?.etablissementId;
  const { data: categories } = useQuery({
    queryKey: ['categories', categorieEtablissementId],
    queryFn: async () => (await api.get('/categories', { params: categorieEtablissementId ? { etablissementId: categorieEtablissementId } : {} })).data,
    enabled: !!categorieEtablissementId || !superAdmin,
  });
  const { data: fournisseurs } = useQuery({ queryKey: ['fournisseurs'], queryFn: async () => (await api.get('/fournisseurs')).data });

  const create = useMutation({
    mutationFn: (payload) => api.post('/produits', payload).then((r) => r.data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['produits'] }); toast.success('Produit créé.'); },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });
  const update = useMutation({
    mutationFn: ({ id, ...payload }) => api.put(`/produits/${id}`, payload).then((r) => r.data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['produits'] }); toast.success('Produit modifié.'); },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });

  async function handleSubmit(e) {
    e.preventDefault();
    const payload = {
      ...form,
      categorieId: Number(form.categorieId),
      prixVente: Number(form.prixVente),
      prixAchat: Number(form.prixAchat),
      seuilAlerte: form.seuilAlerte ? Number(form.seuilAlerte) : null,
      emplacement: form.emplacement || null,
      fournisseurId: form.fournisseurId ? Number(form.fournisseurId) : null,
      codeBarre: form.codeBarre || null,
    };

    if (editing) {
      if (!lectureSeuleInfos) {
        try {
          await update.mutateAsync({ id: editing.id, ...payload });
        } catch {
          return; // le toast d'erreur est déjà affiché par onError ci-dessus
        }
      }
      if (quantiteAjout && Number(quantiteAjout) > 0) {
        try {
          await api.post('/mouvements-stock/entrees', { produitId: editing.id, quantite: Number(quantiteAjout) });
          queryClient.invalidateQueries({ queryKey: ['mouvements-stock'] });
          queryClient.invalidateQueries({ queryKey: ['produits'] });
          toast.success(`Stock augmenté de ${quantiteAjout} ${form.unite}.`);
        } catch (err) {
          toast.error(apiErrorMessage(err, "Le produit a été modifié, mais l'ajout de stock a échoué."));
        }
      }
    } else {
      let created;
      try {
        created = await create.mutateAsync(payload);
      } catch {
        return;
      }
      if (form.suiviStock && quantiteAjout && Number(quantiteAjout) > 0) {
        try {
          await api.post('/mouvements-stock/entrees', { produitId: created.id, quantite: Number(quantiteAjout) });
          queryClient.invalidateQueries({ queryKey: ['mouvements-stock'] });
          queryClient.invalidateQueries({ queryKey: ['produits'] });
          toast.success(`Stock initial de ${quantiteAjout} ${form.unite} enregistré.`);
        } catch (err) {
          toast.error(apiErrorMessage(err, "Le produit a été créé, mais l'enregistrement du stock initial a échoué."));
        }
      }
    }
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? (lectureSeuleInfos ? `${editing.nom} — Ajouter du stock` : 'Modifier le produit') : 'Nouveau produit'}
      footer={<>
        <button className="btn-secondary" onClick={onClose}>Annuler</button>
        <button className="btn-primary" onClick={handleSubmit} disabled={create.isPending || update.isPending}>{editing ? 'Enregistrer' : 'Créer'}</button>
      </>}
    >
      {lectureSeuleInfos && (
        <p className="text-sm text-ink-light mb-3">
          Les informations du produit (nom, prix, catégorie...) sont réservées au Super Administrateur. Vous pouvez uniquement ajouter du stock ci-dessous.
        </p>
      )}
      <form onSubmit={handleSubmit}>
        {superAdmin && !editing && (
          <Field label="Établissement" required>
            <Select value={form.etablissementId} onChange={(e) => setForm((f) => ({ ...f, etablissementId: e.target.value, categorieId: '' }))}>
              <option value="" disabled>Choisir un établissement</option>
              {(etablissements || []).map((et) => <option key={et.id} value={et.id}>{et.nom}</option>)}
            </Select>
          </Field>
        )}
        <div className="grid grid-cols-2 gap-3">
          <Field label="Nom" required><input className="input" value={form.nom} onChange={(e) => setForm((f) => ({ ...f, nom: e.target.value }))} required disabled={lectureSeuleInfos} /></Field>
          <Field label="Catégorie" required>
            <Select value={form.categorieId} onChange={(e) => setForm((f) => ({ ...f, categorieId: e.target.value }))} disabled={lectureSeuleInfos}>
              <option value="" disabled>Choisir</option>
              {(categories || []).map((c) => <option key={c.id} value={c.id}>{c.nom}</option>)}
            </Select>
          </Field>
          <Field label="Unité" required>
            <Select value={form.unite} onChange={(e) => setForm((f) => ({ ...f, unite: e.target.value }))} disabled={lectureSeuleInfos}>
              {UNITES.map((u) => <option key={u} value={u}>{u}</option>)}
            </Select>
          </Field>
          <Field label="Prix de vente (FCFA)" required><input type="number" min="1" className="input" value={form.prixVente} onChange={(e) => setForm((f) => ({ ...f, prixVente: e.target.value }))} required disabled={lectureSeuleInfos} /></Field>
          <Field label="Prix d'achat (FCFA)" required><input type="number" min="1" className="input" value={form.prixAchat || ''} onChange={(e) => setForm((f) => ({ ...f, prixAchat: e.target.value }))} required disabled={lectureSeuleInfos} /></Field>
        </div>
        <Field label="Description"><input className="input" value={form.description || ''} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} disabled={lectureSeuleInfos} /></Field>

        <Field label="Code-barres" hint="Scannez celui déjà imprimé sur le produit acheté, ou laissez vide pour qu'un code soit généré automatiquement.">
          <div className="flex gap-2">
            <input className="input flex-1" value={form.codeBarre || ''} onChange={(e) => setForm((f) => ({ ...f, codeBarre: e.target.value }))} placeholder={editing?.codeBarre || 'Généré automatiquement'} disabled={lectureSeuleInfos} />
            <button type="button" className="btn-secondary shrink-0" onClick={() => setScannerOuvert(true)} disabled={lectureSeuleInfos}><QrCode size={15} /></button>
          </div>
        </Field>

        <label className="flex items-center gap-2 text-sm mt-2 mb-3">
          <input type="checkbox" checked={!!form.suiviStock} onChange={(e) => setForm((f) => ({ ...f, suiviStock: e.target.checked }))} disabled={lectureSeuleInfos} />
          Suivi de stock (RG-031/RG-062 — décrémentation automatique à la vente)
        </label>

        {form.suiviStock && (
          <div className="grid grid-cols-2 gap-3">
            <Field label="Seuil d'alerte" hint="Déclenche une mise en évidence visuelle (EF-027).">
              <input type="number" min="0" step="0.001" className="input" value={form.seuilAlerte || ''} onChange={(e) => setForm((f) => ({ ...f, seuilAlerte: e.target.value }))} disabled={lectureSeuleInfos} />
            </Field>
            <Field label="Emplacement"><input className="input" value={form.emplacement || ''} onChange={(e) => setForm((f) => ({ ...f, emplacement: e.target.value }))} disabled={lectureSeuleInfos} /></Field>
            <Field label="Fournisseur">
              <Select value={form.fournisseurId || ''} onChange={(e) => setForm((f) => ({ ...f, fournisseurId: e.target.value }))} disabled={lectureSeuleInfos}>
                <option value="">Aucun</option>
                {(fournisseurs || []).map((f) => <option key={f.id} value={f.id}>{f.nom}</option>)}
              </Select>
            </Field>
            {editing && (
              <Field label="Stock actuel"><input className="input" value={editing.quantiteStock} disabled /></Field>
            )}
            <Field
              label={editing ? 'Quantité à ajouter' : 'Quantité initiale'}
              hint="Enregistre une entrée de stock tracée dans l'historique (§6.6.2)."
            >
              <input type="number" min="0" step="0.001" className="input" value={quantiteAjout} onChange={(e) => setQuantiteAjout(e.target.value)} />
            </Field>
          </div>
        )}
      </form>

      <QrScannerModal
        open={scannerOuvert}
        onClose={() => setScannerOuvert(false)}
        onScan={(texte) => { setForm((f) => ({ ...f, codeBarre: texte })); setScannerOuvert(false); }}
        title="Scanner le code-barres du produit"
      />
    </Modal>
  );
}
