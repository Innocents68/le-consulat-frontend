export default function PageHeader({ title, subtitle, actions }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 mb-5">
      <div>
        <h1 className="text-xl md:text-2xl font-extrabold text-ink dark:text-cream-100">{title}</h1>
        {subtitle && <p className="text-sm text-ink-light dark:text-cream-300/70 mt-0.5">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2 flex-wrap">{actions}</div>}
    </div>
  );
}
