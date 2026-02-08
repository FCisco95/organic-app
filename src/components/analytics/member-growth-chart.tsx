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
import type { MemberGrowthPoint } from '@/features/analytics';

interface MemberGrowthChartProps {
  data: MemberGrowthPoint[] | undefined;
  loading: boolean;
}

function formatMonth(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString(undefined, { month: 'short', year: '2-digit' });
}

export function MemberGrowthChart({ data, loading }: MemberGrowthChartProps) {
  const t = useTranslations('Analytics');

  const formatted = data?.map((d) => ({
    ...d,
    label: formatMonth(d.month),
  }));

  const isEmpty = !data || data.length === 0;

  return (
    <ChartCard
      title={t('charts.memberGrowth')}
      description={t('charts.memberGrowthDesc')}
      loading={loading}
    >
      {isEmpty ? (
        <p className="py-12 text-center text-sm text-gray-400">{t('empty')}</p>
      ) : (
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={formatted} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
              <defs>
                <linearGradient id="gradMembers" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#FF7A00" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#FF7A00" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: '#9ca3af' }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: '#9ca3af' }}
                tickLine={false}
                axisLine={false}
                allowDecimals={false}
              />
              <Tooltip
                contentStyle={{
                  fontSize: 12,
                  borderRadius: 8,
                  border: '1px solid #e5e7eb',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                }}
              />
              <Area
                type="monotone"
                dataKey="cumulative_members"
                name={t('charts.totalMembers')}
                stroke="#FF7A00"
                fill="url(#gradMembers)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </ChartCard>
  );
}
