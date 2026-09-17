import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Power, Trash2, Users, CalendarClock, ShoppingCart, X } from 'lucide-react';
import api, { apiErrorMessage } from '../../lib/api';
import Modal from '../../components/ui/Modal';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import PageHeader from '../../components/ui/PageHeader';
import { Field, Select } from '../../components/ui/Field';
import { useToast } from '../../components/ui/Toast';
import { useAuthStore } from '../../store/authStore';
import { isSuperAdmin } from '../../lib/perimetre';
import NouvelleCommandeModal from '../commandes/NouvelleCommandeModal';

const EMPTY = { numero: '', capacite: 4, zone: '', etablissementId: '', statut: 'LIBRE' };
const STATUTS_INITIAUX = [
  { value: 'LIBRE', label: 'Libre' },
  { value: 'RESERVEE', label: 'Réservée' },
  { value: 'OCCUPEE', label: 'Occupée' },
];
const ZONES = ['Terrasse', 'Salle climatisée', 'VIP'];

// Recommandations et corrections.md §1 : la liste des tables doit être organisée en trois
// catégories distinctes (libres/occupées/réservées) plutôt qu'une simple grille colorée.
const CATEGORIES = [
  { key: 'LIBRE', label: 'Tables libres', match: (t) => t.statut === 'LIBRE' },
  { key: 'OCCUPEE', label: 'Tables occupées', match: (t) => t.statut === 'OCCUPEE' || t.statut === 'EN_ATTENTE_PAIEMENT' },
  { key: 'RESERVEE', label: 'Tables réservées', match: (t) => t.statut === 'RESERVEE' },
];

// mm:ss tant que l'occupation dure moins d'une heure, h:mm au-delà (Table.png fourni par le client).
function formatEcoule(depuis) {
  const totalSec = Math.max(0, Math.floor((Date.now() - new Date(depuis).getTime()) / 1000));
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}` : `${m}:${String(s).padStart(2, '0')}`;
}

function TableCard({ table, onClick }) {
  const occupeeOuAttente = table.statut === 'OCCUPEE' || table.statut === 'EN_ATTENTE_PAIEMENT';
  const reservee = table.statut === 'RESERVEE';
  const avecChrono = (occupeeOuAttente || reservee) && table.dateDebutOccupation;

  let couleur = 'bg-white border-2 border-black/15 text-ink hover:border-bordeaux-300';
  if (!table.actif) couleur = 'bg-black/5 border border-dashed border-black/15 text-ink-light/40';
  else if (occupeeOuAttente) couleur = 'bg-danger border-2 border-danger text-white hover:brightness-95';
  else if (reservee) couleur = 'bg-blue-600 border-2 border-blue-600 text-white hover:brightness-95';

  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl p-3 flex flex-col items-center justify-center gap-1 aspect-square shadow-sm transition-all ${couleur}`}
    >
      <span className="text-xl font-extrabold leading-none">{table.numero}</span>
      <span className="flex items-center gap-1 text-xs opacity-90"><Users size={12} /> {table.capacite}</span>
      {avecChrono && <span className="text-[11px] font-mono opacity-90">{formatEcoule(table.dateDebutOccupation)}</span>}
    </button>
  );
}

/** Plan de salle (Table.png fourni par le client) : cartes colorées regroupées en trois
 * catégories distinctes (Recommandations et corrections.md §1) plutôt que le glisser-déposer
 * prévu dans l'amendement — même objectif (voir l'état d'un coup d'œil), plus simple à utiliser
 * au comptoir et à développer. Blanc = libre, bleu = réservée (client attendu, pas encore là),
 * rouge = occupée (clients physiquement à table, y compris en attente de paiement). */
