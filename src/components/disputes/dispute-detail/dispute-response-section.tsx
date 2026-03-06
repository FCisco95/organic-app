'use client';

import { useTranslations } from 'next-intl';
import { Clock, ExternalLink } from 'lucide-react';
import type { DisputeWithRelations } from '@/features/disputes/types';
import { formatDateTime } from './utils';

interface DisputeResponseSectionProps {
  dispute: DisputeWithRelations;
}

export function DisputeResponseSection({ dispute }: DisputeResponseSectionProps) {
  const td = useTranslations('Disputes.detail');

  const responseLinks = Array.isArray(dispute.response_links) ? dispute.response_links : [];

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <h3 className="mb-2 text-sm font-semibold text-gray-900">{td('reviewerResponse')}</h3>
      {dispute.response_text ? (
        <>
          <p className="whitespace-pre-wrap text-sm text-gray-700">{dispute.response_text}</p>
          {responseLinks.length > 0 && (
            <ul className="mt-3 space-y-1">
              {responseLinks.map((link, i) => (
                <li key={i}>
                  <a
                    href={link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-sm text-blue-600 hover:underline"
                  >
                    {link}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </li>
              ))}
            </ul>
          )}
        </>
      ) : (
        <div className="text-sm text-gray-400">
          <p>{td('noResponse')}</p>
          {dispute.response_deadline && (
            <p className="mt-1 flex items-center gap-1 text-xs">
              <Clock className="h-3 w-3" />
              {td('responseDeadline', { date: formatDateTime(dispute.response_deadline) ?? '\u2014' })}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
