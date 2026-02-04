import { redirect } from '@/i18n/navigation';

export default function PastSprintsRedirect({ params }: { params: { locale: string } }) {
  redirect({ href: '/sprints?view=timeline', locale: params.locale });
}
