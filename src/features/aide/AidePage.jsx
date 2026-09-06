import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChevronDown, Mail, Phone, LifeBuoy } from 'lucide-react';
import api, { apiErrorMessage } from '../../lib/api';
import PageHeader from '../../components/ui/PageHeader';
import { Loader, ErrorState, EmptyState } from '../../components/ui/Feedback';

function FaqItem({ question, reponse }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-black/5 dark:border-white/10 last:border-0">
      <button onClick={() => setOpen((o) => !o)} className="w-full flex items-center justify-between py-3.5 text-left">
        <span className="font-semibold text-sm text-ink dark:text-cream-100">{question}</span>
        <ChevronDown size={16} className={`text-ink-light transition-transform shrink-0 ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && <p className="text-sm text-ink-light dark:text-cream-300/70 pb-4 leading-relaxed">{reponse}</p>}
    </div>
  );
}

export default function AidePage() {
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['aide-faq'],
    queryFn: async () => (await api.get('/aide/faq')).data,
    retry: 1,
  });

  const faqs = Array.isArray(data) ? data : data?.content || [];

  return (
    <div>
      <PageHeader title="Aide / Support" subtitle="Questions fréquentes et contacts du support." />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="card p-5 lg:col-span-2">
          <h3 className="section-title mb-2">Foire aux questions</h3>
          {isLoading && <Loader />}
          {isError && <ErrorState message={apiErrorMessage(error, 'Impossible de charger la FAQ.')} onRetry={refetch} />}
          {!isLoading && !isError && faqs.length === 0 && <EmptyState label="Aucune question disponible pour le moment." />}
          {!isLoading && !isError && faqs.map((f, i) => (
            <FaqItem key={i} question={f.question} reponse={f.reponse || f.answer} />
          ))}
        </div>

        <div className="card p-5">
          <h3 className="section-title mb-3">Contacter le support</h3>
          <div className="flex flex-col gap-3">
            <a href="mailto:support@leconsulat.bf" className="flex items-center gap-3 rounded-lg bg-cream-100 dark:bg-white/5 px-3 py-2.5 text-sm hover:bg-cream-200">
              <Mail size={16} className="text-bordeaux-700 dark:text-gold" /> support@leconsulat.bf
            </a>
            <a href="tel:+22600000000" className="flex items-center gap-3 rounded-lg bg-cream-100 dark:bg-white/5 px-3 py-2.5 text-sm hover:bg-cream-200">
              <Phone size={16} className="text-bordeaux-700 dark:text-gold" /> +226 00 00 00 00
            </a>
            <div className="flex items-center gap-3 rounded-lg bg-bordeaux-700/5 px-3 py-2.5 text-sm text-ink-light">
              <LifeBuoy size={16} className="text-bordeaux-700 dark:text-gold shrink-0" />
              Support et garantie post-livraison disponibles selon les conditions du contrat.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
