export interface EggElement {
  number: number;
  element: string;
  emoji: string;
  colorFrom: string;
  colorTo: string;
  colorAccent: string;
  rarityModifier: number;
  image: string;
}

export const EGG_ELEMENTS: EggElement[] = [
  { number: 1, element: 'fire', emoji: '🔥', colorFrom: '#ef4444', colorTo: '#f97316', colorAccent: '#fbbf24', rarityModifier: 1.0, image: '/eggs/fire-egg.png' },
  { number: 2, element: 'water', emoji: '🌊', colorFrom: '#3b82f6', colorTo: '#06b6d4', colorAccent: '#ffffff', rarityModifier: 1.0, image: '/eggs/water-egg.png' },
  { number: 3, element: 'grass', emoji: '🌿', colorFrom: '#22c55e', colorTo: '#84cc16', colorAccent: '#a3e635', rarityModifier: 1.0, image: '/eggs/grass-egg.png' },
  { number: 4, element: 'lightning', emoji: '⚡', colorFrom: '#eab308', colorTo: '#a855f7', colorAccent: '#ffffff', rarityModifier: 0.8, image: '/eggs/lightning-egg.png' },
  { number: 5, element: 'earth', emoji: '🪨', colorFrom: '#92400e', colorTo: '#78716c', colorAccent: '#d97706', rarityModifier: 1.0, image: '/eggs/earth-egg.png' },
  { number: 6, element: 'wind', emoji: '💨', colorFrom: '#06b6d4', colorTo: '#c0c0c0', colorAccent: '#ffffff', rarityModifier: 1.0, image: '/eggs/wind-egg.png' },
  { number: 7, element: 'ice', emoji: '🧊', colorFrom: '#93c5fd', colorTo: '#ffffff', colorAccent: '#bfdbfe', rarityModifier: 0.8, image: '/eggs/ice-egg.png' },
  { number: 8, element: 'shadow', emoji: '🌑', colorFrom: '#7c3aed', colorTo: '#1e1b4b', colorAccent: '#a78bfa', rarityModifier: 0.5, image: '/eggs/shadow-egg.png' },
  { number: 9, element: 'light', emoji: '☀️', colorFrom: '#fbbf24', colorTo: '#ffffff', colorAccent: '#fef3c7', rarityModifier: 0.5, image: '/eggs/light-egg.png' },
  { number: 10, element: 'cosmic', emoji: '🌌', colorFrom: '#818cf8', colorTo: '#f472b6', colorAccent: '#fbbf24', rarityModifier: 0.3, image: '/eggs/cosmic-egg.png' },
];

export function getEggElement(number: number): EggElement | undefined {
  return EGG_ELEMENTS.find((e) => e.number === number);
}

export function getRarityLabel(modifier: number): string {
  if (modifier <= 0.3) return 'Ultra Rare';
  if (modifier <= 0.5) return 'Rare';
  if (modifier <= 0.8) return 'Uncommon';
  return 'Standard';
}
