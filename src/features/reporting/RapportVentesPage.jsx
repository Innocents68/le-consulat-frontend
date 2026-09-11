import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Download, FileSpreadsheet } from 'lucide-react';
import api, { apiErrorMessage } from '../../lib/api';
import { downloadExport } from '../../lib/download';
import DataTable from '../../components/ui/DataTable';
import PageHeader from '../../components/ui/PageHeader';
import { Select } from '../../components/ui/Field';
import { useTableState } from '../../hooks/useTableState';
import { useListQuery } from '../../hooks/useResource';
import { formatDate, formatFCFA } from '../../lib/format';
import { useToast } from '../../components/ui/Toast';
import { useAuthStore } from '../../store/authStore';
import { isSuperAdmin } from '../../lib/perimetre';

const MODES = [
  { value: 'ESPECES', label: 'Espèces' },
  { value: 'MOBILE_MONEY', label: 'Mobile Money' },
  { value: 'CARTE', label: 'Carte bancaire' },
  { value: 'VIREMENT', label: 'Virement' },
  { value: 'AUTRE', label: 'Autre' },
];

/** §6.9.3 : ventes détaillées par produit, catégorie, table, utilisateur, jour et heure. */
export default function RapportVentesPage() {
  const toast = useToast();
  const user = useAuthStore((s) => s.user);
  const superAdmin = isSuperAdmin(user);

  const table = useTableState({ initialSize: 15, extraFilters: { etablissementId: '', categorieId: '', produitId: '', utilisateurId: '', modePaiement: '', dateDebut: '', dateFin: '' } });
  const { data, isLoading, isError, error, refetch } = useListQuery('reporting/ventes', table.params);
  const { data: etablissements } = useQuery({ queryKey: ['etablissements'], queryFn: async () => (await api.get('/etablissements')).data });
  const { data: categories } = useQuery({
    queryKey: ['categories', table.filters.etablissementId],
    queryFn: async () => (await api.get('/categories', { params: table.filters.etablissementId ? { etablissementId: table.filters.etablissementId } : {} })).data,
    enabled: superAdmin ? !!table.filters.etablissementId : true,
  });

  const { data: resume } = useQuery({
    queryKey: ['reporting-ventes-resume', table.params],
    queryFn: async () => (await api.get('/reporting/ventes/resume', { params: table.params })).data,
  });

  async function exporter(format) {
    try {
      await downloadExport('/reporting/ventes/export', { ...table.params, format }, `rapport-ventes.${format === 'excel' ? 'xlsx' : 'pdf'}`);
    } catch (e) {
      toast.error(apiErrorMessage(e));
    }
  }

  return (
    <div>
      <PageHeader
        title="Rapport des ventes"
        subtitle="Ventes détaillées par produit, catégorie, table, utilisateur, jour et heure (§6.9.3)."
        actions={<>
          <button className="btn-secondary" onClick={() => exporter('pdf')}><Download size={15} /> PDF</button>
          <button className="btn-secondary" onClick={() => exporter('excel')}><FileSpreadsheet size={15} /> Excel</button>
        </>}
      />

      {resume && (
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="card p-4"><p className="text-xs text-ink-light uppercase font-semibold">Quantité totale</p><p className="text-xl font-bold">{resume.totalQuantite}</p></div>
          <div className="card p-4"><p className="text-xs text-ink-light uppercase font-semibold">Montant total</p><p className="text-xl font-bold">{formatFCFA(resume.totalMontant)}</p></div>
          <div className="card p-4"><p className="text-xs text-ink-light uppercase font-semibold">Panier moyen</p><p className="text-xl font-bold">{formatFCFA(resume.panierMoyen)}</p></div>
        </div>
      )}

      <DataTable
        columns={[
          { key: 'date', header: 'Date', render: (r) => formatDate(r.date) },
          { key: 'heure', header: 'Heure', render: (r) => r.heure?.slice(0, 5) },
          { key: 'produitNom', header: 'Produit' },
          { key: 'categorieNom', header: 'Catégorie' },
          { key: 'tableNumero', header: 'Table', render: (r) => r.tableNumero || 'À emporter' },
          { key: 'utilisateurNom', header: 'Utilisateur' },
          { key: 'quantite', header: 'Quantité' },
          { key: 'montant', header: 'Montant', render: (r) => formatFCFA(r.montant) },
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
        toolbar={<>
          {superAdmin && (
            <Select className="w-auto" value={table.filters.etablissementId} onChange={(e) => table.setFilters({ etablissementId: e.target.value })}>
              <option value="">Tous les établissements</option>
              {(etablissements || []).map((et) => <option key={et.id} value={et.id}>{et.nom}</option>)}
            </Select>
          )}
          <Select className="w-auto" value={table.filters.categorieId} onChange={(e) => table.setFilters({ categorieId: e.target.value })}>
            <option value="">Toutes les catégories</option>
            {(categories || []).map((c) => <option key={c.id} value={c.id}>{c.nom}</option>)}
          </Select>
          <Select className="w-auto" value={table.filters.modePaiement} onChange={(e) => table.setFilters({ modePaiement: e.target.value })}>
            <option value="">Tous les modes</option>
            {MODES.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
          </Select>
          <input type="date" className="input w-auto" value={table.filters.dateDebut} onChange={(e) => table.setFilters({ dateDebut: e.target.value })} />
          <input type="date" className="input w-auto" value={table.filters.dateFin} onChange={(e) => table.setFilters({ dateFin: e.target.value })} />
        </>}
        emptyLabel="Aucune vente sur cette période."
      />
    </div>
  );
}
