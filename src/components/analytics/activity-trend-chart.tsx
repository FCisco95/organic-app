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
  Legend,
} from 'recharts';
import { ChartCard } from './chart-card';
import type { ActivityTrendPoint } from '@/features/analytics';

interface ActivityTrendChartProps {
  data: ActivityTrendPoint[] | undefined;
  loading: boolean;
}

function formatDay(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export function ActivityTrendChart({ data, loading }: ActivityTrendChartProps) {
  const t = useTranslations('Analytics');

  const formatted = data?.map((d) => ({
    ...d,
    label: formatDay(d.day),
  }));

  const isEmpty = !data || data.every((d) => d.task_events + d.governance_events + d.comment_events === 0);

  return (
    <ChartCard title={t('charts.activityTrends')} description={t('charts.activityTrendsDesc')} loading={loading}>
      {isEmpty ? (
        <p className="py-12 text-center text-sm text-gray-400">{t('empty')}</p>
      ) : (
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={formatted} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
              <defs>
                <linearGradient id="gradTasks" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#FF7A00" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#FF7A00" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradGovernance" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradComments" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: '#9ca3af' }}
                tickLine={false}
                axisLine={false}
                interval="preserveStartEnd"
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
              <Legend
                iconType="circle"
                iconSize={8}
                wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
              />
              <Area
                type="monotone"
                dataKey="task_events"
                name={t('charts.tasks')}
                stroke="#FF7A00"
                fill="url(#gradTasks)"
                strokeWidth={2}
                stackId="1"
              />
              <Area
                type="monotone"
                dataKey="governance_events"
                name={t('charts.governance')}
                stroke="#6366f1"
                fill="url(#gradGovernance)"
                strokeWidth={2}
                stackId="1"
              />
              <Area
                type="monotone"
                dataKey="comment_events"
                name={t('charts.comments')}
                stroke="#10b981"
                fill="url(#gradComments)"
                strokeWidth={2}
                stackId="1"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </ChartCard>
  );
}
