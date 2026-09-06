import SimpleCrudPage from '../../components/crud/SimpleCrudPage';
import StatusBadge from '../../components/ui/StatusBadge';
import { formatDate } from '../../lib/format';

const TYPE_LABEL = { POURCENTAGE: 'Pourcentage', MONTANT_FIXE: 'Montant fixe', CODE_PROMO: 'Code promo' };

export default function RemisesPage() {
  return (
    <SimpleCrudPage
      resource="remises"
      title="Remises et promotions"
      subtitle="Règles de réduction : pourcentage, montant fixe ou code promo."
      searchPlaceholder="Rechercher une remise..."
      emptyDefaults={{ nom: '', type: 'POURCENTAGE', valeur: 0, dateDebut: '', dateFin: '', actif: true }}
      columns={[
        { key: 'nom', header: 'Nom', sortable: true },
        { key: 'type', header: 'Type', render: (r) => TYPE_LABEL[r.type] || r.type },
        { key: 'valeur', header: 'Valeur', render: (r) => (r.type === 'POURCENTAGE' ? `${r.valeur}%` : r.valeur) },
        { key: 'dateDebut', header: 'Début', render: (r) => formatDate(r.dateDebut) },
        { key: 'dateFin', header: 'Fin', render: (r) => formatDate(r.dateFin) },
        { key: 'actif', header: 'Statut', render: (r) => <StatusBadge status={r.actif} /> },
      ]}
      fields={[
        { name: 'nom', label: 'Nom de la promotion', required: true },
        { name: 'type', label: 'Type', type: 'select', required: true, options: Object.entries(TYPE_LABEL).map(([value, label]) => ({ value, label })) },
        { name: 'valeur', label: 'Valeur (%, montant ou code)', type: 'number', step: '0.01', required: true },
        { name: 'dateDebut', label: 'Date de début', type: 'date' },
        { name: 'dateFin', label: 'Date de fin', type: 'date' },
        { name: 'actif', label: 'Statut', type: 'checkbox', checkboxLabel: 'Active' },
      ]}
    />
  );
}
