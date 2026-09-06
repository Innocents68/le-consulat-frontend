import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Undo2, Loader2 } from 'lucide-react';
import DataTable from '../../components/ui/DataTable';
import Modal from '../../components/ui/Modal';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import PageHeader from '../../components/ui/PageHeader';
import StatusBadge from '../../components/ui/StatusBadge';
import { Field } from '../../components/ui/Field';
import { useTableState } from '../../hooks/useTableState';
import { useListQuery } from '../../hooks/useResource';
import { formatFCFA, formatDateTime } from '../../lib/format';
import api, { apiErrorMessage } from '../../lib/api';
import { useToast } from '../../components/ui/Toast';

export default function AvoirsPage() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const table = useTableState({ initialSize: 10 });
  const { data, isLoading, isError, error, refetch } = useListQuery('avoirs', table.params);

  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ venteNumero: '', motif: '', montant: '' });
  const [cancelTarget, setCancelTarget] = useState(null);

  const create = useMutation({
    mutationFn: (payload) => api.post('/avoirs', payload).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['avoirs'] });
      toast.success('Avoir émis avec succès.');
      setModalOpen(false);
      setForm({ venteNumero: '', motif: '', montant: '' });
    },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });

  const annuler = useMutation({
    mutationFn: (id) => api.post(`/avoirs/${id}/annuler`).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['avoirs'] });
      toast.success('Avoir annulé.');
      setCancelTarget(null);
    },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });

  return (
    <div>
      <PageHeader
        title="Avoirs"
        subtitle="Émission d'avoirs liés à un ticket payé, avec motif obligatoire."
        actions={<button className="btn-primary" onClick={() => setModalOpen(true)}><Plus size={16} /> Nouvel avoir</button>}
      />

      <DataTable
        columns={[
          { key: 'venteNumero', header: 'N° Vente', sortable: true },
          { key: 'motif', header: 'Motif' },
          { key: 'montant', header: 'Montant', render: (r) => formatFCFA(r.montant), className: 'font-semibold' },
          { key: 'dateEmission', header: 'Date', render: (r) => formatDateTime(r.dateEmission) },
          { key: 'validePar', header: 'Validé par' },
          { key: 'statut', header: 'Statut', render: (r) => <StatusBadge status={r.statut} /> },
        ]}
        rows={data?.rows || []}
        total={data?.total || 0}
        totalPages={data?.totalPages || 0}
        page={table.page}
        isLoading={isLoading}
        isError={isError}
        errorMessage={apiErrorMessage(error)}
        onRetry={refetch}
        search={table.search}
        onSearchChange={table.setSearch}
        searchPlaceholder="Rechercher par n° de vente..."
        onPageChange={table.setPage}
        rowActions={(row) => row.statut === 'VALIDE' && (
          <button className="btn-ghost p-1.5 text-danger" title="Annuler" onClick={() => setCancelTarget(row)}>
            <Undo2 size={15} />
          </button>
        )}
        emptyLabel="Aucun avoir émis."
      />

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Émettre un avoir"
        footer={
          <>
            <button className="btn-secondary" onClick={() => setModalOpen(false)}>Annuler</button>
            <button className="btn-primary" onClick={() => create.mutate(form)} disabled={create.isPending}>
              {create.isPending && <Loader2 size={15} className="animate-spin" />} Émettre
            </button>
          </>
        }
      >
        <Field label="Numéro de la vente (ex : FV-2026-0012)" required>
          <input className="input" value={form.venteNumero} onChange={(e) => setForm((f) => ({ ...f, venteNumero: e.target.value }))} />
        </Field>
        <Field label="Motif" required>
          <input className="input" value={form.motif} onChange={(e) => setForm((f) => ({ ...f, motif: e.target.value }))} placeholder="Produit retourné, erreur de caisse..." />
        </Field>
        <Field label="Montant (FCFA)" required>
          <input type="number" className="input" value={form.montant} onChange={(e) => setForm((f) => ({ ...f, montant: e.target.value }))} />
        </Field>
      </Modal>

      <ConfirmDialog
        open={!!cancelTarget}
        onClose={() => setCancelTarget(null)}
        onConfirm={() => annuler.mutate(cancelTarget.id)}
        title="Annuler l'avoir"
        message={`Confirmez-vous l'annulation de l'avoir lié à la vente ${cancelTarget?.venteNumero} ? La traçabilité sera conservée.`}
        confirmLabel="Annuler l'avoir"
        loading={annuler.isPending}
      />
    </div>
  );
}
