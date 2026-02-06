'use client';

import { useTranslations } from 'next-intl';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { ChartCard } from './chart-card';
import type { ProposalCategoryData } from '@/features/analytics';

interface ProposalCategoryChartProps {
  data: ProposalCategoryData[] | undefined;
  loading: boolean;
}

const COLORS = ['#FF7A00', '#6366f1', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6'];

const CATEGORY_LABELS: Record<string, string> = {
  feature: 'Feature',
  governance: 'Governance',
  treasury: 'Treasury',
  community: 'Community',
  development: 'Development',
  uncategorized: 'Uncategorized',
};

export function ProposalCategoryChart({ data, loading }: ProposalCategoryChartProps) {
  const t = useTranslations('Analytics');

  const isEmpty = !data || data.length === 0;

  const chartData = data?.map((d) => ({
    ...d,
    name: CATEGORY_LABELS[d.category] ?? d.category,
  }));

  return (
    <ChartCard title={t('charts.proposalsByCategory')} loading={loading}>
      {isEmpty ? (
        <p className="py-12 text-center text-sm text-gray-400">{t('empty')}</p>
      ) : (
        <div className="flex items-center gap-4">
          <div className="h-52 w-52 shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  dataKey="count"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={75}
                  paddingAngle={2}
                  strokeWidth={0}
                >
                  {chartData?.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    fontSize: 12,
                    borderRadius: 8,
                    border: '1px solid #e5e7eb',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-col gap-2 text-xs">
            {chartData?.map((entry, i) => (
              <div key={entry.name} className="flex items-center gap-2">
                <span
                  className="inline-block h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: COLORS[i % COLORS.length] }}
                />
                <span className="text-gray-600">{entry.name}</span>
                <span className="font-semibold text-gray-900">{entry.count}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </ChartCard>
  );
}
