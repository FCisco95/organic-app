import { permanentRedirect } from 'next/navigation';

export default function TreasuryRedirect() {
  permanentRedirect('/vault');
}
