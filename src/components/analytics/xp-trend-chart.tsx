'use client';

import { useTranslations } from 'next-intl';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { ChartCard } from './chart-card';
import { CHART_COLORS } from '@/lib/chart-colors';
import type { XpTrendPoint } from '@/features/analytics/personal-types';

interface XpTrendChartProps {
  data: XpTrendPoint[] | undefined;
  loading: boolean;
}

function formatDay(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export function XpTrendChart({ data, loading }: XpTrendChartProps) {
  const t = useTranslations('Analytics.personal');

  const formatted = data?.map((d) => ({
    ...d,
    label: formatDay(d.day),
  }));

  const isEmpty = !data || data.length === 0 || data.every((d) => d.xp_earned === 0);

  return (
    <ChartCard title={t('xpTrendTitle')} description={t('xpTrendDesc')} loading={loading}>
      {isEmpty ? (
        <p className="py-12 text-center text-sm text-gray-400">{t('noData')}</p>
      ) : (
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={formatted} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
              <defs>
                <linearGradient id="gradXp" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={CHART_COLORS.terracotta} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={CHART_COLORS.terracotta} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: CHART_COLORS.axis }}
                tickLine={false}
                axisLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                tick={{ fontSize: 11, fill: CHART_COLORS.axis }}
                tickLine={false}
                axisLine={false}
                allowDecimals={false}
              />
              <Tooltip
                contentStyle={{
                  fontSize: 12,
                  borderRadius: 8,
                  border: `1px solid ${CHART_COLORS.tooltipBorder}`,
                  boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                }}
              />
              <Area
                type="monotone"
                dataKey="xp_earned"
                name={t('xpEarned')}
                stroke={CHART_COLORS.terracotta}
                fill="url(#gradXp)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </ChartCard>
  );
}
