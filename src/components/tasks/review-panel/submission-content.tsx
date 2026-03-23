'use client';

import {
  ExternalLink,
  Code,
  FileText,
  Palette,
  Eye,
  ThumbsUp,
  Share2,
  Link as LinkIcon,
  Heart,
  ImageIcon,
} from 'lucide-react';
import type { TaskSubmissionWithReviewer } from '@/features/tasks';
import { useTranslations } from 'next-intl';
import { engagementIcons, engagementColors } from '@/components/ui/x-brand-icon';

export function SubmissionContent({
  submission,
  compact = false,
}: {
  submission: TaskSubmissionWithReviewer;
  compact?: boolean;
}) {
  const t = useTranslations('Tasks.review');
  const type = submission.submission_type;
  const customFields = submission.custom_fields as Record<
    string,
    string | number | boolean | null
  > | null;
  const customLink =
    customFields && typeof customFields.link === 'string' ? customFields.link : null;
  const twitterScreenshotUrl =
    customFields && typeof customFields.screenshot_url === 'string'
      ? customFields.screenshot_url
      : submission.content_link;
  const twitterCommentText =
    customFields && typeof customFields.comment_text === 'string'
      ? customFields.comment_text
      : submission.content_text;
  const twitterEngagementType =
    customFields && typeof customFields.engagement_type === 'string'
      ? customFields.engagement_type
      : null;

  return (
    <div className="space-y-3">
      {/* Development */}
      {type === 'development' && submission.pr_link && (
        <div>
          <a
            href={submission.pr_link}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800 font-medium"
          >
            <Code aria-hidden="true" className="w-4 h-4" />
            {t('viewPullRequest')}
            <ExternalLink aria-hidden="true" className="w-3 h-3" />
          </a>
          {!compact && submission.testing_notes && (
            <p className="mt-2 text-sm text-gray-600">
              <strong>{t('testing')}:</strong> {submission.testing_notes}
            </p>
          )}
        </div>
      )}

      {/* Content */}
      {type === 'content' && (
        <div>
          {submission.content_link && (
            <a
              href={submission.content_link}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800 font-medium"
            >
              <FileText aria-hidden="true" className="w-4 h-4" />
              {t('viewContent')}
              <ExternalLink aria-hidden="true" className="w-3 h-3" />
            </a>
          )}
          {!compact && submission.content_text && (
            <p className="mt-2 text-sm text-gray-700 bg-gray-50 p-3 rounded-lg whitespace-pre-wrap">
              {submission.content_text}
            </p>
          )}
          {submission.reach_metrics && (
            <div className="mt-2 flex items-center gap-4 text-sm text-gray-600">
              {(submission.reach_metrics as Record<string, number>).views !== undefined && (
                <span className="flex items-center gap-1">
                  <Eye aria-hidden="true" className="w-3 h-3" />
                  {(submission.reach_metrics as Record<string, number>).views} {t('views')}
                </span>
              )}
              {(submission.reach_metrics as Record<string, number>).likes !== undefined && (
                <span className="flex items-center gap-1">
                  <ThumbsUp aria-hidden="true" className="w-3 h-3" />
                  {(submission.reach_metrics as Record<string, number>).likes} {t('likes')}
                </span>
              )}
              {(submission.reach_metrics as Record<string, number>).shares !== undefined && (
                <span className="flex items-center gap-1">
                  <Share2 aria-hidden="true" className="w-3 h-3" />
                  {(submission.reach_metrics as Record<string, number>).shares} {t('shares')}
                </span>
              )}
            </div>
          )}
        </div>
      )}

      {/* Design */}
      {type === 'design' && submission.file_urls && (
        <div>
          <ul className="space-y-1">
            {submission.file_urls.map((url, index) => (
              <li key={index}>
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800 text-sm"
                >
                  <Palette aria-hidden="true" className="w-4 h-4" />
                  {t('designFile', { index: index + 1 })}
                  <ExternalLink aria-hidden="true" className="w-3 h-3" />
                </a>
              </li>
            ))}
          </ul>
          {!compact && submission.revision_notes && (
            <p className="mt-2 text-sm text-gray-600">
              <strong>{t('revisionNotes')}:</strong> {submission.revision_notes}
            </p>
          )}
        </div>
      )}

      {type === 'twitter' && (
        <div className="space-y-3">
          {twitterScreenshotUrl && (
            <a
              href={twitterScreenshotUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center gap-3 rounded-lg border border-border bg-card p-3 transition-colors duration-150 hover:bg-muted/50 hover:border-border"
            >
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-sky-50 text-sky-600 flex-shrink-0">
                <ImageIcon aria-hidden="true" className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-foreground">{t('viewEvidence')}</p>
                <p className="text-xs text-muted-foreground truncate">{twitterScreenshotUrl}</p>
              </div>
              <ExternalLink aria-hidden="true" className="w-4 h-4 text-muted-foreground flex-shrink-0 transition-transform duration-150 group-hover:scale-110" />
            </a>
          )}

          {twitterEngagementType && (() => {
            const EngIcon = engagementIcons[twitterEngagementType] || Heart;
            return (
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${engagementColors[twitterEngagementType] || 'bg-muted text-muted-foreground border-border'}`}>
                <EngIcon className="w-3 h-3" />
                {t('twitterEngagement')}: {twitterEngagementType}
              </span>
            );
          })()}

          {!compact && twitterCommentText && (
            <div className="border-l-2 border-sky-300 pl-3 py-1">
              <p className="text-xs font-medium text-muted-foreground mb-1">{t('commentText')}</p>
              <p className="text-sm text-foreground whitespace-pre-wrap">{twitterCommentText}</p>
            </div>
          )}
        </div>
      )}

      {/* Custom */}
      {type === 'custom' && (
        <div>
          {customLink && (
            <a
              href={customLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800 font-medium"
            >
              <LinkIcon aria-hidden="true" className="w-4 h-4" />
              {t('viewSubmission')}
              <ExternalLink aria-hidden="true" className="w-3 h-3" />
            </a>
          )}
          {!compact && customFields && (
            <div className="mt-2 text-sm text-gray-600 space-y-1">
              {Object.entries(customFields)
                .filter(([key, value]) => key !== 'link' && value !== null && value !== '')
                .map(([key, value]) => (
                  <p key={key}>
                    <strong className="capitalize">{key}:</strong> {String(value)}
                  </p>
                ))}
            </div>
          )}
        </div>
      )}

      {/* Description (all types) */}
      {!compact && submission.description && (
        <p className="text-sm text-gray-700">{submission.description}</p>
      )}
    </div>
  );
}
