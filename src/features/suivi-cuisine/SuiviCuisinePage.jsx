import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Clock, ChefHat } from 'lucide-react';
import api, { apiErrorMessage } from '../../lib/api';
import PageHeader from '../../components/ui/PageHeader';
import { Select } from '../../components/ui/Field';
import { Loader, ErrorState } from '../../components/ui/Feedback';
import { formatDateTime } from '../../lib/format';
import { useToast } from '../../components/ui/Toast';
import { useAuthStore } from '../../store/authStore';
import { isSuperAdmin } from '../../lib/perimetre';

const ETAPE_SUIVANTE_LABEL = {
  ENVOYEE_CUISINE: 'Prendre en charge',
  EN_PREPARATION: 'Marquer prête',
  PRETE: 'Marquer servie',
};

const SEUIL_ATTENTE_MINUTES = 15; // EF-021 : seuil fixe pour l'instant, paramétrable au Lot 6.

function minutesEcoulees(dateValidation) {
  if (!dateValidation) return 0;
  return Math.floor((Date.now() - new Date(dateValidation).getTime()) / 60000);
}

export default function SuiviCuisinePage() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const superAdmin = isSuperAdmin(user);

  const [etablissementId, setEtablissementId] = useState('');
  const { data: etablissements } = useQuery({
    queryKey: ['etablissements-cuisine'],
    queryFn: async () => (await api.get('/etablissements')).data,
    enabled: superAdmin,
    select: (data) => data.filter((e) => e.gereCuisine),
  });

  // Un seul restaurant existe pour l'instant : présélectionné dès qu'il est connu.
  useEffect(() => {
    if (superAdmin && !etablissementId && etablissements?.length) {
      setEtablissementId(String(etablissements[0].id));
    }
  }, [superAdmin, etablissements, etablissementId]);

  const params = superAdmin ? { etablissementId } : {};
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['suivi-cuisine', etablissementId],
    queryFn: async () => (await api.get('/commandes/suivi-cuisine', { params })).data,
    // EF-020 : rafraîchissement automatique toutes les 10 s (≤ 15 s exigé), pas de WebSocket
    // dans cette reconstruction du projet — le polling périodique suffit à l'exigence.
    refetchInterval: 10000,
    enabled: !superAdmin || !!etablissementId,
  });

  const avancer = useMutation({
    mutationFn: (id) => api.post(`/commandes/${id}/avancer-cuisine`).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suivi-cuisine'] });
      queryClient.invalidateQueries({ queryKey: ['tables-libres'] });
    },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });

  const commandes = data || [];

  return (
    <div>
      <PageHeader
        title="Suivi cuisine"
        subtitle="Commandes envoyées en cuisine — mise à jour automatique."
        actions={superAdmin && (
          <Select className="w-auto" value={etablissementId} onChange={(e) => setEtablissementId(e.target.value)}>
            <option value="" disabled>Choisir un établissement</option>
            {(etablissements || []).map((et) => <option key={et.id} value={et.id}>{et.nom}</option>)}
          </Select>
        )}
      />

      {isLoading && <Loader />}
      {isError && <ErrorState message={apiErrorMessage(error)} onRetry={refetch} />}
      {!isLoading && !isError && commandes.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-ink-light">
          <ChefHat size={32} className="mb-2 opacity-50" />
          <p>Aucune commande en cuisine pour le moment.</p>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {commandes.map((c) => {
          const attente = minutesEcoulees(c.dateValidation);
          const enRetard = attente > SEUIL_ATTENTE_MINUTES;
          return (
            <div key={c.id} className={`rounded-xl border p-4 bg-white dark:bg-night-800 ${enRetard ? 'border-warning' : 'border-black/10 dark:border-white/10'}`}>
              <div className="flex items-center justify-between mb-2">
                <p className="font-bold">{c.numero}</p>
                <span className={`flex items-center gap-1 text-xs font-semibold ${enRetard ? 'text-warning' : 'text-ink-light'}`}>
                  <Clock size={13} /> {attente} min
                </span>
              </div>
              <p className="text-sm text-ink-light mb-1">
                {c.tableNumero ? `Table ${c.tableNumero}` : 'À emporter'} · envoyée à {formatDateTime(c.dateValidation)}
              </p>
              <div className="flex flex-col gap-1 my-3 text-sm">
                {c.lignes.map((l) => (
                  <div key={l.id} className="flex justify-between">
                    <span>{l.quantite} × {l.articleNom}</span>
                  </div>
                ))}
              </div>
              {c.observations && <p className="text-xs italic text-ink-light mb-3">« {c.observations} »</p>}
              <button
                className="btn-primary w-full"
                onClick={() => avancer.mutate(c.id)}
                disabled={avancer.isPending}
              >
                {ETAPE_SUIVANTE_LABEL[c.statut] || 'Étape suivante'}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