export default function TablesPage() {
  const toast = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const superAdmin = isSuperAdmin(user);

  const [filterEtablissementId, setFilterEtablissementId] = useState(() => new URLSearchParams(window.location.search).get('etablissementId') || '');
  const { data: etablissements } = useQuery({ queryKey: ['etablissements'], queryFn: async () => (await api.get('/etablissements')).data });
  const { data: tables, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['tables', filterEtablissementId],
    queryFn: async () => (await api.get('/tables', { params: filterEtablissementId ? { etablissementId: filterEtablissementId } : {} })).data,
    // Reflète les changements faits ailleurs (nouvelle commande, encaissement, annulation...)
    // même si leurs invalidations manquaient une fois — filet de sécurité, pas la voie principale.
    refetchInterval: 15000,
  });

  // Un seul chronomètre pour toute la page (plutôt qu'un intervalle par carte) : force un
  // nouveau rendu chaque seconde, chaque carte recalcule son propre écoulé à partir de
  // table.dateDebutOccupation.
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [zoneLibre, setZoneLibre] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [actionTarget, setActionTarget] = useState(null);
  const [nouvelleCommandeTable, setNouvelleCommandeTable] = useState(null);

  const create = useMutation({
    mutationFn: (payload) => api.post('/tables', payload).then((r) => r.data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['tables'] }); toast.success('Table créée.'); setModalOpen(false); },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });
  const update = useMutation({
    mutationFn: ({ id, ...payload }) => api.put(`/tables/${id}`, payload).then((r) => r.data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['tables'] }); toast.success('Table modifiée.'); setModalOpen(false); },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });
  const toggleActif = useMutation({
    mutationFn: (id) => api.patch(`/tables/${id}/statut`).then((r) => r.data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['tables'] }); toast.success('Statut mis à jour.'); setActionTarget(null); },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });
  const remove = useMutation({
    mutationFn: (id) => api.delete(`/tables/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['tables'] }); toast.success('Table supprimée.'); setDeleteTarget(null); },
    onError: (e) => { toast.error(apiErrorMessage(e)); setDeleteTarget(null); },
  });
  const reserver = useMutation({
    mutationFn: (id) => api.post(`/tables/${id}/reserver`).then((r) => r.data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['tables'] }); toast.success('Table réservée.'); setActionTarget(null); },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });
  const annulerReservation = useMutation({
    mutationFn: (id) => api.post(`/tables/${id}/annuler-reservation`).then((r) => r.data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['tables'] }); toast.success('Réservation annulée.'); setActionTarget(null); },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });

  function openCreate() { setEditing(null); setForm(EMPTY); setZoneLibre(false); setModalOpen(true); }
  function openEdit(t) { setEditing(t); setForm(t); setZoneLibre(!!t.zone && !ZONES.includes(t.zone)); setModalOpen(true); setActionTarget(null); }
  function handleSubmit(e) {
    e.preventDefault();
    if (editing) {
      update.mutate({ id: editing.id, numero: form.numero, capacite: Number(form.capacite), zone: form.zone });
    } else {
      create.mutate({ ...form, capacite: Number(form.capacite) });
    }
  }

  function voirCommandeEnCours(t) {
    setActionTarget(null);
    navigate(`/commandes?etablissementId=${t.etablissementId}&tableId=${t.id}`);
  }

  const groupesParEtablissement = useMemo(() => {
    const groupes = new Map();
    for (const t of tables || []) {
      if (!groupes.has(t.etablissementNom)) groupes.set(t.etablissementNom, []);
      groupes.get(t.etablissementNom).push(t);
    }
    return [...groupes.entries()];
  }, [tables]);
  const afficherEntetes = superAdmin && !filterEtablissementId && groupesParEtablissement.length > 1;

  return (
    <div>
      <PageHeader
        title="Plan de salle"
        subtitle="Blanc : libre — Bleu : réservée — Rouge : occupée."
        actions={<button className="btn-primary" onClick={openCreate}><Plus size={16} /> Nouvelle table</button>}
      />

      {superAdmin && (
        <div className="mb-4">
          <Select className="w-auto" value={filterEtablissementId} onChange={(e) => setFilterEtablissementId(e.target.value)}>
            <option value="">Tous les établissements</option>
            {(etablissements || []).map((et) => <option key={et.id} value={et.id}>{et.nom}</option>)}
          </Select>
        </div>
      )}

      {isLoading && <p className="text-sm text-ink-light">Chargement...</p>}
      {isError && (
        <p className="text-sm text-danger">
          {apiErrorMessage(error)} <button className="underline" onClick={refetch}>Réessayer</button>
        </p>
      )}
      {!isLoading && !isError && (tables || []).length === 0 && (
        <p className="text-sm text-ink-light">Aucune table. Ajoutez-en une avec le bouton ci-dessus.</p>
      )}

      <div className="flex flex-col gap-6">
        {groupesParEtablissement.map(([nom, liste]) => (
          <div key={nom}>
            {afficherEntetes && <p className="section-title mb-2">{nom}</p>}
            <div className="flex flex-col gap-4">
              {CATEGORIES.map((cat) => {
                const items = liste.filter(cat.match);
                return (
                  <div key={cat.key}>
                    <p className="text-xs font-semibold uppercase text-ink-light mb-2">{cat.label} ({items.length})</p>
                    {items.length === 0 ? (
                      <p className="text-sm text-ink-light/60 italic">Aucune table dans cette catégorie.</p>
                    ) : (
                      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
                        {items.map((t) => (
                          <TableCard key={t.id} table={t} onClick={() => setActionTarget(t)} />
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Actions contextuelles sur une table (remplace les rowActions de l'ancienne liste) */}
      <Modal open={!!actionTarget} onClose={() => setActionTarget(null)} title={actionTarget ? `Table ${actionTarget.numero}` : ''}>
        {actionTarget && (
          <div className="flex flex-col gap-2">
            {!actionTarget.actif && <p className="text-sm text-ink-light mb-1">Cette table est désactivée.</p>}

            {actionTarget.actif && actionTarget.statut === 'LIBRE' && (
              <>
                <button className="btn-primary" onClick={() => { setNouvelleCommandeTable(actionTarget); setActionTarget(null); }}>
                  <ShoppingCart size={15} /> Nouvelle commande
                </button>
                <button className="btn-secondary" onClick={() => reserver.mutate(actionTarget.id)} disabled={reserver.isPending}>
                  <CalendarClock size={15} /> Réserver
                </button>
              </>
            )}

            {actionTarget.statut === 'RESERVEE' && (
              <>
                <button className="btn-primary" onClick={() => { setNouvelleCommandeTable(actionTarget); setActionTarget(null); }}>
                  <ShoppingCart size={15} /> Installer les clients
                </button>
                <button className="btn-secondary" onClick={() => annulerReservation.mutate(actionTarget.id)} disabled={annulerReservation.isPending}>
                  <X size={15} /> Annuler la réservation
                </button>
              </>
            )}

            {(actionTarget.statut === 'OCCUPEE' || actionTarget.statut === 'EN_ATTENTE_PAIEMENT') && (
              <button className="btn-primary" onClick={() => voirCommandeEnCours(actionTarget)}>
                <ShoppingCart size={15} /> Voir la commande en cours
              </button>
            )}

            <div className="flex gap-2 border-t border-black/10 mt-2 pt-3">
              <button className="btn-secondary flex-1" onClick={() => openEdit(actionTarget)}><Pencil size={14} /> Modifier</button>
              {actionTarget.statut === 'LIBRE' && (
                <button className="btn-secondary flex-1" onClick={() => toggleActif.mutate(actionTarget.id)}>
                  <Power size={14} /> {actionTarget.actif ? 'Désactiver' : 'Activer'}
                </button>
              )}
              {actionTarget.statut === 'LIBRE' && (
                <button className="btn-danger flex-1" onClick={() => { setDeleteTarget(actionTarget); setActionTarget(null); }}>
                  <Trash2 size={14} /> Supprimer
                </button>
              )}
            </div>
          </div>
        )}
      </Modal>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Modifier la table' : 'Nouvelle table'}
        footer={<>
          <button className="btn-secondary" onClick={() => setModalOpen(false)}>Annuler</button>
          <button className="btn-primary" onClick={handleSubmit} disabled={create.isPending || update.isPending}>{editing ? 'Enregistrer' : 'Créer'}</button>
        </>}
      >
        <form onSubmit={handleSubmit}>
          {superAdmin && !editing && (
            <Field label="Établissement" required>
              <Select value={form.etablissementId} onChange={(e) => setForm((f) => ({ ...f, etablissementId: e.target.value }))}>
                <option value="" disabled>Choisir un établissement</option>
                {(etablissements || []).map((et) => <option key={et.id} value={et.id}>{et.nom}</option>)}
              </Select>
            </Field>
          )}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Numéro" required><input className="input" value={form.numero} onChange={(e) => setForm((f) => ({ ...f, numero: e.target.value }))} required /></Field>
            <Field label="Capacité" required><input type="number" min="1" className="input" value={form.capacite} onChange={(e) => setForm((f) => ({ ...f, capacite: e.target.value }))} required /></Field>
          </div>
          {!editing && (
            <Field label="Statut initial">
              <Select value={form.statut} onChange={(e) => setForm((f) => ({ ...f, statut: e.target.value }))}>
                {STATUTS_INITIAUX.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </Select>
            </Field>
          )}
          <Field label="Zone">
            <Select
              value={zoneLibre ? 'AUTRE' : (form.zone || '')}
              onChange={(e) => {
                const v = e.target.value;
                if (v === 'AUTRE') { setZoneLibre(true); setForm((f) => ({ ...f, zone: '' })); }
                else { setZoneLibre(false); setForm((f) => ({ ...f, zone: v })); }
              }}
            >
              <option value="">Aucune</option>
              {ZONES.map((z) => <option key={z} value={z}>{z}</option>)}
              <option value="AUTRE">Autre...</option>
            </Select>
          </Field>
          {zoneLibre && (
            <Field label="Précisez la zone">
              <input className="input" value={form.zone || ''} onChange={(e) => setForm((f) => ({ ...f, zone: e.target.value }))} autoFocus />
            </Field>
          )}
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Supprimer la table"
        message={`Supprimer la table ${deleteTarget?.numero} ? Cette action est irréversible.`}
        confirmLabel="Supprimer"
        danger
        loading={remove.isPending}
        onConfirm={() => remove.mutate(deleteTarget.id)}
        onClose={() => setDeleteTarget(null)}
      />

      <NouvelleCommandeModal
        open={!!nouvelleCommandeTable}
        onClose={() => setNouvelleCommandeTable(null)}
        presetEtablissementId={nouvelleCommandeTable?.etablissementId}
        presetTableId={nouvelleCommandeTable?.id}
      />
    </div>
  );
}
