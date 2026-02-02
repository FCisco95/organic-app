'use client';

import { useState } from 'react';
import { Link, useRouter } from '@/i18n/navigation';
import { useAuth } from '@/features/auth/context';

import { createClient } from '@/lib/supabase/client';
import { ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';
import { useTranslations } from 'next-intl';
import { PageContainer } from '@/components/layout';

export default function NewProposalPage() {
  const router = useRouter();
  const { user, profile } = useAuth();
  const t = useTranslations('ProposalCreate');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const canCreate = profile?.role && ['member', 'council', 'admin'].includes(profile.role);

  async function handleSubmit(e: React.FormEvent, status: 'draft' | 'submitted') {
    e.preventDefault();

    if (!user || !canCreate) {
      toast.error(t('toastMustBeMember'));
      return;
    }

    if (!title.trim() || !body.trim()) {
      toast.error(t('toastTitleBodyRequired'));
      return;
    }

    try {
      setSubmitting(true);
      const supabase = createClient();

      const { data, error } = await supabase
        .from('proposals')
        .insert({
          title: title.trim(),
          body: body.trim(),
          status,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;

      toast.success(status === 'draft' ? t('toastSavedDraft') : t('toastSubmitted'));
      router.push(`/proposals/${data.id}`);
    } catch (error) {
      console.error('Error creating proposal:', error);
      toast.error(t('toastFailedCreate'));
    } finally {
      setSubmitting(false);
    }
  }

  if (!user) {
    return (
      <PageContainer width="narrow" className="text-center py-10">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">{t('signInTitle')}</h1>
        <Link
          href="/login"
          className="inline-block bg-organic-orange hover:bg-orange-600 text-white px-6 py-3 rounded-lg font-medium transition-colors"
        >
          {t('signInCta')}
        </Link>
      </PageContainer>
    );
  }

  if (!canCreate) {
    return (
      <PageContainer width="narrow" className="text-center py-10">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">{t('memberOnlyTitle')}</h1>
        <p className="text-gray-600 mb-6">{t('memberOnlyDescription')}</p>
        <Link
          href="/profile"
          className="inline-block bg-organic-orange hover:bg-orange-600 text-white px-6 py-3 rounded-lg font-medium transition-colors"
        >
          {t('goToProfile')}
        </Link>
      </PageContainer>
    );
  }

  return (
    <PageContainer width="narrow">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/proposals"
            className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            {t('backToProposals')}
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">{t('title')}</h1>
          <p className="text-gray-600 mt-1">{t('subtitle')}</p>
        </div>

        {/* Form */}
        <form onSubmit={(e) => handleSubmit(e, 'submitted')}>
          <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-6">
            {/* Title */}
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-900 mb-2">
                {t('labelTitle')}
              </label>
              <input
                type="text"
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={t('placeholderTitle')}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-organic-orange focus:border-transparent"
                maxLength={200}
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                {t('charactersCount', { count: title.length, max: 200 })}
              </p>
            </div>

            {/* Body */}
            <div>
              <label htmlFor="body" className="block text-sm font-medium text-gray-900 mb-2">
                {t('labelDescription')}
              </label>
              <textarea
                id="body"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder={t('placeholderDescription')}
                rows={12}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-organic-orange focus:border-transparent resize-none"
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                {t('charactersCountNoMax', { count: body.length })}
              </p>
            </div>

            {/* Guidelines */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-semibold text-blue-900 mb-2">{t('guidelinesTitle')}</h3>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>{t('guideline1')}</li>
                <li>{t('guideline2')}</li>
                <li>{t('guideline3')}</li>
                <li>{t('guideline4')}</li>
                <li>{t('guideline5')}</li>
              </ul>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={(e) => handleSubmit(e as any, 'draft')}
                disabled={submitting}
                className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {t('saveDraft')}
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 px-6 py-3 bg-organic-orange hover:bg-orange-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? t('submitting') : t('submitProposal')}
              </button>
            </div>
          </div>
        </form>

        {/* Info */}
        <div className="mt-6 bg-gradient-to-r from-orange-50 to-yellow-50 border border-orange-200 rounded-lg p-6">
          <h3 className="font-semibold text-gray-900 mb-2">{t('nextTitle')}</h3>
          <ul className="text-sm text-gray-700 space-y-2">
            <li>{t('nextStep1')}</li>
            <li>{t('nextStep2')}</li>
            <li>{t('nextStep3')}</li>
            <li>{t('nextStep4')}</li>
          </ul>
        </div>
    </PageContainer>
  );
}
