import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Archive, Clock } from 'lucide-react';
import api, { fetchPage, apiErrorMessage } from '../../lib/api';
import PageHeader from '../../components/ui/PageHeader';
import Modal from '../../components/ui/Modal';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { Field, Select, TextArea } from '../../components/ui/Field';
import { Loader, ErrorState, EmptyState } from '../../components/ui/Feedback';
import { formatFCFA } from '../../lib/format';
import { useToast } from '../../components/ui/Toast';

const EMPTY = { nom: '', prix: 0, categorieId: '', description: '', tempsPreparation: 15, disponible: true, ingredients: '' };

export default function MenusTarifsPage() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [categorieId, setCategorieId] = useState('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [catModalOpen, setCatModalOpen] = useState(false);
  const [newCatNom, setNewCatNom] = useState('');
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [archiveTarget, setArchiveTarget] = useState(null);

  const { data: categories } = useQuery({
    queryKey: ['categories-plats'],
    queryFn: () => fetchPage('/categories-plats', { size: 100, sort: 'ordre,asc' }),
    retry: 1,
  });

  const { data: plats, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['plats', categorieId],
    queryFn: () => fetchPage('/plats', { size: 100, categorieId: categorieId !== 'all' ? categorieId : undefined }),
    retry: 1,
  });

  const createCat = useMutation({
    mutationFn: (payload) => api.post('/categories-plats', payload).then((r) => r.data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['categories-plats'] }); toast.success('Catégorie créée.'); setCatModalOpen(false); setNewCatNom(''); },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });

  const create = useMutation({
    mutationFn: (payload) => api.post('/plats', payload).then((r) => r.data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['plats'] }); toast.success('Plat créé.'); setModalOpen(false); },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });
  const update = useMutation({
    mutationFn: ({ id, ...payload }) => api.put(`/plats/${id}`, payload).then((r) => r.data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['plats'] }); toast.success('Plat modifié.'); setModalOpen(false); },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });
  const remove = useMutation({
    mutationFn: (id) => api.delete(`/plats/${id}`).then((r) => r.data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['plats'] }); toast.success('Plat archivé.'); setArchiveTarget(null); },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });

  function openCreate() {
    setEditing(null);
    setForm({ ...EMPTY, categorieId: categorieId !== 'all' ? categorieId : '' });
    setModalOpen(true);
  }
  function openEdit(p) {
    setEditing(p);
    setForm(p);
    setModalOpen(true);
  }
  function handleSubmit(e) {
    e.preventDefault();
    if (editing) update.mutate({ id: editing.id, ...form });
    else create.mutate(form);
  }

  return (
    <div>
      <PageHeader
        title="Menus et tarifs"
        subtitle="Catalogue des plats par catégorie, prix et disponibilité."
        actions={
          <>
            <button className="btn-secondary" onClick={() => setCatModalOpen(true)}>+ Catégorie</button>
            <button className="btn-primary" onClick={openCreate}><Plus size={16} /> Nouvel article</button>
          </>
        }
      />

      <div className="flex flex-wrap gap-1.5 mb-5">
        <button
          className={`px-3.5 py-1.5 rounded-full text-sm font-semibold ${categorieId === 'all' ? 'bg-bordeaux-700 text-white' : 'bg-white dark:bg-white/10 text-ink-light border border-black/10'}`}
          onClick={() => setCategorieId('all')}
        >
          Tous
        </button>
        {(categories?.rows || []).map((c) => (
          <button
            key={c.id}
            className={`px-3.5 py-1.5 rounded-full text-sm font-semibold ${categorieId === c.id ? 'bg-bordeaux-700 text-white' : 'bg-white dark:bg-white/10 text-ink-light border border-black/10'}`}
            onClick={() => setCategorieId(c.id)}
          >
            {c.nom}
          </button>
        ))}
      </div>

      {isLoading && <Loader />}
      {isError && <ErrorState message={apiErrorMessage(error, 'Impossible de charger le catalogue.')} onRetry={refetch} />}
      {!isLoading && !isError && (plats?.rows?.length ?? 0) === 0 && <EmptyState label="Aucun article dans cette catégorie." />}

      {!isLoading && !isError && (plats?.rows?.length ?? 0) > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {plats.rows.map((p) => (
            <div key={p.id} className="card p-4 flex flex-col gap-1.5">
              <div className="flex items-start justify-between gap-2">
                <p className="font-bold text-ink dark:text-cream-100">{p.nom}</p>
                <span className="font-extrabold text-bordeaux-700 dark:text-gold shrink-0">{formatFCFA(p.prix)}</span>
              </div>
              <p className="text-xs text-ink-light">{p.categorieNom}</p>
              {p.description && <p className="text-sm text-ink-light/90 line-clamp-2">{p.description}</p>}
              <div className="flex items-center justify-between mt-2 pt-2 border-t border-black/5 dark:border-white/5">
                <span className="text-xs text-ink-light flex items-center gap-1"><Clock size={12} /> {p.tempsPreparation} min</span>
                <span className={`text-xs font-semibold ${p.disponible ? 'text-success' : 'text-danger'}`}>{p.disponible ? 'Disponible' : 'Indisponible'}</span>
              </div>
              <div className="flex gap-1.5 mt-2">
                <button className="btn-secondary flex-1 py-1.5 text-xs" onClick={() => openEdit(p)}><Pencil size={13} /> Modifier</button>
                <button className="btn-ghost text-danger py-1.5 text-xs" onClick={() => setArchiveTarget(p)}><Archive size={13} /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Modifier le plat' : 'Nouvel article'}
        footer={
          <>
            <button className="btn-secondary" onClick={() => setModalOpen(false)}>Annuler</button>
            <button className="btn-primary" onClick={handleSubmit} disabled={create.isPending || update.isPending}>{editing ? 'Enregistrer' : 'Créer'}</button>
          </>
        }
      >
        <form onSubmit={handleSubmit}>
          <Field label="Nom" required>
            <input className="input" value={form.nom} onChange={(e) => setForm((f) => ({ ...f, nom: e.target.value }))} required />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Prix (FCFA)" required>
              <input type="number" className="input" value={form.prix} onChange={(e) => setForm((f) => ({ ...f, prix: Number(e.target.value) }))} required />
            </Field>
            <Field label="Temps de préparation (min)">
              <input type="number" className="input" value={form.tempsPreparation} onChange={(e) => setForm((f) => ({ ...f, tempsPreparation: Number(e.target.value) }))} />
            </Field>
          </div>
          <Field label="Catégorie" required>
            <Select value={form.categorieId} onChange={(e) => setForm((f) => ({ ...f, categorieId: e.target.value }))} required>
              <option value="">Sélectionner...</option>
              {(categories?.rows || []).map((c) => <option key={c.id} value={c.id}>{c.nom}</option>)}
            </Select>
          </Field>
          <Field label="Description">
            <TextArea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
          </Field>
          <Field label="Ingrédients">
            <input className="input" value={form.ingredients} onChange={(e) => setForm((f) => ({ ...f, ingredients: e.target.value }))} placeholder="Séparés par des virgules" />
          </Field>
          <label className="flex items-center gap-2 text-sm mt-1">
            <input type="checkbox" checked={!!form.disponible} onChange={(e) => setForm((f) => ({ ...f, disponible: e.target.checked }))} />
            Disponible à la vente
          </label>
        </form>
      </Modal>

      <Modal
        open={catModalOpen}
        onClose={() => setCatModalOpen(false)}
        title="Nouvelle catégorie"
        footer={
          <>
            <button className="btn-secondary" onClick={() => setCatModalOpen(false)}>Annuler</button>
            <button className="btn-primary" onClick={() => createCat.mutate({ nom: newCatNom, ordre: (categories?.rows?.length || 0) + 1 })} disabled={!newCatNom || createCat.isPending}>Créer</button>
          </>
        }
      >
        <Field label="Nom de la catégorie" required>
          <input className="input" value={newCatNom} onChange={(e) => setNewCatNom(e.target.value)} placeholder="Entrées, Plats, Desserts..." autoFocus />
        </Field>
      </Modal>

      <ConfirmDialog
        open={!!archiveTarget}
        onClose={() => setArchiveTarget(null)}
        onConfirm={() => remove.mutate(archiveTarget.id)}
        title="Archiver le plat"
        message={`Archiver "${archiveTarget?.nom}" ? L'historique sera conservé.`}
        loading={remove.isPending}
      />
    </div>
  );
}
