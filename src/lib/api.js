import axios from 'axios';
import { useAuthStore } from '../store/authStore';

export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api/v1';

export const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const wasAuthenticated = !!useAuthStore.getState().token;
      useAuthStore.getState().logout();
      if (wasAuthenticated && window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// Normalizes a caught axios error into a friendly message, per API_CONTRACT error shape:
// { timestamp, status, error, message, path, errors }
export function apiErrorMessage(error, fallback = "Une erreur est survenue.") {
  if (error?.response?.data?.message) return error.response.data.message;
  if (error?.message === 'Network Error') return "Impossible de joindre le serveur. Vérifiez la connexion.";
  if (error?.code === 'ECONNABORTED') return "Le serveur met trop de temps à répondre.";
  return fallback;
}

// Helper to fetch either a Spring Data Page<T> (paginated endpoints, e.g. /produits, /ventes)
// or a plain List<T> (simple reference endpoints with no pagination, e.g. /tables, /fournisseurs,
// /depots, /categories-*, /sessions-caisse, /sauvegardes) and normalize both shapes into the
// same { rows, total, totalPages, page, size } contract every list page relies on.
//
// Without this, calling a plain-array endpoint left `data.content` undefined, silently producing
// an empty `rows: []` on every page load — the data was in the database and the request succeeded,
// it just never reached the UI. That's what caused pages like "Gestion des tables" to render
// "Aucune table dans cette zone" even though the table existed in PostgreSQL.
export async function fetchPage(url, params = {}) {
  const { data } = await api.get(url, { params });
  if (Array.isArray(data)) {
    return {
      rows: data,
      total: data.length,
      totalPages: 1,
      page: 0,
      size: params.size ?? data.length,
    };
  }
  return {
    rows: data.content ?? [],
    total: data.totalElements ?? 0,
    totalPages: data.totalPages ?? 0,
    page: data.number ?? 0,
    size: data.size ?? params.size ?? 20,
  };
}

// Turns a relative path returned by the backend for an uploaded file (e.g. "/uploads/logos/xxx.png",
// served by Spring itself, not by the Vite dev server) into an absolute URL pointing at the API host.
// Without this, an <img src> or <a href> built directly from that path resolves against the
// frontend's own origin (localhost:5173) instead of the backend (localhost:8080) and 404s.
export function fileUrl(path) {
  if (!path) return path;
  if (/^https?:\/\//i.test(path)) return path;
  const origin = API_URL.replace(/\/api\/v1\/?$/, '');
  return origin + (path.startsWith('/') ? path : `/${path}`);
}

export default api;
