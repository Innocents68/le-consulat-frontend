import api from '../../lib/api';

export const commandesApi = {
  creer: (payload) => api.post('/commandes-restaurant', payload).then((r) => r.data),
  envoyerCuisine: (id) => api.post(`/commandes-restaurant/${id}/envoyer-cuisine`).then((r) => r.data),
  annuler: (id, motif) => api.post(`/commandes-restaurant/${id}/annuler`, { motif }).then((r) => r.data),
  updateLigneStatut: (id, ligneId, statut) => api.patch(`/commandes-restaurant/${id}/lignes/${ligneId}/statut`, { statut }).then((r) => r.data),
};
