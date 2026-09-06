import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { DatabaseBackup, RotateCcw, Loader2 } from 'lucide-react';
import api, { fetchPage, apiErrorMessage } from '../../lib/api';
import PageHeader from '../../components/ui/PageHeader';
import { Loader, ErrorState, EmptyState } from '../../components/ui/Feedback';
import { formatDateTime } from '../../lib/format';
import { useToast } from '../../components/ui/Toast';
import { useState } from 'react';
import ConfirmDialog from '../../components/ui/ConfirmDialog';

export default function SauvegardePage() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [restoreTarget, setRestoreTarget] = useState(null);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['sauvegardes'],
    queryFn: () => fetchPage('/sauvegardes', { size: 50 }),
    retry: 1,
  });

  const create = useMutation({
    mutationFn: () => api.post('/sauvegardes').then((r) => r.data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['sauvegardes'] }); toast.success('Sauvegarde lancée.'); },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });
  const restaurer = useMutation({
    mutationFn: (id) => api.post(`/sauvegardes/${id}/restaurer`).then((r) => r.data),
    onSuccess: () => { toast.success('Restauration effectuée.'); setRestoreTarget(null); },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });

  return (
    <div>
      <PageHeader
        title="Sauvegarde / Restauration"
        subtitle="Sauvegardes automatiques et manuelles de la base de données."
        actions={<button className="btn-primary" onClick={() => create.mutate()} disabled={create.isPending}>
          {create.isPending ? <Loader2 size={15} className="animate-spin" /> : <DatabaseBackup size={15} />} Sauvegarder maintenant
        </button>}
      />

      {isLoading && <Loader />}
      {isError && <ErrorState message={apiErrorMessage(error, 'Impossible de charger les sauvegardes.')} onRetry={refetch} />}

      {!isLoading && !isError && (
        <div className="card overflow-hidden">
          {(data?.rows?.length ?? 0) === 0 ? (
            <EmptyState label="Aucune sauvegarde enregistrée pour le moment." />
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-cream-100/70 dark:bg-white/5 text-left">
                  <th className="px-4 py-2.5 text-[11px] font-bold uppercase text-ink-light">Date</th>
                  <th className="px-4 py-2.5 text-[11px] font-bold uppercase text-ink-light">Taille</th>
                  <th className="px-4 py-2.5 text-[11px] font-bold uppercase text-ink-light">Statut</th>
                  <th className="px-4 py-2.5 text-[11px] font-bold uppercase text-ink-light text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.rows.map((s) => (
                  <tr key={s.id} className="border-t border-black/5 dark:border-white/5">
                    <td className="px-4 py-2.5">{formatDateTime(s.date ?? s.dateCreation)}</td>
                    <td className="px-4 py-2.5">{s.taille || '—'}</td>
                    <td className="px-4 py-2.5">{s.statut || 'Terminée'}</td>
                    <td className="px-4 py-2.5 text-right">
                      <button className="btn-ghost p-1.5" title="Restaurer" onClick={() => setRestoreTarget(s)}>
                        <RotateCcw size={15} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      <ConfirmDialog
        open={!!restoreTarget}
        onClose={() => setRestoreTarget(null)}
        onConfirm={() => restaurer.mutate(restoreTarget.id)}
        title="Restaurer cette sauvegarde"
        message="Cette action remplacera les données actuelles par celles de la sauvegarde sélectionnée. Continuer ?"
        loading={restaurer.isPending}
      />
    </div>
  );
}
