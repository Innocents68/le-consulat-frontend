import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowRight } from 'lucide-react';
import api, { apiErrorMessage } from '../../lib/api';
import PageHeader from '../../components/ui/PageHeader';
import { Field, Select } from '../../components/ui/Field';
import { useToast } from '../../components/ui/Toast';

const EMPTY = { etablissementSourceId: '', produitSourceId: '', etablissementDestinationId: '', produitDestinationId: '', quantite: '' };

/** RG-084 : réservé au Super Administrateur, seul à avoir la vision des deux périmètres —
 * page absente du menu pour un Gérant/Caissier (superAdminOnly, navConfig.js). */
export default function TransfertsPage() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [form, setForm] = useState(EMPTY);

  const { data: etablissements } = useQuery({ queryKey: ['etablissements'], queryFn: async () => (await api.get('/etablissements')).data });

  const { data: produitsSource } = useQuery({
    queryKey: ['produits-suivis', form.etablissementSourceId],
    queryFn: async () => {
      const { data } = await api.get('/produits', { params: { etablissementId: form.etablissementSourceId, size: 200 } });
      return (data.content || []).filter((p) => p.suiviStock);
    },
    enabled: !!form.etablissementSourceId,
  });
  const { data: produitsDestination } = useQuery({
    queryKey: ['produits-suivis', form.etablissementDestinationId],
    queryFn: async () => {
      const { data } = await api.get('/produits', { params: { etablissementId: form.etablissementDestinationId, size: 200 } });
      return (data.content || []).filter((p) => p.suiviStock);
    },
    enabled: !!form.etablissementDestinationId,
  });

  const transfert = useMutation({
    mutationFn: (payload) => api.post('/mouvements-stock/transferts', payload).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mouvements-stock'] });
      queryClient.invalidateQueries({ queryKey: ['produits'] });
      toast.success('Transfert enregistré.');
      setForm(EMPTY);
    },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });

  function handleSubmit(e) {
    e.preventDefault();
    if (form.etablissementSourceId === form.etablissementDestinationId) {
      toast.error('Un transfert doit se faire entre deux établissements différents.');
      return;
    }
    transfert.mutate({
      produitSourceId: Number(form.produitSourceId),
      produitDestinationId: Number(form.produitDestinationId),
      quantite: Number(form.quantite),
    });
  }

  return (
    <div>
      <PageHeader title="Transferts entre établissements" subtitle="Réservé au Super Administrateur (RG-084)." />

      <div className="card p-5 max-w-2xl">
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-2 gap-4 items-start">
            <div>
              <p className="text-xs font-semibold uppercase text-ink-light mb-2">Depuis</p>
              <Field label="Établissement source" required>
                <Select value={form.etablissementSourceId} onChange={(e) => setForm((f) => ({ ...f, etablissementSourceId: e.target.value, produitSourceId: '' }))}>
                  <option value="" disabled>Choisir</option>
                  {(etablissements || []).map((et) => <option key={et.id} value={et.id}>{et.nom}</option>)}
                </Select>
              </Field>
              <Field label="Produit source" required>
                <Select value={form.produitSourceId} onChange={(e) => setForm((f) => ({ ...f, produitSourceId: e.target.value }))} disabled={!form.etablissementSourceId}>
                  <option value="" disabled>Choisir un produit</option>
                  {(produitsSource || []).map((p) => <option key={p.id} value={p.id}>{p.nom} (stock : {p.quantiteStock})</option>)}
                </Select>
              </Field>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase text-ink-light mb-2 flex items-center gap-1"><ArrowRight size={13} /> Vers</p>
              <Field label="Établissement destination" required>
                <Select value={form.etablissementDestinationId} onChange={(e) => setForm((f) => ({ ...f, etablissementDestinationId: e.target.value, produitDestinationId: '' }))}>
                  <option value="" disabled>Choisir</option>
                  {(etablissements || []).map((et) => <option key={et.id} value={et.id}>{et.nom}</option>)}
                </Select>
              </Field>
              <Field label="Produit destination" required>
                <Select value={form.produitDestinationId} onChange={(e) => setForm((f) => ({ ...f, produitDestinationId: e.target.value }))} disabled={!form.etablissementDestinationId}>
                  <option value="" disabled>Choisir un produit</option>
                  {(produitsDestination || []).map((p) => <option key={p.id} value={p.id}>{p.nom} (stock : {p.quantiteStock})</option>)}
                </Select>
              </Field>
            </div>
          </div>
          <Field label="Quantité" required>
            <input type="number" min="0.001" step="0.001" className="input" value={form.quantite} onChange={(e) => setForm((f) => ({ ...f, quantite: e.target.value }))} required />
          </Field>
          <button className="btn-primary mt-2" type="submit" disabled={transfert.isPending}>Effectuer le transfert</button>
        </form>
      </div>
    </div>
  );
}
