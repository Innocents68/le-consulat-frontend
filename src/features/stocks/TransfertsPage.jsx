import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Send, Inbox, History, Check, X } from 'lucide-react';
import api, { apiErrorMessage, fetchPage } from '../../lib/api';
import DataTable from '../../components/ui/DataTable';
import Modal from '../../components/ui/Modal';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import PageHeader from '../../components/ui/PageHeader';
import StatusBadge from '../../components/ui/StatusBadge';
import { Field, Select } from '../../components/ui/Field';
import { formatDateTime } from '../../lib/format';
import { useToast } from '../../components/ui/Toast';
import { useAuthStore } from '../../store/authStore';
import { isSuperAdmin } from '../../lib/perimetre';

const EMPTY_DEMANDE = { etablissementSourceId: '', produitSourceId: '', etablissementDestinationId: '', quantite: '', commentaire: '' };

/** Demandes_amelioration_logiciel_Le_Consulat_Professionnel.docx §5 : un transfert entre
 * établissements passe par une demande, transmise au responsable de l'établissement destinataire,
 * qui l'accepte (en choisissant le produit correspondant dans son propre catalogue, RG-002) ou la
 * refuse (motif facultatif). Cahier_de_corrections_Le_Consulat.docx §1.1 : le transfert immédiat
 * (ex RG-084) a été retiré — c'est désormais l'unique chemin, même pour le Super Administrateur. */
export default function TransfertsPage() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const superAdmin = isSuperAdmin(user);

  const [tab, setTab] = useState('DEMANDER');
  const { data: etablissements } = useQuery({ queryKey: ['etablissements'], queryFn: async () => (await api.get('/etablissements')).data });

  return (
    <div>
      <PageHeader title="Transferts entre établissements" subtitle="Demande, acceptation et notification (Demandes_amelioration_logiciel_Le_Consulat_Professionnel.docx §5)." />

      <div className="flex gap-2 mb-4 border-b border-black/10 dark:border-white/10">
        <TabButton active={tab === 'DEMANDER'} onClick={() => setTab('DEMANDER')} icon={Send} label="Nouvelle demande" />
        <TabButton active={tab === 'RECUES'} onClick={() => setTab('RECUES')} icon={Inbox} label="Demandes reçues" />
        <TabButton active={tab === 'EMISES'} onClick={() => setTab('EMISES')} icon={History} label="Demandes émises" />
      </div>

      {tab === 'DEMANDER' && <NouvelleDemande superAdmin={superAdmin} user={user} etablissements={etablissements} toast={toast} queryClient={queryClient} onDone={() => setTab('EMISES')} />}
      {tab === 'RECUES' && <DemandesRecues superAdmin={superAdmin} user={user} etablissements={etablissements} toast={toast} queryClient={queryClient} />}
      {tab === 'EMISES' && <DemandesEmises superAdmin={superAdmin} user={user} etablissements={etablissements} />}
    </div>
  );
}

