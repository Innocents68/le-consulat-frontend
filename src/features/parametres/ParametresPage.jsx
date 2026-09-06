import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Save, Loader2, Upload, Image as ImageIcon } from 'lucide-react';
import api, { apiErrorMessage, fileUrl } from '../../lib/api';
import PageHeader from '../../components/ui/PageHeader';
import { Field } from '../../components/ui/Field';
import { Loader, ErrorState } from '../../components/ui/Feedback';
import { useToast } from '../../components/ui/Toast';
import { useAppStore } from '../../store/appStore';

const EMPTY = { nomEtablissement: 'Le Consulat', logoUrl: '', devise: 'FCFA', tauxTva: 18, seuilAlerteGlobal: 5, modeSombreParDefaut: false };
const TYPES_ACCEPTES = 'image/png,image/jpeg,image/webp,image/svg+xml';

export default function ParametresPage() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const setDarkMode = useAppStore((s) => s.setDarkMode);
  const [form, setForm] = useState(EMPTY);
  const fileInputRef = useRef(null);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['parametres'],
    queryFn: async () => (await api.get('/parametres')).data,
    retry: 1,
  });

  useEffect(() => { if (data) setForm(data); }, [data]);

  const save = useMutation({
    mutationFn: (payload) => api.put('/parametres', payload).then((r) => r.data),
    onSuccess: (d) => {
      queryClient.invalidateQueries({ queryKey: ['parametres'] });
      toast.success('Paramètres enregistrés.');
      if (typeof d?.modeSombreParDefaut === 'boolean') setDarkMode(d.modeSombreParDefaut);
    },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });

  const uploadLogo = useMutation({
    mutationFn: (file) => {
      const fd = new FormData();
      fd.append('file', file);
      return api.post('/parametres/logo', fd, { headers: { 'Content-Type': 'multipart/form-data' } }).then((r) => r.data);
    },
    onSuccess: (d) => {
      queryClient.invalidateQueries({ queryKey: ['parametres'] });
      setForm((f) => ({ ...f, logoUrl: d.logoUrl }));
      toast.success('Logo mis à jour.');
    },
    onError: (e) => toast.error(apiErrorMessage(e, "Impossible d'envoyer ce logo.")),
  });

  function handleLogoChange(e) {
    const file = e.target.files?.[0];
    if (file) uploadLogo.mutate(file);
    e.target.value = ''; // allow re-selecting the same file later
  }

  function handleSubmit(e) {
    e.preventDefault();
    save.mutate(form);
  }

  if (isLoading) return <Loader />;
  if (isError) return <ErrorState message={apiErrorMessage(error, 'Impossible de charger les paramètres.')} onRetry={refetch} />;

  return (
    <div>
      <PageHeader title="Paramètres généraux" subtitle="Identité de l'établissement, devise, TVA et préférences." />

      <form onSubmit={handleSubmit} className="card p-6 max-w-2xl">
        <Field label="Nom de l'établissement" required>
          <input className="input" value={form.nomEtablissement || ''} onChange={(e) => setForm((f) => ({ ...f, nomEtablissement: e.target.value }))} required />
        </Field>
        <Field label="Logo de l'établissement" hint="Utilisé sur les tickets et factures. PNG, JPEG, WebP ou SVG.">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 shrink-0 rounded-lg border border-black/10 dark:border-white/10 bg-cream-100 dark:bg-white/5 flex items-center justify-center overflow-hidden">
              {form.logoUrl ? (
                <img src={fileUrl(form.logoUrl)} alt="Logo de l'établissement" className="h-full w-full object-contain" />
              ) : (
                <ImageIcon size={22} className="text-ink-light/40" />
              )}
            </div>
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept={TYPES_ACCEPTES}
                className="hidden"
                onChange={handleLogoChange}
              />
              <button
                type="button"
                className="btn-secondary"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadLogo.isPending}
              >
                {uploadLogo.isPending ? <Loader2 size={15} className="animate-spin" /> : <Upload size={15} />}
                {form.logoUrl ? 'Changer le logo' : 'Importer un logo'}
              </button>
            </div>
          </div>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Devise" required>
            <input className="input" value={form.devise || ''} onChange={(e) => setForm((f) => ({ ...f, devise: e.target.value }))} required />
          </Field>
          <Field label="Taux de TVA (%)" required>
            <input type="number" className="input" value={form.tauxTva ?? 0} onChange={(e) => setForm((f) => ({ ...f, tauxTva: Number(e.target.value) }))} required />
          </Field>
        </div>
        <Field label="Seuil d'alerte global (stock)" required>
          <input type="number" className="input" value={form.seuilAlerteGlobal ?? 0} onChange={(e) => setForm((f) => ({ ...f, seuilAlerteGlobal: Number(e.target.value) }))} required />
        </Field>
        <label className="flex items-center gap-2 text-sm mb-4">
          <input type="checkbox" checked={!!form.modeSombreParDefaut} onChange={(e) => setForm((f) => ({ ...f, modeSombreParDefaut: e.target.checked }))} />
          Activer le mode sombre par défaut pour tous les nouveaux utilisateurs
        </label>
        <button type="submit" className="btn-primary" disabled={save.isPending}>
          {save.isPending ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />} Enregistrer
        </button>
      </form>
    </div>
  );
}
