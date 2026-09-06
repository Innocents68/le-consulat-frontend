import api from '../../lib/api';

export const ventesApi = {
  ouvrirVente: (payload) => api.post('/ventes', payload).then((r) => r.data),
  ajouterLigne: (venteId, payload) => api.post(`/ventes/${venteId}/lignes`, payload).then((r) => r.data),
  retirerLigne: (venteId, ligneId) => api.delete(`/ventes/${venteId}/lignes/${ligneId}`).then((r) => r.data),
  encaisser: (venteId, payload) => api.post(`/ventes/${venteId}/encaisser`, payload).then((r) => r.data),
  getVente: (venteId) => api.get(`/ventes/${venteId}`).then((r) => r.data),
};

export const sessionsCaisseApi = {
  ouvertes: () => api.get('/sessions-caisse', { params: { statut: 'OUVERTE' } }).then((r) => r.data),
  ouvrir: (payload) => api.post('/sessions-caisse', payload).then((r) => r.data),
  cloturer: (id, payload) => api.post(`/sessions-caisse/${id}/cloturer`, payload).then((r) => r.data),
};
