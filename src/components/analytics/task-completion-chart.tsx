'use client';

import { useTranslations } from 'next-intl';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { ChartCard } from './chart-card';
import type { TaskCompletionPoint } from '@/features/analytics';

interface TaskCompletionChartProps {
  data: TaskCompletionPoint[] | undefined;
  loading: boolean;
}

function formatWeek(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export function TaskCompletionChart({ data, loading }: TaskCompletionChartProps) {
  const t = useTranslations('Analytics');

  const formatted = data?.map((d) => ({
    ...d,
    label: formatWeek(d.week),
  }));

  const isEmpty = !data || data.every((d) => d.completed_count === 0);

  return (
    <ChartCard title={t('charts.taskCompletions')} description={t('charts.taskCompletionsDesc')} loading={loading}>
      {isEmpty ? (
        <p className="py-12 text-center text-sm text-gray-400">{t('empty')}</p>
      ) : (
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={formatted} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
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
              <Bar
                dataKey="completed_count"
                name={t('charts.completed')}
                fill="#FF7A00"
                radius={[4, 4, 0, 0]}
                maxBarSize={40}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </ChartCard>
  );
}
