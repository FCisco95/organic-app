'use client';

import { useSearchParams } from 'next/navigation';
import { ProgressionShell } from '@/components/gamification/progression-shell';

export default function ProfileProgressionPage() {
  const searchParams = useSearchParams();
  const from = searchParams.get('from');

  const sourceContext =
    from === 'tasks' || from === 'proposals' || from === 'profile' ? from : null;

  return (
    <div className="mx-auto max-w-4xl px-4 py-6" data-testid="profile-progression-page">
      <ProgressionShell sourceContext={sourceContext} />
    </div>
  );
}
