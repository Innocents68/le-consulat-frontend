const STYLES = {
  green: 'bg-success/10 text-success border-success/30',
  orange: 'bg-warning/10 text-warning border-warning/30',
  red: 'bg-danger/10 text-danger border-danger/30',
  gray: 'bg-black/5 text-ink-light border-black/10 dark:bg-white/5 dark:text-cream-300',
  gold: 'bg-gold/10 text-gold-dark border-gold/40',
  blue: 'bg-blue-500/10 text-blue-600 border-blue-500/30',
};

// Central mapping of every status enum in the app to a semantic color,
// per the cahier des charges palette rule (vert=positif, orange=alerte, rouge=critique).
const STATUS_COLOR = {
  // Vente
  EN_COURS: 'orange',
  PAYEE: 'green',
  ANNULEE: 'red',
  // SessionCaisse
  OUVERTE: 'green',
  FERMEE: 'gray',
  // Table
  LIBRE: 'green',
  OCCUPEE: 'red',
  RESERVEE: 'orange',
  // Commande / LigneCommande
  EN_ATTENTE: 'orange',
  EN_PREPARATION: 'blue',
  PRETE: 'green',
  PRET: 'green',
  SERVIE: 'gray',
  SERVI: 'gray',
  // Avoir
  VALIDE: 'green',
  // Stock docs
  BROUILLON: 'orange',
  // Depense
  VALIDEE: 'green',
  // Inventaire
  // (EN_COURS / VALIDE already covered)
  // Remise / entities actif
  ACTIF: 'green',
  ACTIVE: 'green',
  INACTIF: 'gray',
  INACTIVE: 'gray',
  EXPIRE: 'red',
  EXPIREE: 'red',
  // generic booleans rendered as text
  true: 'green',
  false: 'gray',
};

const STATUS_LABEL = {
  EN_COURS: 'En cours',
  PAYEE: 'Payée',
  ANNULEE: 'Annulée',
  OUVERTE: 'Ouverte',
  FERMEE: 'Fermée',
  LIBRE: 'Libre',
  OCCUPEE: 'Occupée',
  RESERVEE: 'Réservée',
  EN_ATTENTE: 'En attente',
  EN_PREPARATION: 'En préparation',
  PRETE: 'Prête',
  PRET: 'Prêt',
  SERVIE: 'Servie',
  SERVI: 'Servi',
  VALIDE: 'Validé',
  VALIDEE: 'Validée',
  BROUILLON: 'Brouillon',
  ACTIF: 'Actif',
  ACTIVE: 'Active',
  INACTIF: 'Inactif',
  INACTIVE: 'Inactive',
  EXPIRE: 'Expiré',
  EXPIREE: 'Expirée',
};

export default function StatusBadge({ status, color, label }) {
  const key = typeof status === 'boolean' ? String(status) : status;
  const resolvedColor = color || STATUS_COLOR[key] || 'gray';
  const resolvedLabel = label || STATUS_LABEL[key] || (typeof status === 'boolean' ? (status ? 'Actif' : 'Inactif') : status) || '—';
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap ${STYLES[resolvedColor]}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${
        resolvedColor === 'green' ? 'bg-success' :
        resolvedColor === 'orange' ? 'bg-warning' :
        resolvedColor === 'red' ? 'bg-danger' :
        resolvedColor === 'blue' ? 'bg-blue-500' :
        resolvedColor === 'gold' ? 'bg-gold' : 'bg-ink-light/50'
      }`} />
      {resolvedLabel}
    </span>
  );
}
