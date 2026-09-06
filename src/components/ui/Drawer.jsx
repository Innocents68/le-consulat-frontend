import { X } from 'lucide-react';

export default function Drawer({ open, onClose, title, children, footer, width = 'max-w-md' }) {
  return (
    <div className={`fixed inset-0 z-50 ${open ? '' : 'pointer-events-none'}`}>
      <div
        className={`absolute inset-0 bg-black/40 transition-opacity ${open ? 'opacity-100' : 'opacity-0'}`}
        onClick={onClose}
      />
      <div
        className={`absolute right-0 top-0 h-full w-full ${width} bg-white dark:bg-night-800 shadow-popover flex flex-col transition-transform duration-200 ${open ? 'translate-x-0' : 'translate-x-full'}`}
      >
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
