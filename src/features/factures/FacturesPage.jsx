import { useState } from 'react';
import { Download, Eye } from 'lucide-react';
import DataTable from '../../components/ui/DataTable';
import Modal from '../../components/ui/Modal';
import PageHeader from '../../components/ui/PageHeader';
import StatusBadge from '../../components/ui/StatusBadge';
import StatCard from '../../components/ui/StatCard';
import { useTableState } from '../../hooks/useTableState';
import { useListQuery } from '../../hooks/useResource';
import { formatFCFA, formatDateTime, todayISO, daysAgoISO } from '../../lib/format';
import api, { apiErrorMessage } from '../../lib/api';
import { useToast } from '../../components/ui/Toast';
import { Receipt } from 'lucide-react';

const PAYMENT_LABEL = { ESPECES: 'Espèces', MOBILE_MONEY: 'Mobile Money', CARTE: 'Carte' };

export default function FacturesPage() {
  const toast = useToast();
  const table = useTableState({ initialSize: 10, extraFilters: { dateDebut: daysAgoISO(30), dateFin: todayISO() } });
  const { data, isLoading, isError, error, refetch } = useListQuery('factures', table.params);
  const [selected, setSelected] = useState(null);

  const rows = data?.rows || [];
  const totalMontant = rows.reduce((s, r) => s + (r.total || 0), 0);

  async function downloadPdf(id) {
    try {
      const response = await api.get(`/factures/${id}/pdf`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `facture-${id}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (e) {
      toast.error(apiErrorMessage(e, "Le PDF n'a pas pu être généré."));
    }
  }

  return (
    <div>
      <PageHeader title="Factures" subtitle="Ventes payées, consultables et exportables en PDF." />

      <div className="grid grid-cols-2 sm:grid-cols-2 gap-4 mb-4">
        <StatCard icon={Receipt} label="Total factures" value={data?.total ?? 0} />
        <StatCard icon={Receipt} label="Montant total (page)" value={formatFCFA(totalMontant)} />
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        <input type="date" className="input w-auto" value={table.filters.dateDebut} onChange={(e) => table.setFilters({ dateDebut: e.target.value })} />
        <span className="self-center text-ink-light text-sm">au</span>
        <input type="date" className="input w-auto" value={table.filters.dateFin} onChange={(e) => table.setFilters({ dateFin: e.target.value })} />
      </div>

      <DataTable
        columns={[
          { key: 'numero', header: 'N° Facture', sortable: true },
          { key: 'dateVente', header: 'Date', render: (r) => formatDateTime(r.dateVente), sortable: true },
          { key: 'clientNom', header: 'Client', render: (r) => r.clientNom || 'Client comptoir' },
          { key: 'total', header: 'Montant', render: (r) => formatFCFA(r.total), className: 'text-right font-semibold' },
          { key: 'modePaiement', header: 'Paiement', render: (r) => PAYMENT_LABEL[r.modePaiement] || r.modePaiement },
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
        searchPlaceholder="Rechercher une facture..."
        onPageChange={table.setPage}
        onRowClick={setSelected}
        rowActions={(row) => (
          <>
            <button className="btn-ghost p-1.5" title="Voir" onClick={() => setSelected(row)}><Eye size={15} /></button>
            <button className="btn-ghost p-1.5" title="Télécharger PDF" onClick={() => downloadPdf(row.id)}><Download size={15} /></button>
          </>
        )}
        emptyLabel="Aucune facture sur cette période."
      />

      <Modal
        open={!!selected}
        onClose={() => setSelected(null)}
        title={`Facture ${selected?.numero || ''}`}
        size="md"
        footer={
          <>
            <button className="btn-secondary" onClick={() => setSelected(null)}>Fermer</button>
            {selected && <button className="btn-primary" onClick={() => downloadPdf(selected.id)}><Download size={15} /> PDF</button>}
          </>
        }
      >
        {selected && (
          <div>
            <div className="grid grid-cols-2 gap-3 text-sm mb-4">
              <div><p className="text-ink-light text-xs">Client</p><p className="font-medium">{selected.clientNom || 'Client comptoir'}</p></div>
              <div><p className="text-ink-light text-xs">Date</p><p className="font-medium">{formatDateTime(selected.dateVente)}</p></div>
              <div><p className="text-ink-light text-xs">Caissier</p><p className="font-medium">{selected.caissierNom}</p></div>
              <div><p className="text-ink-light text-xs">Paiement</p><p className="font-medium">{PAYMENT_LABEL[selected.modePaiement] || selected.modePaiement}</p></div>
            </div>
            <table className="w-full text-sm mb-3">
              <thead>
                <tr className="text-left text-ink-light text-xs uppercase">
                  <th className="pb-1">Article</th><th className="pb-1">Qté</th><th className="pb-1 text-right">Montant</th>
                </tr>
              </thead>
              <tbody>
                {(selected.lignes || []).map((l) => (
                  <tr key={l.id} className="border-t border-black/5">
                    <td className="py-1.5">{l.produitNom}</td>
                    <td className="py-1.5">{l.quantite}</td>
                    <td className="py-1.5 text-right">{formatFCFA(l.montant)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="flex justify-between font-extrabold text-base border-t border-black/10 pt-2">
              <span>Total</span><span>{formatFCFA(selected.total)}</span>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
