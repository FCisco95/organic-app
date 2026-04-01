'use client';

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { ChartCard } from './chart-card';
import { cn } from '@/lib/utils';
import type { ActivityHeatmapDay } from '@/features/analytics/personal-types';

interface ActivityHeatmapProps {
  data: ActivityHeatmapDay[] | undefined;
  loading: boolean;
}

/** Map count to intensity level 0–4 */
function getIntensity(count: number, max: number): number {
  if (count === 0 || max === 0) return 0;
  const ratio = count / max;
  if (ratio <= 0.25) return 1;
  if (ratio <= 0.5) return 2;
  if (ratio <= 0.75) return 3;
  return 4;
}

const INTENSITY_CLASSES = [
  'bg-gray-100 dark:bg-gray-800',
  'bg-organic-terracotta-light/30 dark:bg-organic-terracotta-hover/40',
  'bg-organic-terracotta-light/30 dark:bg-organic-terracotta-hover/50',
  'bg-organic-terracotta dark:bg-organic-terracotta/60',
  'bg-organic-terracotta dark:bg-organic-terracotta-lightest0',
] as const;

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function ActivityHeatmap({ data, loading }: ActivityHeatmapProps) {
  const t = useTranslations('Analytics.personal');

  const { weeks, monthMarkers, max } = useMemo(() => {
    const countMap = new Map<string, number>();
    for (const d of data ?? []) {
      countMap.set(d.date, d.count);
    }

    // Build 52 weeks of data ending today
    const today = new Date();
    const startDate = new Date(today);
    startDate.setDate(startDate.getDate() - 364);
    // Align to Sunday
    startDate.setDate(startDate.getDate() - startDate.getDay());

    const weeksArr: { date: string; count: number; dayOfWeek: number }[][] = [];
    const markers: { weekIndex: number; label: string }[] = [];
    let currentWeek: { date: string; count: number; dayOfWeek: number }[] = [];
    let lastMonth = -1;

    const cursor = new Date(startDate);
    let weekIndex = 0;

    while (cursor <= today) {
      const dateStr = cursor.toISOString().slice(0, 10);
      const dayOfWeek = cursor.getDay();
      const month = cursor.getMonth();

      currentWeek.push({
        date: dateStr,
        count: countMap.get(dateStr) ?? 0,
        dayOfWeek,
      });

      if (month !== lastMonth) {
        markers.push({ weekIndex, label: MONTH_LABELS[month] });
        lastMonth = month;
      }

      if (dayOfWeek === 6 || cursor.getTime() >= today.getTime()) {
        weeksArr.push(currentWeek);
        currentWeek = [];
        weekIndex++;
      }

      cursor.setDate(cursor.getDate() + 1);
    }

    if (currentWeek.length > 0) {
      weeksArr.push(currentWeek);
    }

    const maxCount = Math.max(1, ...Array.from(countMap.values()));

    return { weeks: weeksArr, monthMarkers: markers, max: maxCount };
  }, [data]);

  const isEmpty = !data || data.length === 0;

  return (
    <ChartCard title={t('heatmapTitle')} description={t('heatmapDesc')} loading={loading}>
      {isEmpty ? (
        <p className="py-12 text-center text-sm text-gray-400">{t('noData')}</p>
      ) : (
        <div className="overflow-x-auto">
          {/* Month labels */}
          <div className="flex gap-[3px] mb-1 ml-7">
            {monthMarkers.map((m, i) => (
              <span
                key={i}
                className="text-[10px] text-muted-foreground"
                style={{ position: 'relative', left: `${m.weekIndex * 15}px` }}
              >
                {m.label}
              </span>
            ))}
          </div>

          <div className="flex gap-0.5">
            {/* Day labels */}
            <div className="flex flex-col gap-[3px] mr-1 text-[10px] text-muted-foreground">
              <span className="h-[12px]" />
              <span className="h-[12px] leading-[12px]">Mon</span>
              <span className="h-[12px]" />
              <span className="h-[12px] leading-[12px]">Wed</span>
              <span className="h-[12px]" />
              <span className="h-[12px] leading-[12px]">Fri</span>
              <span className="h-[12px]" />
            </div>

            {/* Grid */}
            {weeks.map((week, wi) => (
              <div key={wi} className="flex flex-col gap-[3px]">
                {Array.from({ length: 7 }, (_, dayIndex) => {
                  const cell = week.find((c) => c.dayOfWeek === dayIndex);
                  if (!cell) {
                    return <div key={dayIndex} className="h-[12px] w-[12px]" />;
                  }
                  const intensity = getIntensity(cell.count, max);
                  return (
                    <div
                      key={dayIndex}
                      className={cn(
                        'h-[12px] w-[12px] rounded-[2px] transition-colors',
                        INTENSITY_CLASSES[intensity]
                      )}
                      title={`${cell.date}: ${cell.count} activities`}
                    />
                  );
                })}
              </div>
            ))}
          </div>

          {/* Legend */}
          <div className="flex items-center gap-1.5 mt-3 justify-end">
            <span className="text-[10px] text-muted-foreground">{t('less')}</span>
            {INTENSITY_CLASSES.map((cls, i) => (
              <div key={i} className={cn('h-[12px] w-[12px] rounded-[2px]', cls)} />
            ))}
            <span className="text-[10px] text-muted-foreground">{t('more')}</span>
          </div>
        </div>
      )}
    </ChartCard>
  );
}
