import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, CheckCircle2, Paperclip, FileText } from 'lucide-react';
import api, { fetchPage, apiErrorMessage, fileUrl } from '../../lib/api';
import DataTable from '../../components/ui/DataTable';
import Modal from '../../components/ui/Modal';
import PageHeader from '../../components/ui/PageHeader';
import StatusBadge from '../../components/ui/StatusBadge';
import StatCard from '../../components/ui/StatCard';
import { Field, Select } from '../../components/ui/Field';
import { useTableState } from '../../hooks/useTableState';
import { useListQuery } from '../../hooks/useResource';
import { formatFCFA, formatDate, todayISO } from '../../lib/format';
import { useToast } from '../../components/ui/Toast';
import { CircleDollarSign } from 'lucide-react';

const EMPTY = { categorieId: '', montant: 0, description: '', fournisseur: '', date: todayISO() };

export default function DepensesPage() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const table = useTableState({ initialSize: 10 });
  const { data, isLoading, isError, error, refetch } = useListQuery('depenses', table.params);
  const { data: categories } = useQuery({ queryKey: ['categories-depenses', 'all'], queryFn: () => fetchPage('/categories-depenses', { size: 100 }) });

  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [catModalOpen, setCatModalOpen] = useState(false);
  const [newCat, setNewCat] = useState('');
  const [uploadTarget, setUploadTarget] = useState(null);
  const [file, setFile] = useState(null);

  const create = useMutation({
    mutationFn: (payload) => api.post('/depenses', payload).then((r) => r.data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['depenses'] }); toast.success('Dépense enregistrée.'); setModalOpen(false); setForm(EMPTY); },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });
  const createCat = useMutation({
    mutationFn: (payload) => api.post('/categories-depenses', payload).then((r) => r.data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['categories-depenses'] }); toast.success('Catégorie créée.'); setCatModalOpen(false); setNewCat(''); },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });
  const valider = useMutation({
    mutationFn: (id) => api.post(`/depenses/${id}/valider`).then((r) => r.data).catch(() => api.put(`/depenses/${id}`, { statut: 'VALIDEE' }).then((r) => r.data)),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['depenses'] }); toast.success('Dépense validée.'); },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });
  const uploadJustificatif = useMutation({
    mutationFn: ({ id, file }) => {
      const fd = new FormData();
      fd.append('file', file);
      return api.post(`/depenses/${id}/justificatif`, fd, { headers: { 'Content-Type': 'multipart/form-data' } }).then((r) => r.data);
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['depenses'] }); toast.success('Justificatif ajouté.'); setUploadTarget(null); setFile(null); },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });

  const rows = data?.rows || [];
  const total = rows.reduce((s, r) => s + (r.montant || 0), 0);

  return (
    <div>
      <PageHeader
        title="Dépenses"
        subtitle="Achats, salaires, entretien... avec justificatifs."
        actions={<>
          <button className="btn-secondary" onClick={() => setCatModalOpen(true)}>+ Catégorie</button>
          <button className="btn-primary" onClick={() => setModalOpen(true)}><Plus size={16} /> Nouvelle dépense</button>
        </>}
      />

      <div className="grid grid-cols-2 gap-4 mb-5">
        <StatCard icon={CircleDollarSign} label="Dépenses (page)" value={rows.length} />
        <StatCard icon={CircleDollarSign} label="Total (page)" value={formatFCFA(total)} />
      </div>

      <DataTable
        columns={[
          { key: 'date', header: 'Date', render: (r) => formatDate(r.date), sortable: true },
          { key: 'categorieNom', header: 'Catégorie' },
          { key: 'description', header: 'Description' },
          { key: 'fournisseur', header: 'Fournisseur' },
          { key: 'montant', header: 'Montant', render: (r) => formatFCFA(r.montant), className: 'font-semibold' },
          { key: 'justificatifUrl', header: 'Justificatif', render: (r) => r.justificatifUrl ? <a href={fileUrl(r.justificatifUrl)} target="_blank" rel="noreferrer" className="text-bordeaux-700 underline text-xs">Voir</a> : '—' },
          { key: 'statut', header: 'Statut', render: (r) => <StatusBadge status={r.statut} /> },
        ]}
        rows={rows}
        total={data?.total || 0}
        totalPages={data?.totalPages || 0}
        page={table.page}
        isLoading={isLoading}
        isError={isError}
        errorMessage={apiErrorMessage(error)}
        onRetry={refetch}
        search={table.search}
        onSearchChange={table.setSearch}
        searchPlaceholder="Rechercher une dépense..."
        onPageChange={table.setPage}
        rowActions={(row) => (
          <>
            <button className="btn-ghost p-1.5" title="Justificatif" onClick={() => setUploadTarget(row)}><Paperclip size={15} /></button>
            {row.statut === 'EN_ATTENTE' && <button className="btn-ghost p-1.5 text-success" title="Valider" onClick={() => valider.mutate(row.id)}><CheckCircle2 size={15} /></button>}
          </>
        )}
        emptyLabel="Aucune dépense enregistrée."
      />

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Nouvelle dépense"
        footer={<>
          <button className="btn-secondary" onClick={() => setModalOpen(false)}>Annuler</button>
          <button className="btn-primary" onClick={() => create.mutate(form)} disabled={create.isPending}>Enregistrer</button>
        </>}
      >
        <Field label="Catégorie" required>
          <Select value={form.categorieId} onChange={(e) => setForm((f) => ({ ...f, categorieId: e.target.value }))} required>
            <option value="">Sélectionner...</option>
            {(categories?.rows || []).map((c) => <option key={c.id} value={c.id}>{c.nom}</option>)}
          </Select>
        </Field>
        <Field label="Description" required><input className="input" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} required /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Montant (FCFA)" required><input type="number" className="input" value={form.montant} onChange={(e) => setForm((f) => ({ ...f, montant: Number(e.target.value) }))} required /></Field>
          <Field label="Fournisseur"><input className="input" value={form.fournisseur} onChange={(e) => setForm((f) => ({ ...f, fournisseur: e.target.value }))} /></Field>
        </div>
        <Field label="Date" required><input type="date" className="input" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} required /></Field>
      </Modal>

      <Modal open={catModalOpen} onClose={() => setCatModalOpen(false)} title="Nouvelle catégorie de dépense" footer={
        <><button className="btn-secondary" onClick={() => setCatModalOpen(false)}>Annuler</button><button className="btn-primary" onClick={() => createCat.mutate({ nom: newCat })} disabled={!newCat}>Créer</button></>
      }>
        <Field label="Nom" required><input className="input" value={newCat} onChange={(e) => setNewCat(e.target.value)} placeholder="Achats, Salaires, Entretien..." autoFocus /></Field>
      </Modal>

      <Modal open={!!uploadTarget} onClose={() => setUploadTarget(null)} title="Ajouter un justificatif" footer={
        <><button className="btn-secondary" onClick={() => setUploadTarget(null)}>Annuler</button>
          <button className="btn-primary" onClick={() => uploadJustificatif.mutate({ id: uploadTarget.id, file })} disabled={!file || uploadJustificatif.isPending}>
            <FileText size={14} /> Téléverser
          </button>
        </>
      }>
        <input type="file" accept="image/*,application/pdf" onChange={(e) => setFile(e.target.files?.[0])} className="input" />
      </Modal>
    </div>
  );
}
