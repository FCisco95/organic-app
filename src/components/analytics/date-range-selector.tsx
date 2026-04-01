'use client';

import { cn } from '@/lib/utils';
import type { AnalyticsPreset } from '@/features/analytics/types';

const PRESETS: AnalyticsPreset[] = ['7d', '14d', '30d', '90d'];

interface DateRangeSelectorProps {
  value: AnalyticsPreset;
  onChange: (preset: AnalyticsPreset) => void;
}

export function DateRangeSelector({ value, onChange }: DateRangeSelectorProps) {
  return (
    <div className="inline-flex items-center gap-1 rounded-lg border border-border bg-muted/50 p-1">
      {PRESETS.map((preset) => (
        <button
          key={preset}
          onClick={() => onChange(preset)}
          className={cn(
            'rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
            value === preset
              ? 'bg-organic-terracotta-lightest0 text-white shadow-sm'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted'
          )}
        >
          {preset}
        </button>
      ))}
    </div>
  );
}
