import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getEggElement } from '@/features/easter/elements';

// Always use production domain for OG images — Twitter crawls these URLs
const APP_URL = 'https://organichub.fun';

interface ShareEggPageProps {
  params: Promise<{ locale: string; number: string }>;
}

export async function generateMetadata({ params }: ShareEggPageProps): Promise<Metadata> {
  const { number } = await params;
  const num = parseInt(number, 10);
  const element = getEggElement(num);
  const elementName = element
    ? element.element.charAt(0).toUpperCase() + element.element.slice(1)
    : 'Golden';
  const emoji = element?.emoji ?? '🥚';

  return {
    title: `${emoji} Rare ${elementName} Egg Found — Organic`,
    description:
      'Only 10 Golden Eggs exist in Organic. Each one is unique. Can you find them all?',
    openGraph: {
      title: `${emoji} I found a rare ${elementName} Egg!`,
      description:
        'Only 10 Golden Eggs exist in Organic. Each one is unique. Can you find them all?',
      images: [{ url: `${APP_URL}/og/golden-egg-share.jpg`, width: 1200, height: 630 }],
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: `Rare ${elementName} Egg Found!`,
      description: 'Only 10 Golden Eggs exist in Organic. Each one is unique.',
      images: [`${APP_URL}/og/golden-egg-share.jpg`],
    },
  };
}

export default async function ShareEggPage({ params }: ShareEggPageProps) {
  const { locale } = await params;
  redirect(`/${locale}`);
}
