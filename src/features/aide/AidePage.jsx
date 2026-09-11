import { useQuery } from '@tanstack/react-query';
import { LifeBuoy, Mail, Phone } from 'lucide-react';
import api from '../../lib/api';
import PageHeader from '../../components/ui/PageHeader';

const APP_VERSION = '1.0.0';

const MODULES = [
  { titre: 'Commandes', texte: "Créer une commande, ajouter des produits, appliquer une remise éventuelle, puis encaisser (mode de paiement obligatoire)." },
  { titre: 'Suivi cuisine', texte: "Réservé au Restaurant : fait progresser une commande envoyée en cuisine jusqu'à « Servie », qui libère la table." },
  { titre: 'Factures et Avoirs', texte: "Consultez, réimprimez un ticket ou corrigez une facture déjà émise via un avoir motivé." },
  { titre: 'Produits, Fournisseurs, Stocks', texte: "Gérez le catalogue, les entrées/sorties de stock, les transferts entre établissements (Super Administrateur) et les inventaires." },
  { titre: 'Dépenses et Gestion financière', texte: "Enregistrez les dépenses de votre établissement ; la Gestion financière (Super Administrateur) consolide recettes, dépenses et soldes." },
  { titre: 'Reporting', texte: "Tableau de bord, ventes, recettes, stocks et bénéfices — filtrables par période et établissement, exportables en PDF/Excel." },
  { titre: 'Paramètres', texte: "Réservé au Super Administrateur : logo, informations de ticket, seuils et plafonds par défaut de l'application." },
];

/** EF-046 (priorité S) : mode d'emploi sommaire, coordonnées support, numéro de version. */
export default function AidePage() {
  const { data: parametres } = useQuery({ queryKey: ['parametres-publics'], queryFn: async () => (await api.get('/parametres/publics')).data });
  const contact = parametres;

  return (
    <div>
      <PageHeader title="Aide" subtitle="Mode d'emploi, support et informations de version (§6.10.3)." />

      <div className="flex flex-col gap-4 max-w-2xl">
        <div className="card p-5">
          <p className="font-bold mb-3">Mode d'emploi</p>
          <div className="flex flex-col gap-3">
            {MODULES.map((m) => (
              <div key={m.titre}>
                <p className="font-semibold text-sm">{m.titre}</p>
                <p className="text-sm text-ink-light">{m.texte}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="card p-5">
          <p className="font-bold mb-3 flex items-center gap-2"><LifeBuoy size={16} /> Support</p>
          {contact?.email || contact?.telephone ? (
            <div className="flex flex-col gap-1 text-sm">
              {contact?.email && <p className="flex items-center gap-2"><Mail size={14} /> {contact.email}</p>}
              {contact?.telephone && <p className="flex items-center gap-2"><Phone size={14} /> {contact.telephone}</p>}
            </div>
          ) : (
            <p className="text-sm text-ink-light">Coordonnées non configurées — contactez votre Super Administrateur.</p>
          )}
        </div>

        <p className="text-xs text-ink-light">{parametres?.nomMagasin || 'Le Consulat'} — version {APP_VERSION}</p>
      </div>
    </div>
  );
}
