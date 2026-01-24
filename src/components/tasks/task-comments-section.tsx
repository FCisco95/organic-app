'use client';

import Image from 'next/image';
import { MessageSquare, Send } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { TaskComment } from '@/features/tasks';

type TaskCommentsSectionProps = {
  comments: TaskComment[];
  newComment: string;
  isSubmitting: boolean;
  onChange: (value: string) => void;
  onSubmit: (event: React.FormEvent) => void;
  getDisplayName: (user: TaskComment['user']) => string;
  formatDate: (dateString: string) => string;
};

export function TaskCommentsSection({
  comments,
  newComment,
  isSubmitting,
  onChange,
  onSubmit,
  getDisplayName,
  formatDate,
}: TaskCommentsSectionProps) {
  const t = useTranslations('TaskDetail');

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
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
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-organic-orange focus:border-organic-orange mb-2"
        />
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isSubmitting || !newComment.trim()}
            className="flex items-center gap-2 px-4 py-2 bg-organic-orange hover:bg-orange-600 text-white rounded-lg transition-colors disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
            {isSubmitting ? t('posting') : t('postComment')}
          </button>
        </div>
      </form>

      <div className="space-y-4">
        {comments.length === 0 ? (
          <p className="text-gray-500 text-center py-4">{t('noComments')}</p>
        ) : (
          comments.map((comment) => (
            <div key={comment.id} className="border-l-2 border-gray-200 pl-4 py-2">
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
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-organic-orange to-organic-yellow flex items-center justify-center">
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
