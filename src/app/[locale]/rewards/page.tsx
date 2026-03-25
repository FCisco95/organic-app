import { permanentRedirect } from 'next/navigation';

export default function RewardsRedirect() {
  permanentRedirect('/earn?tab=rewards');
}
