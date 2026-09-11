import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Save, Upload } from 'lucide-react';
import api, { apiErrorMessage, fileUrl } from '../../lib/api';
import PageHeader from '../../components/ui/PageHeader';
import { Field, Select } from '../../components/ui/Field';
import { Loader, ErrorState } from '../../components/ui/Feedback';
import { useToast } from '../../components/ui/Toast';

const EMPTY = {
  nomMagasin: '', adresse: '', telephone: '', email: '', messageFin: '', devise: 'FCFA',
  formatTicket: 'MM_80', nombreCopies: 1, seuilAlerteDefaut: '', plafondRemisePourcentage: '', plafondRemiseMontant: '',
};

/** §6.10.1 — réservé au Super Administrateur (RG-105). Les informations d'en-tête/pied de ticket
 * ne sont plus jamais codées en dur (RG-103) : elles alimentent directement TicketGenerator/
 * AvoirGenerator/PdfGenerator côté backend. */
export default function ParametresPage() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const { data, isLoading, isError, error, refetch } = useQuery({ queryKey: ['parametres'], queryFn: async () => (await api.get('/parametres')).data });

  const [form, setForm] = useState(EMPTY);
  const [logoFile, setLogoFile] = useState(null);

  useEffect(() => {
    if (data) setForm({ ...EMPTY, ...data });
  }, [data]);

  const update = useMutation({
    mutationFn: (payload) => api.put('/parametres', payload).then((r) => r.data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['parametres'] }); queryClient.invalidateQueries({ queryKey: ['parametres-publics'] }); toast.success('Paramètres enregistrés.'); },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });

  const uploadLogo = useMutation({
    mutationFn: (file) => {
      const body = new FormData();
      body.append('fichier', file);
      return api.post('/parametres/logo', body, { headers: { 'Content-Type': undefined } }).then((r) => r.data);
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['parametres'] }); queryClient.invalidateQueries({ queryKey: ['parametres-publics'] }); toast.success('Logo mis à jour.'); setLogoFile(null); },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });

  function handleSubmit(e) {
    e.preventDefault();
    update.mutate({
      ...form,
      nombreCopies: Number(form.nombreCopies) || 1,
      seuilAlerteDefaut: form.seuilAlerteDefaut !== '' ? Number(form.seuilAlerteDefaut) : null,
      plafondRemisePourcentage: form.plafondRemisePourcentage !== '' ? Number(form.plafondRemisePourcentage) : null,
      plafondRemiseMontant: form.plafondRemiseMontant !== '' ? Number(form.plafondRemiseMontant) : null,
    });
  }

  if (isLoading) return <Loader />;
  if (isError) return <ErrorState message={apiErrorMessage(error)} onRetry={refetch} />;

  return (
    <div>
      <PageHeader title="Paramètres" subtitle="Informations et valeurs par défaut de l'application (§6.10.1, réservé au Super Administrateur)." />

      <form onSubmit={handleSubmit} className="flex flex-col gap-4 max-w-2xl">
        <div className="card p-5">
          <p className="font-bold mb-3">Identité</p>
          <div className="flex items-center gap-4 mb-4">
            {data?.logoUrl && <img src={fileUrl(data.logoUrl)} alt="Logo" className="h-16 w-16 rounded-lg object-cover border border-black/10" />}
            <div className="flex items-center gap-2">
              <input type="file" accept="image/*" onChange={(e) => setLogoFile(e.target.files?.[0] || null)} className="text-sm" />
              <button type="button" className="btn-secondary" disabled={!logoFile || uploadLogo.isPending} onClick={() => uploadLogo.mutate(logoFile)}>
                <Upload size={15} /> Envoyer
              </button>
            </div>
          </div>
          <Field label="Nom du magasin" required><input className="input" value={form.nomMagasin} onChange={(e) => setForm((f) => ({ ...f, nomMagasin: e.target.value }))} required /></Field>
          <Field label="Adresse"><input className="input" value={form.adresse || ''} onChange={(e) => setForm((f) => ({ ...f, adresse: e.target.value }))} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Téléphone"><input className="input" value={form.telephone || ''} onChange={(e) => setForm((f) => ({ ...f, telephone: e.target.value }))} /></Field>
            <Field label="E-mail"><input type="email" className="input" value={form.email || ''} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} /></Field>
          </div>
        </div>

        <div className="card p-5">
          <p className="font-bold mb-3">Ticket de caisse</p>
          <Field label="Message de fin" hint="Pied de ticket — remerciement, mention légale...">
            <input className="input" value={form.messageFin || ''} onChange={(e) => setForm((f) => ({ ...f, messageFin: e.target.value }))} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Format" required>
              <Select value={form.formatTicket} onChange={(e) => setForm((f) => ({ ...f, formatTicket: e.target.value }))}>
                <option value="MM_58">58 mm</option>
                <option value="MM_80">80 mm</option>
              </Select>
            </Field>
            <Field label="Nombre de copies" required>
              <input type="number" min="1" max="5" className="input" value={form.nombreCopies} onChange={(e) => setForm((f) => ({ ...f, nombreCopies: e.target.value }))} required />
            </Field>
          </div>
          <Field label="Devise"><input className="input" value={form.devise || ''} onChange={(e) => setForm((f) => ({ ...f, devise: e.target.value }))} /></Field>
        </div>

        <div className="card p-5">
          <p className="font-bold mb-3">Valeurs par défaut</p>
          <Field label="Seuil d'alerte de stock par défaut" hint="Appliqué aux nouveaux articles suivis en stock sans seuil précisé.">
            <input type="number" min="0" step="0.001" className="input" value={form.seuilAlerteDefaut} onChange={(e) => setForm((f) => ({ ...f, seuilAlerteDefaut: e.target.value }))} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Plafond de remise (%)"><input type="number" min="0" max="100" className="input" value={form.plafondRemisePourcentage} onChange={(e) => setForm((f) => ({ ...f, plafondRemisePourcentage: e.target.value }))} /></Field>
            <Field label="Plafond de remise (FCFA)"><input type="number" min="0" className="input" value={form.plafondRemiseMontant} onChange={(e) => setForm((f) => ({ ...f, plafondRemiseMontant: e.target.value }))} /></Field>
          </div>
        </div>

        <button type="submit" className="btn-primary self-start" disabled={update.isPending}><Save size={15} /> Enregistrer</button>
      </form>
    </div>
  );
}
