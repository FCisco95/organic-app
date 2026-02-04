'use client';

import { Calendar, Target } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import { useSprintTimeline } from '@/features/sprints';
import { formatSprintDate } from '@/features/sprints/utils';
import { SprintSnapshotCard } from './sprint-snapshot-card';

export function SprintTimeline() {
  const t = useTranslations('Sprints');
  const { data: sprints, isLoading } = useSprintTimeline();

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <div className="w-8 h-8 border-3 border-organic-orange border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="mt-4 text-gray-500">{t('loading')}</p>
      </div>
    );
  }

  if (!sprints || sprints.length === 0) {
    return (
      <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
        <Target className="w-12 h-12 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">{t('timelineEmpty')}</h3>
        <p className="text-gray-500">{t('timelineEmptyDesc')}</p>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Vertical line */}
      <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200" />

      <div className="space-y-6">
        {sprints.map((sprint) => (
          <div key={sprint.id} className="relative pl-12">
            {/* Timeline dot */}
            <div className="absolute left-2.5 top-6 w-3 h-3 rounded-full bg-organic-orange border-2 border-white shadow" />

            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <Link
                    href={`/sprints/${sprint.id}`}
                    className="text-lg font-semibold text-gray-900 hover:text-organic-orange transition-colors"
                  >
                    {sprint.name}
                  </Link>
                  <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>
                      {formatSprintDate(sprint.start_at)} — {formatSprintDate(sprint.end_at)}
                    </span>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600 border border-gray-200">
                  {t('status.completed')}
                </span>
              </div>

              {sprint.goal && <p className="text-sm text-gray-600 mb-3">{sprint.goal}</p>}

              {sprint.snapshot && <SprintSnapshotCard snapshot={sprint.snapshot} compact />}

              <Link
                href={`/sprints/${sprint.id}`}
                className="inline-block mt-3 text-sm text-organic-orange hover:text-orange-600 font-medium transition-colors"
              >
                {t('viewDetails')}
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
