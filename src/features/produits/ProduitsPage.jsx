import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Power, History, QrCode, Download, Printer } from 'lucide-react';
import api, { apiErrorMessage, fetchAuthenticatedBlobUrl } from '../../lib/api';
import { downloadExport } from '../../lib/download';
import DataTable from '../../components/ui/DataTable';
import Modal from '../../components/ui/Modal';
import PageHeader from '../../components/ui/PageHeader';
import StatusBadge from '../../components/ui/StatusBadge';
import { Select } from '../../components/ui/Field';
import ProduitFormModal from './ProduitFormModal';
import { useTableState } from '../../hooks/useTableState';
import { useListQuery } from '../../hooks/useResource';
import { formatFCFA, formatDateTime } from '../../lib/format';
import { useToast } from '../../components/ui/Toast';
import { useAuthStore } from '../../store/authStore';
import { isSuperAdmin } from '../../lib/perimetre';

export default function ProduitsPage() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const superAdmin = isSuperAdmin(user);

  const location = useLocation();
  const table = useTableState({ initialSize: 10, extraFilters: { etablissementId: '' } });
  // Un raccourci du menu (Restaurant/Cave à vin/Maquis) pointe vers cette même route en ne changeant
  // que ?etablissementId=X — React Router ne redémarre pas le composant dans ce cas, donc il faut
  // resynchroniser le filtre à chaque changement d'URL, pas seulement le lire une fois au montage.
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    table.setFilters({ etablissementId: params.get('etablissementId') || '' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.search]);
  const { data, isLoading, isError, error, refetch } = useListQuery('produits', table.params);
  const { data: etablissements } = useQuery({ queryKey: ['etablissements'], queryFn: async () => (await api.get('/etablissements')).data });

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [historyTarget, setHistoryTarget] = useState(null);
  const [qrTarget, setQrTarget] = useState(null);
  const [qrBlobUrl, setQrBlobUrl] = useState(null);

  // Recommandations et corrections.md §5 : le QR code est authentifié (JWT), donc récupéré en
  // blob comme les autres exports (§api.js) plutôt qu'affiché via un simple <img src="...">.
  useEffect(() => {
    if (!qrTarget) { setQrBlobUrl(null); return undefined; }
    let url;
    fetchAuthenticatedBlobUrl(`/produits/${qrTarget.id}/qrcode.png`)
      .then((u) => { url = u; setQrBlobUrl(u); })
      .catch((e) => toast.error(apiErrorMessage(e)));
    return () => { if (url) URL.revokeObjectURL(url); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qrTarget]);

  function imprimerQrCode() {
    const fenetre = window.open('', '_blank', 'width=400,height=500');
    if (!fenetre) return;
    fenetre.document.write(`<html><head><title>QR — ${qrTarget?.nom || ''}</title></head>
      <body style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;margin:0;font-family:sans-serif;">
        <img src="${qrBlobUrl}" style="width:280px;height:280px;" onload="window.print()" />
        <p style="margin-top:12px;">${qrTarget?.nom || ''}</p>
      </body></html>`);
    fenetre.document.close();
  }

  const { data: historique } = useQuery({
    queryKey: ['historique-prix', historyTarget?.id],
    queryFn: async () => (await api.get(`/produits/${historyTarget.id}/historique-prix`)).data,
    enabled: !!historyTarget,
  });

  const toggleActif = useMutation({
    mutationFn: (id) => api.patch(`/produits/${id}/statut`).then((r) => r.data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['produits'] }); toast.success('Statut mis à jour.'); },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });

  function openCreate() { setEditing(null); setModalOpen(true); }
  function openEdit(p) { setEditing(p); setModalOpen(true); }

  return (
    <div>
      <PageHeader
        title="Produits"
        subtitle="Catalogue et tarifs de votre établissement."
        actions={<button className="btn-primary" onClick={openCreate}><Plus size={16} /> Nouveau produit</button>}
      />

      <DataTable
        columns={[
          { key: 'nom', header: 'Nom', sortable: true },
          { key: 'categorieNom', header: 'Catégorie' },
          { key: 'etablissementNom', header: 'Établissement' },
          { key: 'unite', header: 'Unité' },
          { key: 'prixVente', header: 'Prix de vente', render: (r) => formatFCFA(r.prixVente) },
          {
            key: 'quantiteStock',
            header: 'Stock',
            render: (r) => r.suiviStock
              ? <span className={r.seuilAlerte != null && r.quantiteStock <= r.seuilAlerte ? 'text-danger font-bold' : ''}>{r.quantiteStock}</span>
              : '—',
          },
          { key: 'disponible', header: 'Disponible', render: (r) => <StatusBadge status={r.disponible} /> },
          { key: 'actif', header: 'Statut', render: (r) => <StatusBadge status={r.actif} /> },
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
        searchPlaceholder="Rechercher un produit..."
        onPageChange={table.setPage}
        toolbar={superAdmin && (
          <Select className="w-auto" value={table.filters.etablissementId} onChange={(e) => table.setFilters({ etablissementId: e.target.value })}>
            <option value="">Choisir un établissement</option>
            {(etablissements || []).map((et) => <option key={et.id} value={et.id}>{et.nom}</option>)}
          </Select>
        )}
        rowActions={(row) => (
          <>
            <button className="btn-ghost p-1.5" title="Modifier" onClick={() => openEdit(row)}><Pencil size={15} /></button>
            <button className="btn-ghost p-1.5" title="Historique des prix" onClick={() => setHistoryTarget(row)}><History size={15} /></button>
            <button className="btn-ghost p-1.5" title="QR code" onClick={() => setQrTarget(row)}><QrCode size={15} /></button>
            <button className={`btn-ghost p-1.5 ${row.actif ? 'text-danger' : 'text-success'}`} title={row.actif ? 'Désactiver' : 'Activer'} onClick={() => toggleActif.mutate(row.id)}>
              <Power size={15} />
            </button>
          </>
        )}
        emptyLabel="Aucun produit."
      />

      <ProduitFormModal open={modalOpen} onClose={() => setModalOpen(false)} editing={editing} />

      <Modal
        open={!!qrTarget}
        onClose={() => setQrTarget(null)}
        title={`QR code — ${qrTarget?.nom || ''}`}
        footer={<>
          <button className="btn-secondary" onClick={() => setQrTarget(null)}>Fermer</button>
          <button
            className="btn-secondary"
            disabled={!qrBlobUrl}
            onClick={() => downloadExport(`/produits/${qrTarget.id}/qrcode.png`, {}, `qr-${qrTarget.nom}.png`).catch((e) => toast.error(apiErrorMessage(e)))}
          >
            <Download size={15} /> Télécharger
          </button>
          <button className="btn-primary" disabled={!qrBlobUrl} onClick={imprimerQrCode}><Printer size={15} /> Imprimer</button>
        </>}
      >
        <div className="flex flex-col items-center gap-3">
          {qrBlobUrl ? <img src={qrBlobUrl} alt={`QR code ${qrTarget?.nom}`} className="w-64 h-64" /> : <p className="text-sm text-ink-light">Génération...</p>}
          <p className="text-sm text-ink-light">À scanner depuis Nouvelle commande, Nouvelle entrée ou Nouvelle sortie.</p>
        </div>
      </Modal>

      <Modal open={!!historyTarget} onClose={() => setHistoryTarget(null)} title={`Historique des prix — ${historyTarget?.nom || ''}`}>
        <div className="flex flex-col gap-2">
          {(historique || []).length === 0 && <p className="text-sm text-ink-light">Aucun changement de prix enregistré.</p>}
          {(historique || []).map((h) => (
            <div key={h.id} className="flex items-center justify-between text-sm border-b border-black/5 pb-2">
              <span>{formatFCFA(h.ancienPrix)} → {formatFCFA(h.nouveauPrix)}</span>
              <span className="text-ink-light text-xs">{formatDateTime(h.dateEffet)} · {h.auteurNom || '—'}</span>
            </div>
          ))}
        </div>
      </Modal>
    </div>
  );
}
