import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Eye, Download } from 'lucide-react';
import api, { apiErrorMessage, openAuthenticatedFile } from '../../lib/api';
import DataTable from '../../components/ui/DataTable';
import Modal from '../../components/ui/Modal';
import PageHeader from '../../components/ui/PageHeader';
import StatusBadge from '../../components/ui/StatusBadge';
import { Select } from '../../components/ui/Field';
import { useTableState } from '../../hooks/useTableState';
import { useListQuery } from '../../hooks/useResource';
import { formatFCFA, formatDateTime } from '../../lib/format';
import { useAuthStore } from '../../store/authStore';
import { isSuperAdmin } from '../../lib/perimetre';
import { useToast } from '../../components/ui/Toast';

/** Liste en lecture seule (RG-065 : un avoir est immuable une fois créé). */
export default function AvoirsPage() {
  const toast = useToast();
  const user = useAuthStore((s) => s.user);
  const superAdmin = isSuperAdmin(user);

  // Préremplissage depuis un raccourci du menu (?etablissementId=X).
  const etablissementIdInitial = new URLSearchParams(window.location.search).get('etablissementId') || '';
  const table = useTableState({ initialSize: 10, extraFilters: { etablissementId: etablissementIdInitial } });
  const { data, isLoading, isError, error, refetch } = useListQuery('avoirs', table.params);
  const { data: etablissements } = useQuery({ queryKey: ['etablissements'], queryFn: async () => (await api.get('/etablissements')).data });

  const [detailId, setDetailId] = useState(null);
  const { data: detail } = useQuery({
    queryKey: ['avoir-detail', detailId],
    queryFn: async () => (await api.get(`/avoirs/${detailId}`)).data,
    enabled: !!detailId,
  });

  return (
    <div>
      <PageHeader title="Avoirs" subtitle="Corrections de factures déjà émises — document immuable (§6.2.7)." />

      <DataTable
        columns={[
          { key: 'numero', header: 'Numéro', sortable: true },
          { key: 'dateCreation', header: 'Date', render: (r) => formatDateTime(r.dateCreation) },
          { key: 'factureNumero', header: 'Facture d\'origine' },
          { key: 'montant', header: 'Montant', render: (r) => `-${formatFCFA(r.montant)}` },
          { key: 'soldeRestant', header: 'Solde restant', render: (r) => formatFCFA(r.soldeRestant) },
          { key: 'statut', header: 'Statut', render: (r) => <StatusBadge status={r.statut} /> },
          { key: 'motif', header: 'Motif' },
          { key: 'modeRemboursement', header: 'Remboursement' },
          { key: 'auteurNom', header: 'Émis par' },
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
        searchPlaceholder="Rechercher un avoir..."
        onPageChange={table.setPage}
        toolbar={superAdmin && (
          <Select className="w-auto" value={table.filters.etablissementId} onChange={(e) => table.setFilters({ etablissementId: e.target.value })}>
            <option value="">Choisir un établissement</option>
            {(etablissements || []).map((et) => <option key={et.id} value={et.id}>{et.nom}</option>)}
          </Select>
        )}
        rowActions={(row) => (
          <>
            <button className="btn-ghost p-1.5" title="Détails" onClick={() => setDetailId(row.id)}><Eye size={15} /></button>
            <button className="btn-ghost p-1.5" title="Télécharger le PDF" onClick={() => openAuthenticatedFile(`/avoirs/${row.id}/avoir.pdf`).catch((e) => toast.error(apiErrorMessage(e)))}><Download size={15} /></button>
          </>
        )}
        emptyLabel="Aucun avoir."
      />

      <Modal open={!!detailId} onClose={() => setDetailId(null)} title={`Avoir ${detail?.numero || ''}`}
        footer={detail && (
          <button className="btn-primary" onClick={() => openAuthenticatedFile(`/avoirs/${detail.id}/avoir.pdf`).catch((e) => toast.error(apiErrorMessage(e)))}><Download size={15} /> PDF</button>
        )}
      >
        {detail && (
          <div className="font-mono text-sm max-w-xs mx-auto">
            <p className="text-center font-bold">{detail.etablissementNom?.toUpperCase()}</p>
            <p className="text-center font-bold text-danger">AVOIR</p>
            <hr className="my-2 border-dashed" />
            <p>N° : {detail.numero}</p>
            <p>Facture d'origine : {detail.factureNumero}</p>
            <p>Émis par : {detail.auteurNom}</p>
            <hr className="my-2 border-dashed" />
            {detail.lignes.map((l) => (
              <div key={l.id} className="flex justify-between">
                <span>{l.quantite > 1 ? `${l.quantite} × ` : ''}{l.articleNom}</span>
                <span>-{formatFCFA(l.montant)}</span>
              </div>
            ))}
            <hr className="my-2 border-dashed" />
            <div className="flex justify-between font-bold"><span>Total avoir</span><span>-{formatFCFA(detail.montant)}</span></div>
            <hr className="my-2 border-dashed" />
            <p>Motif : {detail.motif}{detail.motifDetail ? ` — ${detail.motifDetail}` : ''}</p>
            <p>Remboursement : {detail.modeRemboursement}</p>
            <p>Solde restant : {formatFCFA(detail.soldeRestant)} ({detail.statut === 'DISPONIBLE' ? 'disponible' : 'utilisé'})</p>
          </div>
        )}
      </Modal>
    </div>
  );
}
