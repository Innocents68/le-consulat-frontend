import { X } from 'lucide-react';
import { useEffect } from 'react';

export default function Modal({ open, onClose, title, children, footer, size = 'md' }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === 'Escape') onClose?.(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const sizes = {
    sm: 'max-w-md',
    md: 'max-w-xl',
    lg: 'max-w-3xl',
    xl: 'max-w-5xl',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative w-full ${sizes[size]} max-h-[90vh] overflow-hidden flex flex-col rounded-2xl bg-white dark:bg-night-800 shadow-popover animate-in`}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-black/5 dark:border-white/10 shrink-0">
          <h3 className="font-bold text-ink dark:text-cream-100">{title}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 text-ink-light">
            <X size={18} />
          </button>
        </div>
        <div className="px-5 py-4 overflow-y-auto grow">{children}</div>
        {footer && <div className="px-5 py-3 border-t border-black/5 dark:border-white/10 flex justify-end gap-2 shrink-0">{footer}</div>}
      </div>
    </div>
  );
}
