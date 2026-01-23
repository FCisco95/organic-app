import { redirect } from '@/i18n/navigation';

export default function PastSprintsRedirect() {
  redirect('/sprints?view=list');
}
