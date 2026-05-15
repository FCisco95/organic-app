import { redirect } from '@/i18n/navigation';

export default async function PastSprintsRedirect(props: { params: Promise<{ locale: string }> }) {
  const params = await props.params;
  redirect({ href: '/sprints?view=timeline', locale: params.locale });
}