function TabButton({ active, onClick, icon: Icon, label }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
        active ? 'border-bordeaux-500 text-bordeaux-600 dark:text-gold' : 'border-transparent text-ink-light hover:text-ink'
      }`}
    >
      <Icon size={15} /> {label}
    </button>
  );
}

function NouvelleDemande({ superAdmin, user, etablissements, toast, queryClient, onDone }) {
  const [form, setForm] = useState(EMPTY_DEMANDE);
  const etabSourceId = superAdmin ? form.etablissementSourceId : user?.etablissementId;

  const { data: produitsSource } = useQuery({
    queryKey: ['produits-suivis', etabSourceId],
    queryFn: async () => {
      const { data } = await api.get('/produits', { params: { etablissementId: etabSourceId, size: 200 } });
      return (data.content || []).filter((p) => p.suiviStock);
    },
    enabled: !!etabSourceId,
  });

  const creer = useMutation({
    mutationFn: (payload) => api.post('/demandes-transfert', payload).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['demandes-transfert'] });
      toast.success('Demande de transfert envoyée.');
      setForm(EMPTY_DEMANDE);
      onDone();
    },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });

  function handleSubmit(e) {
    e.preventDefault();
    if (form.etablissementDestinationId === String(etabSourceId)) {
      toast.error('Un transfert doit se faire vers un établissement différent.');
      return;
    }
    creer.mutate({
      produitSourceId: Number(form.produitSourceId),
      quantite: Number(form.quantite),
      etablissementDestinationId: Number(form.etablissementDestinationId),
      commentaire: form.commentaire || null,
    });
  }

  return (
    <div className="card p-5 max-w-2xl">
      <p className="text-sm text-ink-light mb-4">
        Choisissez un produit de votre établissement et l'établissement destinataire : votre demande lui sera transmise,
        et le transfert n'aura lieu qu'après son acceptation.
      </p>
      <form onSubmit={handleSubmit}>
        {superAdmin && (
          <Field label="Établissement source" required>
            <Select value={form.etablissementSourceId} onChange={(e) => setForm((f) => ({ ...f, etablissementSourceId: e.target.value, produitSourceId: '' }))}>
              <option value="" disabled>Choisir</option>
              {(etablissements || []).map((et) => <option key={et.id} value={et.id}>{et.nom}</option>)}
            </Select>
          </Field>
        )}
        <Field label="Produit" required>
          <Select value={form.produitSourceId} onChange={(e) => setForm((f) => ({ ...f, produitSourceId: e.target.value }))} disabled={!etabSourceId}>
            <option value="" disabled>Choisir un produit</option>
            {(produitsSource || []).map((p) => <option key={p.id} value={p.id}>{p.nom} (stock : {p.quantiteStock})</option>)}
          </Select>
        </Field>
        <Field label="Quantité" required>
          <input type="number" min="0.001" step="0.001" className="input" value={form.quantite} onChange={(e) => setForm((f) => ({ ...f, quantite: e.target.value }))} required />
        </Field>
        <Field label="Établissement destinataire" required>
          <Select value={form.etablissementDestinationId} onChange={(e) => setForm((f) => ({ ...f, etablissementDestinationId: e.target.value }))}>
            <option value="" disabled>Choisir</option>
            {(etablissements || []).filter((et) => String(et.id) !== String(etabSourceId)).map((et) => <option key={et.id} value={et.id}>{et.nom}</option>)}
          </Select>
        </Field>
        <Field label="Commentaire (optionnel)" hint="Toute information utile pour le responsable destinataire.">
          <input className="input" value={form.commentaire} onChange={(e) => setForm((f) => ({ ...f, commentaire: e.target.value }))} />
        </Field>
        <button className="btn-primary mt-2" type="submit" disabled={creer.isPending}>Envoyer la demande</button>
      </form>
    </div>
  );
}

function DemandesRecues({ superAdmin, user, etablissements, toast, queryClient }) {
  const [etablissementId, setEtablissementId] = useState(superAdmin ? '' : String(user?.etablissementId || ''));
  const [accepterCible, setAccepterCible] = useState(null);
  const [produitDestinationId, setProduitDestinationId] = useState('');
  const [refuserCible, setRefuserCible] = useState(null);
  const [motifRefus, setMotifRefus] = useState('');

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['demandes-transfert', 'recues', etablissementId],
    queryFn: () => fetchPage('/demandes-transfert/recues', { etablissementId: etablissementId || undefined, size: 50 }),
    enabled: !!etablissementId || !superAdmin,
    refetchInterval: 60000,
  });

  const { data: produitsDestination } = useQuery({
    queryKey: ['produits-suivis', accepterCible?.etablissementDestinationId],
    queryFn: async () => {
      const { data } = await api.get('/produits', { params: { etablissementId: accepterCible.etablissementDestinationId, size: 200 } });
      return (data.content || []).filter((p) => p.suiviStock);
    },
    enabled: !!accepterCible,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['demandes-transfert'] });
    queryClient.invalidateQueries({ queryKey: ['produits'] });
    queryClient.invalidateQueries({ queryKey: ['mouvements-stock'] });
  };

  const accepter = useMutation({
    mutationFn: ({ id, produitDestinationId }) => api.post(`/demandes-transfert/${id}/accepter`, { produitDestinationId: Number(produitDestinationId) }).then((r) => r.data),
    onSuccess: () => { invalidate(); toast.success('Transfert accepté et effectué.'); setAccepterCible(null); setProduitDestinationId(''); },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });
  const refuser = useMutation({
    mutationFn: ({ id, motif }) => api.post(`/demandes-transfert/${id}/refuser`, { motif: motif || null }).then((r) => r.data),
    onSuccess: () => { invalidate(); toast.success('Demande refusée.'); setRefuserCible(null); setMotifRefus(''); },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });

  return (
    <div>
      {superAdmin && (
        <div className="mb-3">
          <Select className="w-auto" value={etablissementId} onChange={(e) => setEtablissementId(e.target.value)}>
            <option value="">Choisir un établissement</option>
            {(etablissements || []).map((et) => <option key={et.id} value={et.id}>{et.nom}</option>)}
          </Select>
        </div>
      )}
      <DataTable
        columns={[
          { key: 'dateDemande', header: 'Date', render: (r) => formatDateTime(r.dateDemande) },
          { key: 'etablissementSourceNom', header: 'De' },
          { key: 'produitSourceNom', header: 'Produit' },
          { key: 'quantite', header: 'Quantité' },
          { key: 'demandeurNom', header: 'Demandeur' },
          { key: 'statut', header: 'Statut', render: (r) => <StatusBadge status={r.statut} color={r.statut === 'EN_ATTENTE' ? 'orange' : r.statut === 'ACCEPTEE' ? 'green' : 'red'} label={r.statut === 'EN_ATTENTE' ? 'En attente' : r.statut === 'ACCEPTEE' ? 'Transférée' : 'Refusée'} /> },
        ]}
        rows={data?.rows || []}
        total={data?.total || 0}
        totalPages={1}
        page={0}
        isLoading={isLoading}
        isError={isError}
        errorMessage={apiErrorMessage(error)}
        onRetry={refetch}
        rowActions={(row) => row.statut === 'EN_ATTENTE' && (
          <>
            <button className="btn-ghost p-1.5 text-success" title="Accepter" onClick={() => { setAccepterCible(row); setProduitDestinationId(''); }}><Check size={15} /></button>
            <button className="btn-ghost p-1.5 text-danger" title="Refuser" onClick={() => { setRefuserCible(row); setMotifRefus(''); }}><X size={15} /></button>
          </>
        )}
        emptyLabel={!etablissementId && superAdmin ? 'Choisissez un établissement.' : 'Aucune demande reçue.'}
      />

      <Modal
        open={!!accepterCible}
        onClose={() => setAccepterCible(null)}
        title="Accepter le transfert"
        footer={<>
          <button className="btn-secondary" onClick={() => setAccepterCible(null)}>Annuler</button>
          <button className="btn-primary" disabled={!produitDestinationId || accepter.isPending} onClick={() => accepter.mutate({ id: accepterCible.id, produitDestinationId })}>Accepter et transférer</button>
        </>}
      >
        <p className="text-sm text-ink-light mb-3">
          {accepterCible?.demandeurNom} demande de transférer {accepterCible?.quantite} {accepterCible?.produitSourceNom} depuis {accepterCible?.etablissementSourceNom}.
          Choisissez le produit correspondant dans votre catalogue :
        </p>
        <Field label="Produit destination" required>
          <Select value={produitDestinationId} onChange={(e) => setProduitDestinationId(e.target.value)}>
            <option value="" disabled>Choisir un produit</option>
            {(produitsDestination || []).map((p) => <option key={p.id} value={p.id}>{p.nom} (stock : {p.quantiteStock})</option>)}
          </Select>
        </Field>
      </Modal>

      <ConfirmDialog
        open={!!refuserCible}
        onClose={() => setRefuserCible(null)}
        onConfirm={() => refuser.mutate({ id: refuserCible.id, motif: motifRefus })}
        title="Refuser la demande de transfert"
        message={<div className="space-y-2">
          <p>Refuser cette demande de {refuserCible?.quantite} {refuserCible?.produitSourceNom} ?</p>
          <input className="input" placeholder="Motif du refus (optionnel)" value={motifRefus} onChange={(e) => setMotifRefus(e.target.value)} />
        </div>}
        confirmLabel="Refuser"
        danger
        loading={refuser.isPending}
      />
    </div>
  );
}

function DemandesEmises({ superAdmin, user, etablissements }) {
  const [etablissementId, setEtablissementId] = useState(superAdmin ? '' : String(user?.etablissementId || ''));

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['demandes-transfert', 'emises', etablissementId],
    queryFn: () => fetchPage('/demandes-transfert/emises', { etablissementId: etablissementId || undefined, size: 50 }),
    enabled: !!etablissementId || !superAdmin,
  });

  return (
    <div>
      {superAdmin && (
        <div className="mb-3">
          <Select className="w-auto" value={etablissementId} onChange={(e) => setEtablissementId(e.target.value)}>
            <option value="">Choisir un établissement</option>
            {(etablissements || []).map((et) => <option key={et.id} value={et.id}>{et.nom}</option>)}
          </Select>
        </div>
      )}
      <DataTable
        columns={[
          { key: 'dateDemande', header: 'Date', render: (r) => formatDateTime(r.dateDemande) },
          { key: 'produitSourceNom', header: 'Produit' },
          { key: 'quantite', header: 'Quantité' },
          { key: 'etablissementDestinationNom', header: 'Vers' },
          {
            key: 'statut', header: 'Statut', render: (r) => (
              <div>
                <StatusBadge status={r.statut} color={r.statut === 'EN_ATTENTE' ? 'orange' : r.statut === 'ACCEPTEE' ? 'green' : 'red'} label={r.statut === 'EN_ATTENTE' ? 'En attente' : r.statut === 'ACCEPTEE' ? 'Transférée' : 'Refusée'} />
                {r.statut === 'REFUSEE' && r.motifRefus && <p className="text-xs text-ink-light mt-1">Motif : {r.motifRefus}</p>}
              </div>
            ),
          },
        ]}
        rows={data?.rows || []}
        total={data?.total || 0}
        totalPages={1}
        page={0}
        isLoading={isLoading}
        isError={isError}
        errorMessage={apiErrorMessage(error)}
        onRetry={refetch}
        emptyLabel={!etablissementId && superAdmin ? 'Choisissez un établissement.' : 'Aucune demande émise.'}
      />
    </div>
  );
}
