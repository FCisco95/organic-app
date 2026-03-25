import { permanentRedirect } from 'next/navigation';

export default function QuestsRedirect() {
  permanentRedirect('/earn?tab=quests');
}
