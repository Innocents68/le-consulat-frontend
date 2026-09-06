import { createContext, useCallback, useContext, useState } from 'react';
import { CheckCircle2, XCircle, Info, X } from 'lucide-react';

const ToastContext = createContext(null);

let idCounter = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const remove = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const push = useCallback((message, type = 'info') => {
    const id = ++idCounter;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => remove(id), 4500);
  }, [remove]);

  const api = {
    success: (msg) => push(msg, 'success'),
    error: (msg) => push(msg, 'error'),
    info: (msg) => push(msg, 'info'),
  };

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 w-full max-w-sm px-4 sm:px-0">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`flex items-start gap-2 rounded-xl shadow-popover border px-4 py-3 text-sm bg-white dark:bg-night-800 animate-in ${
              t.type === 'success' ? 'border-success/30' : t.type === 'error' ? 'border-danger/30' : 'border-black/10 dark:border-white/10'
            }`}
          >
            {t.type === 'success' && <CheckCircle2 size={18} className="text-success shrink-0 mt-0.5" />}
            {t.type === 'error' && <XCircle size={18} className="text-danger shrink-0 mt-0.5" />}
            {t.type === 'info' && <Info size={18} className="text-bordeaux-700 shrink-0 mt-0.5" />}
            <p className="flex-1 text-ink dark:text-cream-100">{t.message}</p>
            <button onClick={() => remove(t.id)} className="text-ink-light/60 hover:text-ink">
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
