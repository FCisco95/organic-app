'use client';

import { useEffect } from 'react';
import { useRouter } from '@/i18n/navigation';
import { useSearchParams } from 'next/navigation';

export default function JoinPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const ref = searchParams.get('ref');

  useEffect(() => {
    const target = ref ? `/signup?ref=${encodeURIComponent(ref)}` : '/signup';
    router.replace(target);
  }, [ref, router]);

  return null;
}
