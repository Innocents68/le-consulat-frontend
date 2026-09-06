import api from '../../lib/api';

export async function downloadExport(endpoint, format, filename) {
  const response = await api.get(`${endpoint}/export`, { params: { format }, responseType: 'blob' });
  const url = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  link.remove();
}
