import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, X, Save, Loader2 } from 'lucide-react';
import api, { apiErrorMessage } from '../../lib/api';
import PageHeader from '../../components/ui/PageHeader';
import { Loader, ErrorState } from '../../components/ui/Feedback';
import { MODULE_LIST, ROLES } from '../../lib/permissions';
import { useToast } from '../../components/ui/Toast';

const ACTIONS = [
  { key: 'voir', label: 'Voir' },
  { key: 'ajouter', label: 'Ajouter' },
  { key: 'modifier', label: 'Modifier' },
  { key: 'supprimer', label: 'Supprimer' },
];

export default function ProfilsDroitsPage() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [activeRole, setActiveRole] = useState('CAISSIER_SERVEUR');
  const [localMatrix, setLocalMatrix] = useState(null);
  const [dirty, setDirty] = useState(false);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['droits-matrice'],
    queryFn: async () => (await api.get('/droits/matrice')).data,
    retry: 1,
  });

  useEffect(() => {
    if (data && !localMatrix) setLocalMatrix(data);
  }, [data, localMatrix]);

  const save = useMutation({
    mutationFn: (matrix) => api.put('/droits/matrice', matrix).then((r) => r.data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['droits-matrice'] }); toast.success('Matrice des droits enregistrée.'); setDirty(false); },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });

  function toggle(moduleKey, action) {
    setLocalMatrix((prev) => {
      const roleMatrix = { ...(prev?.[activeRole] || {}) };
      const moduleRights = { ...(roleMatrix[moduleKey] || { voir: false, ajouter: false, modifier: false, supprimer: false }) };
      moduleRights[action] = !moduleRights[action];
      roleMatrix[moduleKey] = moduleRights;
      return { ...prev, [activeRole]: roleMatrix };
    });
    setDirty(true);
  }

  if (isLoading) return <Loader label="Chargement de la matrice des droits..." />;
  if (isError) return <ErrorState message={apiErrorMessage(error, 'Impossible de charger les droits.')} onRetry={refetch} />;

  const matrix = localMatrix || data || {};
  const roleMatrix = matrix[activeRole] || {};

  return (
    <div>
      <PageHeader
        title="Profils et droits"
        subtitle="Matrice des droits par profil (voir / ajouter / modifier / supprimer)."
        actions={dirty && (
          <button className="btn-primary" onClick={() => save.mutate(localMatrix)} disabled={save.isPending}>
            {save.isPending ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />} Enregistrer
          </button>
        )}
      />

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <div className="card p-3">
          <p className="section-title px-2 mb-2">Profils</p>
          <div className="flex flex-col gap-1">
            {ROLES.map((r) => (
              <button
                key={r.value}
                onClick={() => setActiveRole(r.value)}
                className={`text-left px-3 py-2 rounded-lg text-sm font-medium ${activeRole === r.value ? 'bg-bordeaux-700 text-white' : 'hover:bg-cream-100 dark:hover:bg-white/5 text-ink dark:text-cream-100'}`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>

        <div className="card p-4 lg:col-span-3 overflow-x-auto">
          <p className="font-bold text-ink dark:text-cream-100 mb-3">Droits du profil : {ROLES.find((r) => r.value === activeRole)?.label}</p>
          {(activeRole === 'ADMIN') && (
            <p className="text-xs text-ink-light bg-cream-100 dark:bg-white/5 rounded-lg px-3 py-2 mb-3">Le profil Super Admin dispose de tous les droits par défaut.</p>
          )}
          <table className="w-full text-sm min-w-[500px]">
            <thead>
              <tr className="text-left border-b border-black/10 dark:border-white/10">
                <th className="py-2 font-bold text-ink-light text-xs uppercase">Module</th>
                {ACTIONS.map((a) => <th key={a.key} className="py-2 font-bold text-ink-light text-xs uppercase text-center">{a.label}</th>)}
              </tr>
            </thead>
            <tbody>
              {MODULE_LIST.map(({ key: moduleKey, label: moduleLabel }) => {
                const rights = roleMatrix[moduleKey] || {};
                return (
                  <tr key={moduleKey} className="border-b border-black/5 dark:border-white/5">
                    <td className="py-2.5 font-medium text-ink dark:text-cream-100">{moduleLabel}</td>
                    {ACTIONS.map((a) => (
                      <td key={a.key} className="py-2.5 text-center">
                        <button
                          onClick={() => toggle(moduleKey, a.key)}
                          className={`h-6 w-6 rounded-md inline-flex items-center justify-center ${rights[a.key] ? 'bg-success/15 text-success' : 'bg-danger/10 text-danger'}`}
                        >
                          {rights[a.key] ? <Check size={14} /> : <X size={14} />}
                        </button>
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
