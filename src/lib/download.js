import api from './api';

// EF-035/EF-041 : un export PDF/Excel exige le header Authorization (JWT), donc pas de simple
// window.open(url) — JwtAuthenticationFilter ne lit jamais un paramètre de requête, seulement le
// header. On récupère le fichier en blob via l'instance axios (qui attache déjà le token) puis on
// déclenche le téléchargement via un <a> temporaire.
export async function downloadExport(url, params, filename) {
  const { data } = await api.get(url, { params, responseType: 'blob' });
  const blobUrl = URL.createObjectURL(data);
  const a = document.createElement('a');
  a.href = blobUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(blobUrl);
}
