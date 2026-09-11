import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Eye, Ban, CreditCard, FileText, Trash2 } from 'lucide-react';
import api, { apiErrorMessage } from '../../lib/api';
import DataTable from '../../components/ui/DataTable';
import Modal from '../../components/ui/Modal';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import PageHeader from '../../components/ui/PageHeader';
import StatusBadge from '../../components/ui/StatusBadge';
import { Field, Select } from '../../components/ui/Field';
import { useTableState } from '../../hooks/useTableState';
import { useListQuery } from '../../hooks/useResource';
import { formatFCFA, formatDateTime } from '../../lib/format';
import { useToast } from '../../components/ui/Toast';
import { useAuthStore } from '../../store/authStore';
import { isSuperAdmin } from '../../lib/perimetre';
import NouvelleCommandeModal from './NouvelleCommandeModal';
import EncaissementModal from './EncaissementModal';

const STATUT_OPTIONS = ['NON_VALIDEE', 'VALIDEE', 'ENVOYEE_CUISINE', 'EN_PREPARATION', 'PRETE', 'SERVIE', 'ANNULEE'];

export default function CommandesPage() {
  const toast = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const superAdmin = isSuperAdmin(user);

  // Préremplissage depuis un raccourci du Tableau de bord (?etablissementId=X) — un Gérant/Caissier
  // est de toute façon forcé sur son propre établissement côté backend, la valeur lue ici est donc
  // sans effet pour lui, seulement utile au Super Administrateur.
  const etablissementIdInitial = new URLSearchParams(window.location.search).get('etablissementId') || '';
  const table = useTableState({ initialSize: 10, extraFilters: { etablissementId: etablissementIdInitial, statut: '' } });
  const { data, isLoading, isError, error, refetch } = useListQuery('commandes', table.params);
  const { data: etablissements } = useQuery({ queryKey: ['etablissements'], queryFn: async () => (await api.get('/etablissements')).data });

  const [nouvelleOpen, setNouvelleOpen] = useState(false);
  const [detailId, setDetailId] = useState(null);
  const [encaissementCible, setEncaissementCible] = useState(null);
  const [annulerCible, setAnnulerCible] = useState(null);
  const [motif, setMotif] = useState('');

  const { data: detail } = useQuery({
    queryKey: ['commande-detail', detailId],
    queryFn: async () => (await api.get(`/commandes/${detailId}`)).data,
    enabled: !!detailId,
  });
  const { data: remisesDisponibles } = useQuery({
    queryKey: ['remises', detail?.etablissementId],
    queryFn: async () => (await api.get('/remises', { params: { etablissementId: detail.etablissementId } })).data,
    enabled: !!detail,
  });
  const [remiseChoisie, setRemiseChoisie] = useState('');

  const retirerLigne = useMutation({
    mutationFn: (ligneId) => api.delete(`/commandes/${detailId}/lignes/${ligneId}`).then((r) => r.data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['commande-detail', detailId] }); queryClient.invalidateQueries({ queryKey: ['commandes'] }); },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });

  const appliquerRemise = useMutation({
    mutationFn: (remiseId) => api.post(`/commandes/${detailId}/remise/${remiseId}`).then((r) => r.data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['commande-detail', detailId] }); queryClient.invalidateQueries({ queryKey: ['commandes'] }); toast.success('Remise appliquée.'); },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });
  const retirerRemise = useMutation({
    mutationFn: () => api.delete(`/commandes/${detailId}/remise`).then((r) => r.data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['commande-detail', detailId] }); queryClient.invalidateQueries({ queryKey: ['commandes'] }); setRemiseChoisie(''); },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });

  const annuler = useMutation({
    mutationFn: () => api.post(`/commandes/${annulerCible.id}/annuler`, { motif }).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['commandes'] });
      queryClient.invalidateQueries({ queryKey: ['tables-libres'] });
      toast.success('Commande annulée.');
      setAnnulerCible(null);
      setMotif('');
    },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });

  function verFacture(commandeId) {
    // La facture est retrouvée par numéro de commande côté écran Factures — on y navigue
    // simplement en filtrant par recherche, pas de lien direct commande->facture exposé ici.
    navigate(`/factures?commandeId=${commandeId}`);
  }

  return (
    <div>
      <PageHeader
        title="Commandes"
        subtitle="Prise de commande et encaissement."
        actions={<button className="btn-primary" onClick={() => setNouvelleOpen(true)}><Plus size={16} /> Nouvelle commande</button>}
      />

      <DataTable
        columns={[
          { key: 'numero', header: 'Numéro', sortable: true },
          { key: 'dateCreation', header: 'Date', render: (r) => formatDateTime(r.dateCreation) },
          { key: 'tableNumero', header: 'Table', render: (r) => r.tableNumero || '— (à emporter)' },
          { key: 'caissierNom', header: 'Caissier' },
          { key: 'montantNet', header: 'Montant net', render: (r) => formatFCFA(r.montantNet) },
          { key: 'statut', header: 'Statut', render: (r) => <StatusBadge status={r.statut} /> },
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
        searchPlaceholder="Rechercher une commande..."
        onPageChange={table.setPage}
        toolbar={<>
          {superAdmin && (
            <Select className="w-auto" value={table.filters.etablissementId} onChange={(e) => table.setFilters({ etablissementId: e.target.value })}>
              <option value="">Choisir un établissement</option>
              {(etablissements || []).map((et) => <option key={et.id} value={et.id}>{et.nom}</option>)}
            </Select>
          )}
          <Select className="w-auto" value={table.filters.statut} onChange={(e) => table.setFilters({ statut: e.target.value })}>
            <option value="">Tous les statuts</option>
            {STATUT_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
          </Select>
        </>}
        rowActions={(row) => (
          <>
            <button className="btn-ghost p-1.5" title="Détails" onClick={() => setDetailId(row.id)}><Eye size={15} /></button>
            {row.statut === 'NON_VALIDEE' && (
              <>
                <button className="btn-ghost p-1.5 text-success" title="Encaisser" onClick={() => setEncaissementCible(row)}><CreditCard size={15} /></button>
                <button className="btn-ghost p-1.5 text-danger" title="Annuler" onClick={() => setAnnulerCible(row)}><Ban size={15} /></button>
              </>
            )}
            {row.statut !== 'NON_VALIDEE' && row.statut !== 'ANNULEE' && (
              <button className="btn-ghost p-1.5" title="Voir la facture" onClick={() => verFacture(row.id)}><FileText size={15} /></button>
            )}
          </>
        )}
        emptyLabel="Aucune commande."
      />

      <NouvelleCommandeModal open={nouvelleOpen} onClose={() => setNouvelleOpen(false)} />

      <EncaissementModal
        commande={encaissementCible}
        onClose={() => setEncaissementCible(null)}
        onEncaisse={(facture) => { setEncaissementCible(null); navigate(`/factures?open=${facture.id}`); }}
      />

      <Modal open={!!detailId} onClose={() => setDetailId(null)} title={`Commande ${detail?.numero || ''}`}>
        {detail && (
          <div>
            <div className="text-sm mb-3 space-y-1">
              <p><strong>Table :</strong> {detail.tableNumero || 'À emporter'}</p>
              {detail.clientNom && <p><strong>Client :</strong> {detail.clientNom}</p>}
              <p><strong>Caissier :</strong> {detail.caissierNom}</p>
              <p><strong>Statut :</strong> <StatusBadge status={detail.statut} /></p>
              {detail.motifAnnulation && <p><strong>Motif d'annulation :</strong> {detail.motifAnnulation}</p>}
            </div>
            <div className="flex flex-col gap-1.5 mb-3">
              {detail.lignes.map((l) => (
                <div key={l.id} className="flex items-center justify-between text-sm border-b border-black/5 pb-1">
                  <span>{l.quantite} × {l.articleNom}</span>
                  <div className="flex items-center gap-2">
                    <span>{formatFCFA(l.montant)}</span>
                    {detail.statut === 'NON_VALIDEE' && (
                      <button className="btn-ghost p-1 text-danger" onClick={() => retirerLigne.mutate(l.id)}><Trash2 size={13} /></button>
                    )}
                  </div>
                </div>
              ))}
            </div>
            {detail.statut === 'NON_VALIDEE' && (
              <div className="mb-3 rounded-lg bg-cream-100 dark:bg-white/5 p-3">
                <p className="text-xs font-semibold uppercase text-ink-light mb-2">Remise</p>
                {detail.remise > 0 ? (
                  <div className="flex items-center justify-between text-sm">
                    <span>Remise appliquée : -{formatFCFA(detail.remise)}</span>
                    <button className="btn-ghost text-danger text-xs" onClick={() => retirerRemise.mutate()}>Retirer</button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Select className="flex-1" value={remiseChoisie} onChange={(e) => setRemiseChoisie(e.target.value)}>
                      <option value="">Aucune remise</option>
                      {(remisesDisponibles || []).map((r) => (
                        <option key={r.id} value={r.id}>{r.libelle} ({r.type === 'POURCENTAGE' ? `${r.valeur}%` : formatFCFA(r.valeur)})</option>
                      ))}
                    </Select>
                    <button className="btn-secondary text-xs" disabled={!remiseChoisie} onClick={() => appliquerRemise.mutate(remiseChoisie)}>Appliquer</button>
                  </div>
                )}
              </div>
            )}
            <div className="flex justify-between text-sm text-ink-light">
              <span>Total brut</span>
              <span>{formatFCFA(detail.montantBrut)}</span>
            </div>
            {detail.remise > 0 && (
              <div className="flex justify-between text-sm text-ink-light">
                <span>Remise</span>
                <span>-{formatFCFA(detail.remise)}</span>
              </div>
            )}
            <div className="flex justify-between font-semibold border-t border-black/10 pt-2">
              <span>Total net</span>
              <span>{formatFCFA(detail.montantNet)}</span>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={!!annulerCible}
        title="Annuler la commande"
        message={
          <Field label="Motif d'annulation" required>
            <input className="input" value={motif} onChange={(e) => setMotif(e.target.value)} autoFocus />
          </Field>
        }
        confirmLabel="Confirmer l'annulation"
        danger
        loading={annuler.isPending}
        onConfirm={() => { if (!motif.trim()) { toast.error('Le motif est obligatoire.'); return; } annuler.mutate(); }}
        onClose={() => { setAnnulerCible(null); setMotif(''); }}
      />
    </div>
  );
}
