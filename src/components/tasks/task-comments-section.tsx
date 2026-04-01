'use client';

import Image from 'next/image';
import { MessageSquare, Send } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Skeleton } from '@/components/ui/skeleton';
import type { TaskComment } from '@/features/tasks';

type TaskCommentsSectionProps = {
  comments: TaskComment[];
  newComment: string;
  isSubmitting: boolean;
  loading?: boolean;
  onChange: (value: string) => void;
  onSubmit: (event: React.FormEvent) => void;
  getDisplayName: (user: TaskComment['user']) => string;
  formatDate: (dateString: string) => string;
};

export function TaskCommentsSection({
  comments,
  newComment,
  isSubmitting,
  loading = false,
  onChange,
  onSubmit,
  getDisplayName,
  formatDate,
}: TaskCommentsSectionProps) {
  const t = useTranslations('TaskDetail');

  return (
    <div className="bg-white rounded-xl border border-border p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <MessageSquare className="w-5 h-5" />
        {t('commentsTitle', { count: comments.length })}
      </h2>

      <form onSubmit={onSubmit} className="mb-6">
        <textarea
          value={newComment}
          onChange={(e) => onChange(e.target.value)}
          placeholder={t('commentPlaceholder')}
          rows={3}
          maxLength={1000}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-organic-terracotta focus:border-organic-terracotta mb-2"
        />
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">{newComment.length}/1000</span>
          <button
            type="submit"
            disabled={isSubmitting || !newComment.trim()}
            className="flex items-center gap-2 px-4 py-2 bg-cta hover:bg-cta-hover text-cta-fg rounded-lg transition-colors disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
            {isSubmitting ? t('posting') : t('postComment')}
          </button>
        </div>
      </form>

      <div className="space-y-4">
        {loading ? (
          [1, 2, 3].map((i) => (
            <div key={i} className="flex items-start gap-3 border-l-2 border-border pl-4 py-2">
              <Skeleton className="h-8 w-8 rounded-full shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-3 w-16" />
                </div>
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-2/3" />
              </div>
            </div>
          ))
        ) : comments.length === 0 ? (
          <p className="text-gray-500 text-center py-4">{t('noComments')}</p>
        ) : (
          comments.map((comment) => (
            <div key={comment.id} className="border-l-2 border-border pl-4 py-2">
              <div className="flex items-start gap-3">
                {comment.user.avatar_url ? (
                  <Image
                    src={comment.user.avatar_url}
                    alt={getDisplayName(comment.user)}
                    width={32}
                    height={32}
                    className="rounded-full"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-organic-terracotta to-organic-yellow flex items-center justify-center">
                    <span className="text-white text-sm font-bold">
                      {getDisplayName(comment.user)[0].toUpperCase()}
                    </span>
                  </div>
                )}
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-gray-900">
                      {getDisplayName(comment.user)}
                    </span>
                    <span className="text-xs text-gray-500">{formatDate(comment.created_at)}</span>
                  </div>
                  <p className="text-gray-700 whitespace-pre-wrap">{comment.content}</p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
