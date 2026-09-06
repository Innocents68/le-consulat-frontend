import { useState } from 'react';
import { Plus, Pencil, Archive } from 'lucide-react';
import DataTable from '../ui/DataTable';
import Modal from '../ui/Modal';
import ConfirmDialog from '../ui/ConfirmDialog';
import { Field, Select, TextArea } from '../ui/Field';
import PageHeader from '../ui/PageHeader';
import { useTableState } from '../../hooks/useTableState';
import { useListQuery, useCrudMutations } from '../../hooks/useResource';
import { useToast } from '../ui/Toast';
import { apiErrorMessage } from '../../lib/api';

/**
 * Generic list + create/edit-modal + archive page for simple CRUD resources
 * (categories, fournisseurs, dépôts...). Column/field definitions are declarative.
 */
export default function SimpleCrudPage({
  resource,
  title,
  subtitle,
  columns,
  fields,
  searchPlaceholder = 'Rechercher...',
  emptyDefaults = {},
  canCreate = true,
  canEdit = true,
  canDelete = true,
  deleteLabel = 'Archiver',
  extraToolbar,
}) {
  const table = useTableState({ initialSize: 10 });
  const { data, isLoading, isError, error, refetch } = useListQuery(resource, table.params);
  const { create, update, remove } = useCrudMutations(resource);
  const toast = useToast();

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyDefaults);
  const [confirmDelete, setConfirmDelete] = useState(null);

  function openCreate() {
    setEditing(null);
    setForm(emptyDefaults);
    setModalOpen(true);
  }

  function openEdit(row) {
    setEditing(row);
    setForm(row);
    setModalOpen(true);
  }

  function setField(name, value) {
    setForm((f) => ({ ...f, [name]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    try {
      if (editing) {
        await update.mutateAsync({ id: editing.id, ...form });
        toast.success('Modifications enregistrées.');
      } else {
        await create.mutateAsync(form);
        toast.success('Créé avec succès.');
      }
      setModalOpen(false);
    } catch (err) {
      toast.error(apiErrorMessage(err));
    }
  }

  async function handleDelete() {
    try {
      await remove.mutateAsync(confirmDelete.id);
      toast.success('Archivé avec succès.');
      setConfirmDelete(null);
    } catch (err) {
      toast.error(apiErrorMessage(err));
    }
  }

  return (
    <div>
      <PageHeader
        title={title}
        subtitle={subtitle}
        actions={canCreate && (
          <button className="btn-primary" onClick={openCreate}>
            <Plus size={16} /> Nouveau
          </button>
        )}
      />

      <DataTable
        columns={columns}
        rows={data?.rows || []}
        total={data?.total || 0}
        totalPages={data?.totalPages || 0}
        page={table.page}
        size={table.size}
        isLoading={isLoading}
        isError={isError}
        errorMessage={apiErrorMessage(error)}
        onRetry={refetch}
        search={table.search}
        onSearchChange={table.setSearch}
        searchPlaceholder={searchPlaceholder}
        sort={table.sort}
        onSortChange={table.toggleSort}
        onPageChange={table.setPage}
        toolbar={extraToolbar}
        rowActions={(row) => (
          <>
            {canEdit && (
              <button className="btn-ghost p-1.5" title="Modifier" onClick={() => openEdit(row)}>
                <Pencil size={15} />
              </button>
            )}
            {canDelete && row.actif !== false && (
              <button className="btn-ghost p-1.5 text-danger" title={deleteLabel} onClick={() => setConfirmDelete(row)}>
                <Archive size={15} />
              </button>
            )}
          </>
        )}
      />

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Modifier' : 'Nouveau'}
        footer={
          <>
            <button className="btn-secondary" onClick={() => setModalOpen(false)}>Annuler</button>
            <button className="btn-primary" onClick={handleSubmit} disabled={create.isPending || update.isPending}>
              {editing ? 'Enregistrer' : 'Créer'}
            </button>
          </>
        }
      >
        <form onSubmit={handleSubmit}>
          {fields.map((f) => (
            <Field key={f.name} label={f.label} required={f.required}>
              {f.type === 'select' ? (
                <Select value={form[f.name] ?? ''} onChange={(e) => setField(f.name, e.target.value)} required={f.required}>
                  <option value="">Sélectionner...</option>
                  {f.options.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </Select>
              ) : f.type === 'textarea' ? (
                <TextArea value={form[f.name] ?? ''} onChange={(e) => setField(f.name, e.target.value)} required={f.required} />
              ) : f.type === 'checkbox' ? (
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={!!form[f.name]} onChange={(e) => setField(f.name, e.target.checked)} />
                  {f.checkboxLabel || 'Actif'}
                </label>
              ) : (
                <input
                  type={f.type || 'text'}
                  step={f.step}
                  className="input"
                  value={form[f.name] ?? ''}
                  onChange={(e) => setField(f.name, f.type === 'number' ? e.target.valueAsNumber || 0 : e.target.value)}
                  required={f.required}
                  placeholder={f.placeholder}
                />
              )}
            </Field>
          ))}
        </form>
      </Modal>

      <ConfirmDialog
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={handleDelete}
        title={deleteLabel}
        message={`Confirmez-vous l'archivage de "${confirmDelete?.nom || confirmDelete?.numero || confirmDelete?.id}" ?`}
        confirmLabel={deleteLabel}
        loading={remove.isPending}
      />
    </div>
  );
}
