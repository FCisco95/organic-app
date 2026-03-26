'use client';

import { useTranslations } from 'next-intl';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { ChartCard } from './chart-card';
import { CHART_COLORS } from '@/lib/chart-colors';
import type { EngagementBreakdown as EngagementData } from '@/features/analytics/personal-types';

interface EngagementBreakdownProps {
  data: EngagementData | undefined;
  loading: boolean;
}

export function EngagementBreakdown({ data, loading }: EngagementBreakdownProps) {
  const t = useTranslations('Analytics.personal');

  const chartData = data
    ? [
        { name: t('posts'), value: data.posts_created, fill: CHART_COLORS.terracotta },
        { name: t('comments'), value: data.comments_made, fill: CHART_COLORS.indigo },
        { name: t('likesGiven'), value: data.likes_given, fill: CHART_COLORS.emerald },
        { name: t('likesReceived'), value: data.likes_received, fill: CHART_COLORS.amber },
      ]
    : [];

  const isEmpty = !data || Object.values(data).every((v) => v === 0);

  return (
    <ChartCard title={t('engagementTitle')} description={t('engagementDesc')} loading={loading}>
      {isEmpty ? (
        <p className="py-12 text-center text-sm text-gray-400">{t('noData')}</p>
      ) : (
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 11, fill: CHART_COLORS.axis }}
                tickLine={false}
                axisLine={false}
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
              <Bar dataKey="value" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </ChartCard>
  );
}
