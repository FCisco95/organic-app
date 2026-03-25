'use client';

import { useRouter } from '@/i18n/navigation';
import { useAuth } from '@/features/auth/context';

export default function EarnPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  if (!loading && !user) {
    router.push('/login?returnTo=/earn');
    return null;
  }

  return <div>Earn page placeholder — will be replaced in Task 6</div>;
}
