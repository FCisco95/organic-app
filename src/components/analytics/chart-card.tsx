'use client';

import { cn } from '@/lib/utils';

interface ChartCardProps {
  title: string;
  description?: string;
  loading?: boolean;
  children: React.ReactNode;
  className?: string;
}

export function ChartCard({ title, description, loading, children, className }: ChartCardProps) {
  return (
    <div
      className={cn(
        'rounded-2xl bg-white shadow-sm ring-1 ring-gray-200/70 p-5',
        className
      )}
    >
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
        {description && <p className="mt-0.5 text-xs text-gray-400">{description}</p>}
      </div>
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-200 border-t-gray-500" />
        </div>
      ) : (
        children
      )}
    </div>
  );
}
