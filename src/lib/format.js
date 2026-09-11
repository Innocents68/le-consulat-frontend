export function formatFCFA(value) {
  if (value === null || value === undefined || Number.isNaN(value)) return '—';
  return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(value) + ' FCFA';
}

export function formatNumber(value) {
  if (value === null || value === undefined || Number.isNaN(value)) return '—';
  return new Intl.NumberFormat('fr-FR').format(value);
}

export function formatDate(value) {
  if (!value) return '—';
  try {
    const d = new Date(value);
    return new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(d);
  } catch {
    return value;
  }
}

export function formatDateTime(value) {
  if (!value) return '—';
  try {
    const d = new Date(value);
    return new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
    }).format(d);
  } catch {
    return value;
  }
}

export function formatPercent(value, digits = 1) {
  if (value === null || value === undefined || Number.isNaN(value)) return '—';
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(digits)}%`;
}

export function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export function daysAgoISO(days) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

// Préréglages de période communs (§6.9.2 du CDC) : chaque préréglage renvoie { dateDebut, dateFin }
// au format ISO (yyyy-MM-dd), bornes incluses.
export function periodePreset(preset) {
  const today = todayISO();
  switch (preset) {
    case 'aujourdhui':
      return { dateDebut: today, dateFin: today };
    case 'hier':
      return { dateDebut: daysAgoISO(1), dateFin: daysAgoISO(1) };
    case 'semaine': {
      const now = new Date();
      const jourSemaine = (now.getDay() + 6) % 7; // lundi = 0
      return { dateDebut: daysAgoISO(jourSemaine), dateFin: today };
    }
    case 'mois': {
      const now = new Date();
      const debut = new Date(now.getFullYear(), now.getMonth(), 1);
      return { dateDebut: debut.toISOString().slice(0, 10), dateFin: today };
    }
    case 'annee': {
      const now = new Date();
      const debut = new Date(now.getFullYear(), 0, 1);
      return { dateDebut: debut.toISOString().slice(0, 10), dateFin: today };
    }
    default:
      return { dateDebut: '', dateFin: '' };
  }
}
