import { permanentRedirect } from 'next/navigation';

export default async function MemberProfileRedirect({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  permanentRedirect(`/${locale}/community/${id}`);
}
