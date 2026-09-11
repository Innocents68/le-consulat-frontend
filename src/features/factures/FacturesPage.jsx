import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Eye, Printer, Download, Undo2 } from 'lucide-react';
import api, { apiErrorMessage, openAuthenticatedFile } from '../../lib/api';
import DataTable from '../../components/ui/DataTable';
import Modal from '../../components/ui/Modal';
import PageHeader from '../../components/ui/PageHeader';
import { Field, Select } from '../../components/ui/Field';
import { useTableState } from '../../hooks/useTableState';
import { useListQuery } from '../../hooks/useResource';
import { formatFCFA, formatDateTime } from '../../lib/format';
import { useToast } from '../../components/ui/Toast';
import { useAuthStore } from '../../store/authStore';
import { isSuperAdmin } from '../../lib/perimetre';

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

function paramsFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return { open: params.get('open'), commandeId: params.get('commandeId'), etablissementId: params.get('etablissementId') };
}

/** Modale de création d'avoir (§6.2.7) — sélection des lignes/quantités à annuler, motif
 * obligatoire (RG-060), mode de remboursement. Affiche le solde restant avant soumission
 * pour que l'utilisateur voie tout de suite la marge disponible (RG-061). */
function CreerAvoirModal({ facture, onClose, onCree }) {
  const toast = useToast();
  const [quantites, setQuantites] = useState({});
  const [motif, setMotif] = useState('ERREUR_SAISIE');
  const [motifDetail, setMotifDetail] = useState('');
  const [modeRemboursement, setModeRemboursement] = useState('ESPECES');

  const { data: avoirsExistants } = useQuery({
    queryKey: ['avoirs-facture', facture?.id],
    queryFn: async () => (await api.get(`/avoirs/par-facture/${facture.id}`)).data,
    enabled: !!facture,
  });
  const dejaEmis = (avoirsExistants || []).reduce((sum, a) => sum + a.montant, 0);
  const soldeRestant = facture ? facture.montantNet - dejaEmis : 0;

  const montantDemande = facture
    ? facture.lignes.reduce((sum, l) => sum + (quantites[l.id] || 0) * (l.montant / l.quantite), 0)
    : 0;

  const create = useMutation({
    mutationFn: () => api.post(`/avoirs/factures/${facture.id}`, {
      lignes: Object.entries(quantites).filter(([, q]) => q > 0).map(([ligneCommandeId, quantite]) => ({ ligneCommandeId: Number(ligneCommandeId), quantite })),
      motif,
      motifDetail: motifDetail || null,
      remiseEnStock: false,
      modeRemboursement,
    }).then((r) => r.data),
    onSuccess: (avoir) => { toast.success(`Avoir ${avoir.numero} créé.`); onCree(avoir); },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });

  if (!facture) return null;

  return (
    <Modal
      open={!!facture}
      onClose={onClose}
      title={`Créer un avoir — facture ${facture.numero}`}
      footer={<>
        <button className="btn-secondary" onClick={onClose}>Annuler</button>
        <button className="btn-primary" onClick={() => create.mutate()} disabled={montantDemande === 0 || montantDemande > soldeRestant || create.isPending}>
          Créer l'avoir
        </button>
      </>}
    >
      <p className="text-sm text-ink-light mb-3">Solde restant avant cet avoir : <strong>{formatFCFA(soldeRestant)}</strong> sur {formatFCFA(facture.montantNet)}.</p>
      <div className="flex flex-col gap-2 mb-3">
        {facture.lignes.map((l) => (
          <div key={l.id} className="flex items-center justify-between text-sm border-b border-black/5 pb-1.5">
            <span>{l.articleNom} (commandé : {l.quantite})</span>
            <input
              type="number" min="0" max={l.quantite} className="input w-20"
              value={quantites[l.id] || 0}
              onChange={(e) => setQuantites((q) => ({ ...q, [l.id]: Math.min(l.quantite, Math.max(0, Number(e.target.value))) }))}
            />
          </div>
        ))}
      </div>
      <div className="flex justify-between text-sm font-semibold mb-3">
        <span>Montant de l'avoir</span>
        <span className={montantDemande > soldeRestant ? 'text-danger' : ''}>{formatFCFA(montantDemande)}</span>
      </div>
      <Field label="Motif" required>
        <Select value={motif} onChange={(e) => setMotif(e.target.value)}>
          {MOTIFS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
        </Select>
      </Field>
      <Field label="Détail (optionnel)"><input className="input" value={motifDetail} onChange={(e) => setMotifDetail(e.target.value)} /></Field>
      <Field label="Mode de remboursement" required>
        <Select value={modeRemboursement} onChange={(e) => setModeRemboursement(e.target.value)}>
          {MODES_REMBOURSEMENT.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
        </Select>
      </Field>
    </Modal>
  );
}

export default function FacturesPage() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const superAdmin = isSuperAdmin(user);
  const [{ open: openParam, commandeId: commandeIdParam, etablissementId: etablissementIdParam }] = useState(paramsFromUrl);

  const table = useTableState({ initialSize: 10, extraFilters: { etablissementId: etablissementIdParam || '', commandeId: commandeIdParam || '' } });
  const { data, isLoading, isError, error, refetch } = useListQuery('factures', table.params);
  const { data: etablissements } = useQuery({ queryKey: ['etablissements'], queryFn: async () => (await api.get('/etablissements')).data });

  const [detailId, setDetailId] = useState(openParam ? Number(openParam) : null);
  const [avoirCible, setAvoirCible] = useState(null);
  const { data: detail } = useQuery({
    queryKey: ['facture-detail', detailId],
    queryFn: async () => (await api.get(`/factures/${detailId}`)).data,
    enabled: !!detailId,
  });

  // Si on arrive avec ?commandeId=X et une seule facture correspondante, ouvrir directement son détail.
  // Le ref garantit que ça n'arrive qu'une fois : sans lui, fermer la modale remet detailId à null,
  // ce qui repasse la condition à vrai et la rouvre aussitôt (impossible à fermer).
  const autoOuvert = useRef(false);
  useEffect(() => {
    if (commandeIdParam && data?.rows?.length === 1 && !autoOuvert.current) {
      autoOuvert.current = true;
      setDetailId(data.rows[0].id);
    }
  }, [commandeIdParam, data]);

  const reimprimer = useMutation({
    mutationFn: (id) => api.post(`/factures/${id}/reimprimer`).then((r) => r.data),
    onSuccess: (facture) => {
      queryClient.invalidateQueries({ queryKey: ['factures'] });
      queryClient.invalidateQueries({ queryKey: ['facture-detail', facture.id] });
      toast.success('Facture réimprimée (DUPLICATA).');
      openAuthenticatedFile(`/factures/${facture.id}/ticket.pdf`).catch((e) => toast.error(apiErrorMessage(e)));
    },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });

  return (
    <div>
      <PageHeader title="Factures" subtitle="Consultation et impression des factures émises." />

      <DataTable
        columns={[
          { key: 'numero', header: 'Numéro', sortable: true },
          { key: 'dateEmission', header: 'Date', render: (r) => formatDateTime(r.dateEmission) },
          { key: 'tableNumero', header: 'Table', render: (r) => r.tableNumero || '— (à emporter)' },
          { key: 'caissierNom', header: 'Caissier' },
          { key: 'montantNet', header: 'Montant net', render: (r) => formatFCFA(r.montantNet) },
          { key: 'mode', header: 'Mode de paiement' },
          { key: 'nombreImpressions', header: 'Impressions', render: (r) => r.nombreImpressions > 0 ? `${r.nombreImpressions} (DUPLICATA)` : '1' },
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
        searchPlaceholder="Rechercher une facture (numéro)..."
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
            <button className="btn-ghost p-1.5" title="Télécharger le PDF" onClick={() => openAuthenticatedFile(`/factures/${row.id}/ticket.pdf`).catch((e) => toast.error(apiErrorMessage(e)))}><Download size={15} /></button>
            <button className="btn-ghost p-1.5" title="Réimprimer (DUPLICATA)" onClick={() => reimprimer.mutate(row.id)}><Printer size={15} /></button>
            <button className="btn-ghost p-1.5" title="Créer un avoir" onClick={() => setAvoirCible(row)}><Undo2 size={15} /></button>
          </>
        )}
        emptyLabel="Aucune facture."
      />

      <Modal open={!!detailId} onClose={() => setDetailId(null)} title={`Facture ${detail?.numero || ''}`}
        footer={detail && <>
          <button className="btn-secondary" onClick={() => openAuthenticatedFile(`/factures/${detail.id}/ticket.pdf`).catch((e) => toast.error(apiErrorMessage(e)))}><Download size={15} /> PDF</button>
          <button className="btn-primary" onClick={() => reimprimer.mutate(detail.id)}><Printer size={15} /> Réimprimer</button>
        </>}
      >
        {detail && (
          <div className="font-mono text-sm max-w-xs mx-auto">
            {detail.nombreImpressions > 0 && <p className="text-center font-bold text-danger">*** DUPLICATA ***</p>}
            <p className="text-center font-bold">{detail.etablissementNom?.toUpperCase()}</p>
            <p className="text-center">REÇU DE CAISSE</p>
            <hr className="my-2 border-dashed" />
            <p>N° : {detail.numero}</p>
            <p>Date : {formatDateTime(detail.dateEmission)}</p>
            {detail.tableNumero && <p>Table : {detail.tableNumero}</p>}
            <p>Caissier : {detail.caissierNom}</p>
            <hr className="my-2 border-dashed" />
            {detail.lignes.map((l) => (
              <div key={l.id} className="flex justify-between">
                <span>{l.quantite > 1 ? `${l.quantite} × ` : ''}{l.articleNom}</span>
                <span>{formatFCFA(l.montant)}</span>
              </div>
            ))}
            <hr className="my-2 border-dashed" />
            <div className="flex justify-between font-bold"><span>Total net</span><span>{formatFCFA(detail.montantNet)}</span></div>
            {detail.montantRecu != null && (
              <>
                <div className="flex justify-between"><span>{detail.mode}</span><span>{formatFCFA(detail.montantRecu)}</span></div>
                <div className="flex justify-between"><span>Monnaie rendue</span><span>{formatFCFA(detail.monnaieRendue)}</span></div>
              </>
            )}
            <hr className="my-2 border-dashed" />
            <p className="text-center">Merci de votre visite !</p>
          </div>
        )}
      </Modal>

      <CreerAvoirModal
        facture={avoirCible}
        onClose={() => setAvoirCible(null)}
        onCree={() => { setAvoirCible(null); queryClient.invalidateQueries({ queryKey: ['factures'] }); }}
      />
    </div>
  );
}
