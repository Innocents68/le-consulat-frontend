import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Lock, Loader2 } from 'lucide-react';
import { fetchPage, apiErrorMessage } from '../../lib/api';
import { sessionsCaisseApi } from '../ventes-caisse/ventesApi';
import PageHeader from '../../components/ui/PageHeader';
import StatusBadge from '../../components/ui/StatusBadge';
import Modal from '../../components/ui/Modal';
import { Field } from '../../components/ui/Field';
import { Loader, ErrorState, EmptyState } from '../../components/ui/Feedback';
import { formatFCFA, formatDateTime } from '../../lib/format';
import { useAuthStore } from '../../store/authStore';
import { useToast } from '../../components/ui/Toast';

export default function CaissesPage() {
  const toast = useToast();
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();
  const [openModal, setOpenModal] = useState(false);
  const [closeTarget, setCloseTarget] = useState(null);
  const [montantReel, setMontantReel] = useState('');
  const [caisseNom, setCaisseNom] = useState('');
  const [fondInitial, setFondInitial] = useState(50000);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['sessions-caisse', 'toutes'],
    queryFn: () => fetchPage('/sessions-caisse', { size: 50, sort: 'dateOuverture,desc' }),
    retry: 1,
  });

  const ouvrir = useMutation({
    mutationFn: () => sessionsCaisseApi.ouvrir({ caisseNom, ouvertPar: user?.nom || user?.username, fondInitial: Number(fondInitial) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions-caisse'] });
      toast.success('Caisse ouverte avec succès.');
      setOpenModal(false);
      setCaisseNom('');
    },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });

  const cloturer = useMutation({
    mutationFn: () => sessionsCaisseApi.cloturer(closeTarget.id, { montantReel: Number(montantReel) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions-caisse'] });
      toast.success('Session clôturée, rapport de caisse généré.');
      setCloseTarget(null);
      setMontantReel('');
    },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });

  const sessions = data?.rows || [];
  const ouvertes = sessions.filter((s) => s.statut === 'OUVERTE');
  const fermees = sessions.filter((s) => s.statut !== 'OUVERTE');

  return (
    <div>
      <PageHeader
        title="Gestion des caisses"
        subtitle="Ouverture, suivi en temps réel et clôture (Z de caisse)."
        actions={<button className="btn-primary" onClick={() => setOpenModal(true)}><Plus size={16} /> Nouvelle caisse</button>}
      />

      {isLoading && <Loader />}
      {isError && <ErrorState message={apiErrorMessage(error, 'Impossible de charger les caisses.')} onRetry={refetch} />}

      {!isLoading && !isError && (
        <>
          <h3 className="section-title mb-3">Caisses ouvertes</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {ouvertes.length === 0 && <EmptyState label="Aucune caisse ouverte actuellement." />}
            {ouvertes.map((s) => (
              <div key={s.id} className="card p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="font-bold text-ink dark:text-cream-100">{s.caisseNom}</p>
                  <StatusBadge status={s.statut} />
                </div>
                <p className="text-2xl font-extrabold text-ink dark:text-cream-100 mb-1">{formatFCFA(s.totalVentes ?? s.fondInitial)}</p>
                <p className="text-xs text-ink-light mb-3">Ouverte par {s.ouvertPar} · {formatDateTime(s.dateOuverture)}</p>
                <button className="btn-secondary w-full" onClick={() => setCloseTarget(s)}>
                  <Lock size={14} /> Clôturer
                </button>
              </div>
            ))}
          </div>

          <h3 className="section-title mb-3">Historique des caisses</h3>
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-cream-100/70 dark:bg-white/5 text-left">
                    <th className="px-4 py-2.5 text-[11px] font-bold uppercase text-ink-light">Caisse</th>
                    <th className="px-4 py-2.5 text-[11px] font-bold uppercase text-ink-light">Ouverture</th>
                    <th className="px-4 py-2.5 text-[11px] font-bold uppercase text-ink-light">Fermeture</th>
                    <th className="px-4 py-2.5 text-[11px] font-bold uppercase text-ink-light">Montant attendu</th>
                    <th className="px-4 py-2.5 text-[11px] font-bold uppercase text-ink-light">Écart</th>
                    <th className="px-4 py-2.5 text-[11px] font-bold uppercase text-ink-light">Responsable</th>
                  </tr>
                </thead>
                <tbody>
                  {fermees.length === 0 && (
                    <tr><td colSpan={6} className="text-center py-8 text-ink-light text-sm">Aucun historique.</td></tr>
                  )}
                  {fermees.map((s) => (
                    <tr key={s.id} className="border-t border-black/5 dark:border-white/5">
                      <td className="px-4 py-2.5 font-medium">{s.caisseNom}</td>
                      <td className="px-4 py-2.5">{formatDateTime(s.dateOuverture)}</td>
                      <td className="px-4 py-2.5">{formatDateTime(s.dateFermeture)}</td>
                      <td className="px-4 py-2.5">{formatFCFA(s.totalEncaissements)}</td>
                      <td className={`px-4 py-2.5 font-semibold ${s.ecart < 0 ? 'text-danger' : s.ecart > 0 ? 'text-warning' : 'text-success'}`}>
                        {s.ecart != null ? formatFCFA(s.ecart) : '—'}
                      </td>
                      <td className="px-4 py-2.5">{s.ouvertPar}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      <Modal
        open={openModal}
        onClose={() => setOpenModal(false)}
        title="Ouvrir une nouvelle caisse"
        footer={
          <>
            <button className="btn-secondary" onClick={() => setOpenModal(false)}>Annuler</button>
            <button className="btn-primary" onClick={() => ouvrir.mutate()} disabled={ouvrir.isPending || !caisseNom}>
              {ouvrir.isPending && <Loader2 size={15} className="animate-spin" />} Ouvrir
            </button>
          </>
        }
      >
        <Field label="Nom de la caisse" required>
          <input className="input" value={caisseNom} onChange={(e) => setCaisseNom(e.target.value)} placeholder="Caisse N°1" />
        </Field>
        <Field label="Fond de caisse initial (FCFA)" required>
          <input type="number" className="input" value={fondInitial} onChange={(e) => setFondInitial(e.target.value)} />
        </Field>
      </Modal>

      <Modal
        open={!!closeTarget}
        onClose={() => setCloseTarget(null)}
        title={`Clôturer ${closeTarget?.caisseNom || ''}`}
        footer={
          <>
            <button className="btn-secondary" onClick={() => setCloseTarget(null)}>Annuler</button>
            <button className="btn-danger" onClick={() => cloturer.mutate()} disabled={cloturer.isPending}>
              {cloturer.isPending && <Loader2 size={15} className="animate-spin" />} Clôturer (Z)
            </button>
          </>
        }
      >
        <p className="text-sm text-ink-light mb-3">L'écart théorique/réel sera calculé automatiquement et un rapport de caisse sera généré.</p>
        <Field label="Montant réel compté (FCFA)" required>
          <input type="number" className="input" value={montantReel} onChange={(e) => setMontantReel(e.target.value)} autoFocus />
        </Field>
      </Modal>
    </div>
  );
}
