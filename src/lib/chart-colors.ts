export const CHART_COLORS = {
  // Brand
  terracotta: '#D95D39',
  terracottaLight: '#D95D3940',
  // Series palette
  indigo: '#6366f1',
  emerald: '#10b981',
  amber: '#f59e0b',
  pink: '#ec4899',
  violet: '#8b5cf6',
  // Neutrals (light mode — dark mode via CSS vars)
  grid: 'var(--chart-grid)',
  axis: 'var(--chart-axis)',
  tooltipBorder: 'var(--chart-tooltip-border)',
} as const;

export const CHART_SERIES = [
  CHART_COLORS.terracotta,
  CHART_COLORS.indigo,
  CHART_COLORS.emerald,
  CHART_COLORS.amber,
  CHART_COLORS.pink,
  CHART_COLORS.violet,
];
