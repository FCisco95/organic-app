'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/features/auth/context';
import { Navigation } from '@/components/navigation';
import { createClient } from '@/lib/supabase/client';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';

export default function NewProposalPage() {
  const router = useRouter();
  const { user, profile } = useAuth();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const canCreate = profile?.role && ['member', 'council', 'admin'].includes(profile.role);

  async function handleSubmit(e: React.FormEvent, status: 'draft' | 'submitted') {
    e.preventDefault();

    if (!user || !canCreate) {
      toast.error('You must be a member to create proposals');
      return;
    }

    if (!title.trim() || !body.trim()) {
      toast.error('Title and body are required');
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

      toast.success(
        status === 'draft'
          ? 'Proposal saved as draft'
          : 'Proposal submitted successfully!'
      );
      router.push(`/proposals/${data.id}`);
    } catch (error) {
      console.error('Error creating proposal:', error);
      toast.error('Failed to create proposal');
    } finally {
      setSubmitting(false);
    }
  }

  if (!user) {
    return (
      <main className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Sign in to create proposals
          </h1>
          <Link
            href="/login"
            className="inline-block bg-organic-orange hover:bg-orange-600 text-white px-6 py-3 rounded-lg font-medium transition-colors"
          >
            Sign In
          </Link>
        </div>
      </main>
    );
  }

  if (!canCreate) {
    return (
      <main className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            You need to be a member to create proposals
          </h1>
          <p className="text-gray-600 mb-6">
            Link your wallet and hold $ORG tokens to become a member
          </p>
          <Link
            href="/profile"
            className="inline-block bg-organic-orange hover:bg-orange-600 text-white px-6 py-3 rounded-lg font-medium transition-colors"
          >
            Go to Profile
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <Navigation />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/proposals"
            className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Proposals
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">Create New Proposal</h1>
          <p className="text-gray-600 mt-1">
            Share your idea with the Organic DAO community
          </p>
        </div>

        {/* Form */}
        <form onSubmit={(e) => handleSubmit(e, 'submitted')}>
          <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-6">
            {/* Title */}
            <div>
              <label
                htmlFor="title"
                className="block text-sm font-medium text-gray-900 mb-2"
              >
                Title
              </label>
              <input
                type="text"
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Give your proposal a clear, concise title"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-organic-orange focus:border-transparent"
                maxLength={200}
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                {title.length}/200 characters
              </p>
            </div>

            {/* Body */}
            <div>
              <label
                htmlFor="body"
                className="block text-sm font-medium text-gray-900 mb-2"
              >
                Description
              </label>
              <textarea
                id="body"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Describe your proposal in detail. What problem does it solve? What are the benefits? What resources are needed?"
                rows={12}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-organic-orange focus:border-transparent resize-none"
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                {body.length} characters
              </p>
            </div>

            {/* Guidelines */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-semibold text-blue-900 mb-2">
                Proposal Guidelines
              </h3>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Be clear and specific about what you&apos;re proposing</li>
                <li>• Explain the problem and your proposed solution</li>
                <li>• Include any relevant data or examples</li>
                <li>• Consider implementation details and timeline</li>
                <li>• Be respectful and constructive</li>
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
                Save as Draft
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 px-6 py-3 bg-organic-orange hover:bg-orange-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? 'Submitting...' : 'Submit Proposal'}
              </button>
            </div>
          </div>
        </form>

        {/* Info */}
        <div className="mt-6 bg-gradient-to-r from-orange-50 to-yellow-50 border border-orange-200 rounded-lg p-6">
          <h3 className="font-semibold text-gray-900 mb-2">What happens next?</h3>
          <ul className="text-sm text-gray-700 space-y-2">
            <li>
              <strong>1. Community Discussion:</strong> Members can comment and provide
              feedback
            </li>
            <li>
              <strong>2. Review:</strong> Council members review the proposal
            </li>
            <li>
              <strong>3. Voting:</strong> If approved for voting, token holders can vote
            </li>
            <li>
              <strong>4. Implementation:</strong> Approved proposals can be converted to
              tasks
            </li>
          </ul>
        </div>
      </div>
    </main>
  );
}
