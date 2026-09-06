const PRESETS = [
  { value: 'jour', label: "Aujourd'hui" },
  { value: 'semaine', label: 'Cette semaine' },
  { value: 'mois', label: 'Ce mois' },
  { value: 'annee', label: 'Cette année' },
];

export default function PeriodFilter({ periode, onPeriodeChange, dateDebut, dateFin, onDateDebutChange, onDateFinChange }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <select value={periode} onChange={(e) => onPeriodeChange(e.target.value)} className="input w-auto py-2">
        {PRESETS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
      </select>
      {onDateDebutChange && (
        <>
          <input type="date" className="input w-auto py-2" value={dateDebut} onChange={(e) => onDateDebutChange(e.target.value)} />
          <span className="text-ink-light text-sm">au</span>
          <input type="date" className="input w-auto py-2" value={dateFin} onChange={(e) => onDateFinChange(e.target.value)} />
        </>
      )}
    </div>
  );
}
