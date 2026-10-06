import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Eye, Download, Plus } from 'lucide-react';
import api, { apiErrorMessage, openAuthenticatedFile } from '../../lib/api';
import DataTable from '../../components/ui/DataTable';
import Modal from '../../components/ui/Modal';
import PageHeader from '../../components/ui/PageHeader';
import StatusBadge from '../../components/ui/StatusBadge';
import { Field, Select } from '../../components/ui/Field';
import { useTableState } from '../../hooks/useTableState';
import { useListQuery } from '../../hooks/useResource';
import { formatFCFA, formatDateTime } from '../../lib/format';
import { useAuthStore } from '../../store/authStore';
import { isSuperAdmin } from '../../lib/perimetre';
import { useToast } from '../../components/ui/Toast';

const MOTIFS = [
  { value: 'ERREUR_SAISIE', label: 'Erreur de saisie' },
  { value: 'PRODUIT_NON_SERVI', label: 'Produit non servi' },
  { value: 'RETOUR', label: 'Retour' },
  { value: 'GESTE_COMMERCIAL', label: 'Geste commercial' },
  { value: 'AUTRE', label: 'Autre' },
];
const MODES_REMBOURSEMENT = [
  { value: 'ESPECES', label: 'Espèces' },
  { value: 'MOBILE_MONEY', label: 'Mobile Money' },
  { value: 'AVOIR_A_VALOIR', label: 'Avoir à valoir' },
  { value: 'NON_REMBOURSE', label: 'Non remboursé' },
];
const EMPTY_NOUVEL_AVOIR = { factureNumero: '', montant: '', motif: 'ERREUR_SAISIE', motifDetail: '', modeRemboursement: 'ESPECES' };

/** Consu_corrige.docx §1 : formulaire libre — saisie directe du numéro de facture et du montant,
 * sans passer par la sélection ligne par ligne (ça reste l'usage normal depuis Factures). */
function NouvelAvoirModal({ open, onClose, onCree }) {
  const toast = useToast();
  const [form, setForm] = useState(EMPTY_NOUVEL_AVOIR);

  const create = useMutation({
    mutationFn: () => api.post('/avoirs', {
      factureNumero: form.factureNumero.trim(),
      montant: Number(form.montant),
      motif: form.motif,
      motifDetail: form.motifDetail || null,
      modeRemboursement: form.modeRemboursement,
    }).then((r) => r.data),
    onSuccess: (avoir) => { toast.success(`Avoir ${avoir.numero} créé.`); setForm(EMPTY_NOUVEL_AVOIR); onCree(); },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });

  function handleClose() { setForm(EMPTY_NOUVEL_AVOIR); onClose(); }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Nouvel avoir"
      footer={<>
        <button className="btn-secondary" onClick={handleClose}>Annuler</button>
        <button className="btn-primary" onClick={() => create.mutate()} disabled={!form.factureNumero || !form.montant || create.isPending}>
          Enregistrer
        </button>
      </>}
    >
      <Field label="Numéro de facture" required hint="Le numéro imprimé sur la facture d'origine.">
        <input className="input" value={form.factureNumero} onChange={(e) => setForm((f) => ({ ...f, factureNumero: e.target.value }))} autoFocus />
      </Field>
      <Field label="Montant de l'avoir (FCFA)" required>
        <input type="number" min="1" className="input" value={form.montant} onChange={(e) => setForm((f) => ({ ...f, montant: e.target.value }))} />
      </Field>
      <Field label="Motif" required>
        <Select value={form.motif} onChange={(e) => setForm((f) => ({ ...f, motif: e.target.value }))}>
          {MOTIFS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
        </Select>
      </Field>
      <Field label="Détail (optionnel)"><input className="input" value={form.motifDetail} onChange={(e) => setForm((f) => ({ ...f, motifDetail: e.target.value }))} /></Field>
      <Field label="Mode de remboursement" required>
        <Select value={form.modeRemboursement} onChange={(e) => setForm((f) => ({ ...f, modeRemboursement: e.target.value }))}>
          {MODES_REMBOURSEMENT.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
        </Select>
      </Field>
    </Modal>
  );
}

/** Liste en lecture seule (RG-065 : un avoir est immuable une fois créé) — hormis la création
 * libre (§1) et le solde consommable au fil des encaissements. */
export default function AvoirsPage() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const superAdmin = isSuperAdmin(user);

  // Préremplissage depuis un raccourci du menu (?etablissementId=X).
  const etablissementIdInitial = new URLSearchParams(window.location.search).get('etablissementId') || '';
  const table = useTableState({ initialSize: 10, extraFilters: { etablissementId: etablissementIdInitial } });
  const { data, isLoading, isError, error, refetch } = useListQuery('avoirs', table.params);
  const { data: etablissements } = useQuery({ queryKey: ['etablissements'], queryFn: async () => (await api.get('/etablissements')).data });

  const [detailId, setDetailId] = useState(null);
  const [nouvelOuvert, setNouvelOuvert] = useState(false);
  const { data: detail } = useQuery({
    queryKey: ['avoir-detail', detailId],
    queryFn: async () => (await api.get(`/avoirs/${detailId}`)).data,
    enabled: !!detailId,
  });

  return (
    <div>
      <PageHeader
        title="Avoirs"
        subtitle="Corrections de factures déjà émises — document immuable (§6.2.7)."
        actions={<button className="btn-primary" onClick={() => setNouvelOuvert(true)}><Plus size={16} /> Nouvel avoir</button>}
      />

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

      <NouvelAvoirModal
        open={nouvelOuvert}
        onClose={() => setNouvelOuvert(false)}
        onCree={() => { setNouvelOuvert(false); queryClient.invalidateQueries({ queryKey: ['avoirs'] }); }}
      />
    </div>
  );
}
