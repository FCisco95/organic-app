'use client';

import { useAuth } from '@/features/auth/context';
import { PageContainer } from '@/components/layout/page-container';
import { TemplateManager } from '@/components/tasks/template-manager';
import { TemplatePicker } from '@/components/tasks/template-picker';
import { ShieldAlert } from 'lucide-react';

export default function TemplatesPage() {
  const { user, profile } = useAuth();
  const isAdminOrCouncil = profile?.role === 'admin' || profile?.role === 'council';

  if (!user) {
    return (
      <PageContainer>
        <div className="flex flex-col items-center justify-center py-20 text-gray-400">
          <ShieldAlert className="w-12 h-12 mb-4 opacity-50" />
          <h2 className="text-lg font-semibold text-gray-700">Sign in required</h2>
          <p className="text-sm mt-1">You need to be signed in to view templates.</p>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Admin template management */}
        {isAdminOrCouncil && <TemplateManager />}

        {/* All members can view and instantiate templates */}
        {!isAdminOrCouncil && (
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Create Task from Template
            </h2>
            <TemplatePicker />
          </div>
        )}
      </div>
    </PageContainer>
  );
}
