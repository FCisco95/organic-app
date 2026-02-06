'use client';

import { useTranslations } from 'next-intl';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { ChartCard } from '@/components/analytics/chart-card';
import type { TreasuryAllocation } from '@/features/treasury';

interface AllocationChartProps {
  allocations: TreasuryAllocation[] | undefined;
  loading: boolean;
}

function formatUsd(value: number | null): string {
  if (value == null) return '—';
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(1)}K`;
  return `$${value.toFixed(2)}`;
}

export function AllocationChart({ allocations, loading }: AllocationChartProps) {
  const t = useTranslations('Treasury');

  const data = (allocations ?? []).map((a) => ({
    ...a,
    label: t(`allocation.${a.key}`),
  }));

  return (
    <ChartCard title={t('allocationTitle')} description={t('allocationDesc')} loading={loading}>
      <div className="flex flex-col sm:flex-row items-center gap-6">
        {/* Chart */}
        <div className="h-48 w-48 shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
                paddingAngle={3}
                dataKey="percentage"
                stroke="none"
              >
                {data.map((entry) => (
                  <Cell key={entry.key} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value) => [`${value}%`, '']}
                contentStyle={{
                  borderRadius: '8px',
                  border: '1px solid #e5e7eb',
                  fontSize: '12px',
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Legend */}
        <div className="flex-1 space-y-3 w-full">
          {data.map((item) => (
            <div key={item.key} className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div
                  className="h-3 w-3 rounded-full shrink-0"
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-sm text-gray-700">{item.label}</span>
              </div>
              <div className="flex items-center gap-3 text-right">
                <span className="text-sm font-semibold text-gray-900 tabular-nums">
                  {item.percentage}%
                </span>
                <span className="text-xs font-mono text-gray-400 tabular-nums w-16 text-right">
                  {formatUsd(item.amount_usd)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </ChartCard>
  );
}
