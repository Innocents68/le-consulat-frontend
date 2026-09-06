import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Users, Pencil, Trash2, Wifi, WifiOff } from 'lucide-react';
import api, { fetchPage, apiErrorMessage } from '../../lib/api';
import PageHeader from '../../components/ui/PageHeader';
import Modal from '../../components/ui/Modal';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { Field, Select } from '../../components/ui/Field';
import { Loader, ErrorState, EmptyState } from '../../components/ui/Feedback';
import { useToast } from '../../components/ui/Toast';
import { useLiveTopic } from '../../hooks/useLiveTopic';

const STATUT_STYLE = {
  LIBRE: 'bg-success/10 border-success/40 text-success',
  OCCUPEE: 'bg-danger/10 border-danger/40 text-danger',
  RESERVEE: 'bg-warning/10 border-warning/40 text-warning',
};
const STATUT_LABEL = { LIBRE: 'Libre', OCCUPEE: 'Occupée', RESERVEE: 'Réservée' };

export default function TablesPage() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [zone, setZone] = useState('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [form, setForm] = useState({ numero: '', capacite: 4, zone: 'Salle principale', statut: 'LIBRE' });

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['tables', 'plan'],
    queryFn: () => fetchPage('/tables', { size: 200 }),
    retry: 1,
  });

  const { connected } = useLiveTopic('/topic/tables', [['tables', 'plan']]);

  const create = useMutation({
    mutationFn: (payload) => api.post('/tables', payload).then((r) => r.data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['tables'] }); toast.success('Table ajoutée.'); setModalOpen(false); },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });
  const update = useMutation({
    mutationFn: ({ id, ...payload }) => api.put(`/tables/${id}`, payload).then((r) => r.data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['tables'] }); toast.success('Table modifiée.'); setModalOpen(false); },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });
  const remove = useMutation({
    mutationFn: (id) => api.delete(`/tables/${id}`).then((r) => r.data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['tables'] }); toast.success('Table retirée du plan.'); setDeleteTarget(null); },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });

  const tables = data?.rows || [];
  const zones = useMemo(() => ['all', ...new Set(tables.map((t) => t.zone).filter(Boolean))], [tables]);
  const filtered = zone === 'all' ? tables : tables.filter((t) => t.zone === zone);

  function openCreate() {
    setEditing(null);
    setForm({ numero: '', capacite: 4, zone: zone !== 'all' ? zone : 'Salle principale', statut: 'LIBRE' });
    setModalOpen(true);
  }
  function openEdit(t) {
    setEditing(t);
    setForm(t);
    setModalOpen(true);
  }
  function handleSubmit(e) {
    e.preventDefault();
    if (editing) update.mutate({ id: editing.id, ...form });
    else create.mutate(form);
  }

  const counts = {
    LIBRE: tables.filter((t) => t.statut === 'LIBRE').length,
    OCCUPEE: tables.filter((t) => t.statut === 'OCCUPEE').length,
    RESERVEE: tables.filter((t) => t.statut === 'RESERVEE').length,
  };

  return (
    <div>
      <PageHeader
        title="Gestion des tables"
        subtitle="Plan de salle en temps réel."
        actions={
          <>
            <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg ${connected ? 'text-success bg-success/10' : 'text-ink-light bg-black/5'}`}>
              {connected ? <Wifi size={13} /> : <WifiOff size={13} />} {connected ? 'Temps réel actif' : 'Actualisation périodique'}
            </span>
            <button className="btn-primary" onClick={openCreate}><Plus size={16} /> Ajouter une table</button>
          </>
        }
      />

      <div className="flex items-center gap-4 mb-4 text-xs font-semibold flex-wrap">
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-success" /> Libre ({counts.LIBRE})</span>
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-danger" /> Occupée ({counts.OCCUPEE})</span>
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-warning" /> Réservée ({counts.RESERVEE})</span>
      </div>

      <div className="flex gap-1.5 mb-5 flex-wrap">
        {zones.map((z) => (
          <button
            key={z}
            onClick={() => setZone(z)}
            className={`px-3.5 py-1.5 rounded-full text-sm font-semibold ${zone === z ? 'bg-bordeaux-700 text-white' : 'bg-white dark:bg-white/10 text-ink-light border border-black/10 dark:border-white/10'}`}
          >
            {z === 'all' ? 'Toutes les zones' : z}
          </button>
        ))}
      </div>

      {isLoading && <Loader />}
      {isError && <ErrorState message={apiErrorMessage(error, 'Impossible de charger le plan de salle.')} onRetry={refetch} />}
      {!isLoading && !isError && filtered.length === 0 && <EmptyState label="Aucune table dans cette zone." />}

      {!isLoading && !isError && filtered.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {filtered.map((t) => (
            <div key={t.id} className={`group relative rounded-xl border-2 p-4 text-center ${STATUT_STYLE[t.statut] || STATUT_STYLE.LIBRE}`}>
              <div className="absolute top-1.5 right-1.5 hidden group-hover:flex gap-1">
                <button onClick={() => openEdit(t)} className="p-1 rounded bg-white/80 text-ink hover:bg-white"><Pencil size={12} /></button>
                <button onClick={() => setDeleteTarget(t)} className="p-1 rounded bg-white/80 text-danger hover:bg-white"><Trash2 size={12} /></button>
              </div>
              <p className="font-extrabold text-lg">{t.numero}</p>
              <p className="text-xs font-medium opacity-80 flex items-center justify-center gap-1 mt-0.5"><Users size={12} /> {t.capacite} pers.</p>
              <p className="text-[11px] font-semibold mt-2 uppercase tracking-wide">{STATUT_LABEL[t.statut] || t.statut}</p>
              <p className="text-[10px] opacity-60 mt-0.5">{t.zone}</p>
            </div>
          ))}
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Modifier la table' : 'Ajouter une table'}
        footer={
          <>
            <button className="btn-secondary" onClick={() => setModalOpen(false)}>Annuler</button>
            <button className="btn-primary" onClick={handleSubmit} disabled={create.isPending || update.isPending}>
              {editing ? 'Enregistrer' : 'Ajouter'}
            </button>
          </>
        }
      >
        <form onSubmit={handleSubmit}>
          <Field label="Numéro" required>
            <input className="input" value={form.numero} onChange={(e) => setForm((f) => ({ ...f, numero: e.target.value }))} placeholder="T1" required />
          </Field>
          <Field label="Capacité" required>
            <input type="number" className="input" value={form.capacite} onChange={(e) => setForm((f) => ({ ...f, capacite: Number(e.target.value) }))} required />
          </Field>
          <Field label="Zone" required>
            <input className="input" value={form.zone} onChange={(e) => setForm((f) => ({ ...f, zone: e.target.value }))} placeholder="Salle principale" required />
          </Field>
          <Field label="Statut">
            <Select value={form.statut} onChange={(e) => setForm((f) => ({ ...f, statut: e.target.value }))}>
              <option value="LIBRE">Libre</option>
              <option value="OCCUPEE">Occupée</option>
              <option value="RESERVEE">Réservée</option>
            </Select>
          </Field>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => remove.mutate(deleteTarget.id)}
        title="Retirer la table"
        message={`Retirer la table ${deleteTarget?.numero} du plan de salle ?`}
        loading={remove.isPending}
      />
    </div>
  );
}
