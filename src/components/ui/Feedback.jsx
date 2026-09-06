import { Loader2, AlertTriangle, Inbox, WifiOff } from 'lucide-react';

export function Loader({ label = 'Chargement...' }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-16 text-ink-light dark:text-cream-300/70">
      <Loader2 className="animate-spin" size={28} />
      <p className="text-sm">{label}</p>
    </div>
  );
}

export function ErrorState({ message = "Impossible de charger les données.", onRetry }) {
  const offline = message?.toLowerCase?.().includes('serveur') || message?.toLowerCase?.().includes('connexion');
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-16 text-center px-4">
      <div className="h-12 w-12 rounded-full bg-danger/10 flex items-center justify-center text-danger">
        {offline ? <WifiOff size={22} /> : <AlertTriangle size={22} />}
      </div>
      <p className="text-sm font-semibold text-ink dark:text-cream-100 mt-1">{message}</p>
      <p className="text-xs text-ink-light dark:text-cream-300/60">
        {offline ? "Le backend Le Consulat n'est peut-être pas encore démarré." : "Veuillez réessayer."}
      </p>
      {onRetry && (
        <button onClick={onRetry} className="btn-secondary mt-2 text-xs px-3 py-1.5">Réessayer</button>
      )}
    </div>
  );
}

export function EmptyState({ label = 'Aucune donnée pour le moment.', icon: Icon = Inbox, action }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-16 text-center px-4">
      <div className="h-12 w-12 rounded-full bg-black/5 dark:bg-white/5 flex items-center justify-center text-ink-light">
        <Icon size={22} />
      </div>
      <p className="text-sm text-ink-light dark:text-cream-300/70">{label}</p>
      {action}
    </div>
  );
}
