import {
  LineChart, Line, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { formatFCFA, formatNumber } from '../../lib/format';

export const PALETTE = ['#7A1F2B', '#C9A24B', '#3B5BA5', '#2E9E4F', '#8A2531', '#5A4E48'];

function CustomTooltip({ active, payload, label, money = true }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg bg-white dark:bg-night-800 border border-black/10 dark:border-white/10 shadow-popover px-3 py-2 text-xs">
      {label && <p className="font-semibold text-ink dark:text-cream-100 mb-1">{label}</p>}
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }} className="font-medium">
          {p.name}: {money ? formatFCFA(p.value) : formatNumber(p.value)}
        </p>
      ))}
    </div>
  );
}

export function SalesLineChart({ data, xKey = 'date', yKey = 'montant', height = 260, money = true }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#7A1F2B" stopOpacity={0.35} />
            <stop offset="100%" stopColor="#7A1F2B" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#00000010" />
        <XAxis dataKey={xKey} tick={{ fontSize: 11, fill: '#5A4E48' }} axisLine={false} tickLine={false} />
        <YAxis
          tick={{ fontSize: 11, fill: '#5A4E48' }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v) => (money ? `${(v / 1e6).toFixed(v >= 1e6 ? 1 : 0)}M`.replace('.0M', 'M') : v)}
          width={40}
        />
        <Tooltip content={<CustomTooltip money={money} />} />
        <Area type="monotone" dataKey={yKey} name="Ventes" stroke="#7A1F2B" strokeWidth={2.5} fill="url(#salesGradient)" dot={{ r: 3, fill: '#7A1F2B' }} activeDot={{ r: 5 }} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function MultiLineChart({ data, lines, xKey = 'date', height = 260, money = true }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#00000010" />
        <XAxis dataKey={xKey} tick={{ fontSize: 11, fill: '#5A4E48' }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 11, fill: '#5A4E48' }} axisLine={false} tickLine={false} width={40}
          tickFormatter={(v) => (money ? `${(v / 1e6).toFixed(v >= 1e6 ? 1 : 0)}M`.replace('.0M', 'M') : v)} />
        <Tooltip content={<CustomTooltip money={money} />} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        {lines.map((l, i) => (
          <Line key={l.key} type="monotone" dataKey={l.key} name={l.name} stroke={l.color || PALETTE[i % PALETTE.length]} strokeWidth={2.5} dot={{ r: 3 }} />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}

export function DonutChart({ data, dataKey = 'pourcentage', nameKey = 'label', height = 240, colors = PALETTE, centerLabel }) {
  return (
    <div className="relative">
      <ResponsiveContainer width="100%" height={height}>
        <PieChart>
          <Pie
            data={data}
            dataKey={dataKey}
            nameKey={nameKey}
            innerRadius="60%"
            outerRadius="90%"
            paddingAngle={2}
            stroke="none"
          >
            {data.map((entry, index) => (
              <Cell key={index} fill={colors[index % colors.length]} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip money={false} />} />
        </PieChart>
      </ResponsiveContainer>
      {centerLabel && (
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          {centerLabel}
        </div>
      )}
    </div>
  );
}

export function SimpleBarChart({ data, xKey = 'label', yKey = 'value', height = 260, money = true, color = '#7A1F2B' }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#00000010" />
        <XAxis dataKey={xKey} tick={{ fontSize: 11, fill: '#5A4E48' }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 11, fill: '#5A4E48' }} axisLine={false} tickLine={false} width={40}
          tickFormatter={(v) => (money ? `${(v / 1e6).toFixed(v >= 1e6 ? 1 : 0)}M`.replace('.0M', 'M') : v)} />
        <Tooltip content={<CustomTooltip money={money} />} />
        <Bar dataKey={yKey} name="Valeur" fill={color} radius={[6, 6, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function Legend2({ items }) {
  return (
    <div className="flex flex-col gap-2.5">
      {items.map((it, i) => (
        <div key={i} className="flex items-center justify-between gap-4 text-sm">
          <span className="flex items-center gap-2 text-ink dark:text-cream-100">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: it.color }} />
            {it.label}
          </span>
          <span className="font-semibold text-ink-light dark:text-cream-300/70">{it.value}</span>
        </div>
      ))}
    </div>
  );
}
