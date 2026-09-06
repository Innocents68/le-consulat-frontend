export default function StatCard({ icon: Icon, label, value, delta, deltaLabel = 'vs hier', accent = true }) {
  const isPositive = typeof delta === 'number' ? delta >= 0 : null;
  return (
    <div className="card p-5 flex items-center gap-4 min-w-0">
      {Icon && (
        <div className={`shrink-0 h-12 w-12 rounded-xl flex items-center justify-center ${accent ? 'bg-bordeaux-700 text-white' : 'bg-cream-200 text-bordeaux-700'}`}>
          <Icon size={22} />
        </div>
      )}
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-light dark:text-cream-300/70 truncate">{label}</p>
        <p className="text-xl font-extrabold text-ink dark:text-cream-100 truncate">{value}</p>
        {typeof delta === 'number' && (
          <p className={`text-xs font-semibold mt-0.5 ${isPositive ? 'text-success' : 'text-danger'}`}>
            {isPositive ? '▲' : '▼'} {Math.abs(delta).toFixed(1)}% {deltaLabel}
          </p>
        )}
      </div>
    </div>
  );
}
