'use client';

import { Code, FileText, Palette, Wrench } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TaskType, TASK_TYPE_LABELS } from '@/features/tasks';

interface TaskTypeBadgeProps {
  type: TaskType;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
}

const typeConfig: Record<TaskType, { icon: React.ElementType; color: string }> = {
  development: {
    icon: Code,
    color: 'bg-blue-100 text-blue-700 border-blue-200',
  },
  content: {
    icon: FileText,
    color: 'bg-green-100 text-green-700 border-green-200',
  },
  design: {
    icon: Palette,
    color: 'bg-pink-100 text-pink-700 border-pink-200',
  },
  custom: {
    icon: Wrench,
    color: 'bg-gray-100 text-gray-700 border-gray-200',
  },
};

const sizeClasses = {
  sm: 'px-1.5 py-0.5 text-xs',
  md: 'px-2 py-1 text-sm',
  lg: 'px-3 py-1.5 text-base',
};

const iconSizeClasses = {
  sm: 'w-3 h-3',
  md: 'w-4 h-4',
  lg: 'w-5 h-5',
};

export function TaskTypeBadge({
  type,
  size = 'md',
  showLabel = true,
  className,
}: TaskTypeBadgeProps) {
  const config = typeConfig[type];
  const Icon = config.icon;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border font-medium',
        config.color,
        sizeClasses[size],
        className
      )}
    >
      <Icon className={iconSizeClasses[size]} />
      {showLabel && <span>{TASK_TYPE_LABELS[type]}</span>}
    </span>
  );
}

interface TaskTypeSelectorProps {
  value: TaskType;
  onChange: (type: TaskType) => void;
  disabled?: boolean;
  className?: string;
}

export function TaskTypeSelector({
  value,
  onChange,
  disabled = false,
  className,
}: TaskTypeSelectorProps) {
  const types: TaskType[] = ['development', 'content', 'design', 'custom'];

  return (
    <div className={cn('grid grid-cols-2 gap-2', className)}>
      {types.map((type) => {
        const config = typeConfig[type];
        const Icon = config.icon;
        const isSelected = value === type;

        return (
          <button
            key={type}
            type="button"
            onClick={() => onChange(type)}
            disabled={disabled}
            className={cn(
              'flex items-center gap-2 p-3 rounded-lg border-2 transition-all',
              isSelected
                ? 'border-organic-orange bg-orange-50'
                : 'border-gray-200 hover:border-gray-300 bg-white',
              disabled && 'opacity-50 cursor-not-allowed'
            )}
          >
            <Icon className={cn('w-5 h-5', isSelected ? 'text-organic-orange' : 'text-gray-500')} />
            <span
              className={cn('font-medium', isSelected ? 'text-organic-orange' : 'text-gray-700')}
            >
              {TASK_TYPE_LABELS[type]}
            </span>
          </button>
        );
      })}
    </div>
  );
}
