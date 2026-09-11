import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { PlayCircle, Download, RotateCcw, Upload, AlertTriangle } from 'lucide-react';
import api, { apiErrorMessage } from '../../lib/api';
import { downloadExport } from '../../lib/download';
import DataTable from '../../components/ui/DataTable';
import Modal from '../../components/ui/Modal';
import PageHeader from '../../components/ui/PageHeader';
import StatusBadge from '../../components/ui/StatusBadge';
import { useTableState } from '../../hooks/useTableState';
import { useListQuery } from '../../hooks/useResource';
import { formatDateTime } from '../../lib/format';
import { useToast } from '../../components/ui/Toast';
import { useAuthStore } from '../../store/authStore';

const PHRASE_CONFIRMATION = 'RESTAURER';

function formatTaille(octets) {
  if (!octets) return '—';
  const mo = octets / (1024 * 1024);
  return mo >= 1 ? `${mo.toFixed(1)} Mo` : `${(octets / 1024).toFixed(0)} Ko`;
}

/** §6.10.2 (EF-044/045). RG-106 : une restauration est une opération critique — double
 * confirmation (cet écran + la phrase RESTAURER revérifiée côté serveur), journalisée, déconnecte
 * tous les utilisateurs (y compris le poste courant, immédiatement après le succès). */
export default function SauvegardesPage() {
  const toast = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const logout = useAuthStore((s) => s.logout);

  const table = useTableState({ initialSize: 15 });
  const { data, isLoading, isError, error, refetch } = useListQuery('sauvegardes', table.params);

  const [restaurerTarget, setRestaurerTarget] = useState(null); // { id, nomFichier } ou { fichier: File }
  const [confirmation, setConfirmation] = useState('');
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadOpen, setUploadOpen] = useState(false);

  const declencher = useMutation({
    mutationFn: () => api.post('/sauvegardes').then((r) => r.data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['sauvegardes'] }); toast.success('Sauvegarde déclenchée.'); },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });

  const restaurer = useMutation({
    mutationFn: () => {
      if (restaurerTarget?.fichier) {
        const body = new FormData();
        body.append('fichier', restaurerTarget.fichier);
        body.append('confirmation', confirmation);
        return api.post('/sauvegardes/restaurer-fichier', body, { headers: { 'Content-Type': undefined } });
      }
      return api.post(`/sauvegardes/${restaurerTarget.id}/restaurer`, { confirmation });
    },
    onSuccess: () => {
      toast.success('Restauration effectuée — déconnexion en cours...');
      logout();
      navigate('/login', { replace: true });
    },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });

  function closeRestaurer() {
    setRestaurerTarget(null);
    setConfirmation('');
    setUploadFile(null);
    setUploadOpen(false);
  }

  async function telecharger(row) {
    try {
      await downloadExport(`/sauvegardes/${row.id}/fichier`, {}, row.nomFichier);
    } catch (e) {
      toast.error(apiErrorMessage(e));
    }
  }

  return (
    <div>
      <PageHeader
        title="Sauvegardes"
        subtitle="Sauvegarde complète, historique et restauration (§6.10.2)."
        actions={<>
          <button className="btn-secondary" onClick={() => setUploadOpen(true)}><Upload size={15} /> Restaurer depuis un fichier</button>
          <button className="btn-primary" onClick={() => declencher.mutate()} disabled={declencher.isPending}><PlayCircle size={16} /> Déclencher une sauvegarde</button>
        </>}
      />

      <DataTable
        columns={[
          { key: 'nomFichier', header: 'Fichier' },
          { key: 'type', header: 'Type', render: (r) => r.type === 'MANUELLE' ? 'Manuelle' : 'Automatique' },
          { key: 'statut', header: 'Statut', render: (r) => <StatusBadge status={r.statut === 'REUSSIE' ? 'VALIDE' : 'ANNULEE'} label={r.statut === 'REUSSIE' ? 'Réussie' : 'Échouée'} /> },
          { key: 'tailleOctets', header: 'Taille', render: (r) => formatTaille(r.tailleOctets) },
          { key: 'auteurNom', header: 'Auteur', render: (r) => r.auteurNom || 'Système' },
          { key: 'dateCreation', header: 'Date', render: (r) => formatDateTime(r.dateCreation) },
        ]}
        rows={data?.rows || []}
        total={data?.total || 0}
        totalPages={data?.totalPages || 0}
        page={table.page}
        isLoading={isLoading}
        isError={isError}
        errorMessage={apiErrorMessage(error)}
        onRetry={refetch}
        onPageChange={table.setPage}
        rowActions={(row) => row.statut === 'REUSSIE' ? (
          <>
            <button className="btn-ghost p-1.5" title="Télécharger" onClick={() => telecharger(row)}><Download size={15} /></button>
            <button className="btn-ghost p-1.5 text-danger" title="Restaurer" onClick={() => setRestaurerTarget({ id: row.id, nomFichier: row.nomFichier })}><RotateCcw size={15} /></button>
          </>
        ) : null}
        emptyLabel="Aucune sauvegarde."
      />

      <Modal
        open={uploadOpen}
        onClose={closeRestaurer}
        title="Restaurer depuis un fichier"
        footer={<>
          <button className="btn-secondary" onClick={closeRestaurer}>Annuler</button>
          <button className="btn-primary" disabled={!uploadFile} onClick={() => { setRestaurerTarget({ fichier: uploadFile }); setUploadOpen(false); }}>Continuer</button>
        </>}
      >
        <p className="text-sm text-ink-light mb-3">Sélectionnez un fichier de sauvegarde (.dump) à restaurer.</p>
        <input type="file" accept=".dump" onChange={(e) => setUploadFile(e.target.files?.[0] || null)} />
      </Modal>

      <Modal
        open={!!restaurerTarget && !uploadOpen}
        onClose={closeRestaurer}
        title="Confirmer la restauration"
        footer={<>
          <button className="btn-secondary" onClick={closeRestaurer}>Annuler</button>
          <button className="btn-danger" disabled={confirmation !== PHRASE_CONFIRMATION || restaurer.isPending} onClick={() => restaurer.mutate()}>
            Restaurer définitivement
          </button>
        </>}
      >
        <div className="rounded-lg bg-danger/10 border border-danger/30 text-danger text-sm px-3 py-2 flex items-start gap-2 mb-4">
          <AlertTriangle size={16} className="mt-0.5 shrink-0" />
          <span>
            Cette action remplace <strong>toutes les données actuelles</strong> par le contenu de{' '}
            {restaurerTarget?.fichier ? <em>{restaurerTarget.fichier.name}</em> : <em>{restaurerTarget?.nomFichier}</em>}.
            Elle est <strong>irréversible</strong> et déconnecte immédiatement tous les utilisateurs, y compris vous-même (RG-106).
          </span>
        </div>
        <label className="label">Tapez « {PHRASE_CONFIRMATION} » pour confirmer</label>
        <input className="input" value={confirmation} onChange={(e) => setConfirmation(e.target.value)} placeholder={PHRASE_CONFIRMATION} autoFocus />
      </Modal>
    </div>
  );
}
