'use client';

import { useTranslations } from 'next-intl';
import { Settings, Coins, Wallet, Vote, Zap, Users } from 'lucide-react';
import type { SettingsTab } from '@/features/settings';

const ICON_MAP: Record<string, typeof Settings> = {
  Settings,
  Coins,
  Wallet,
  Vote,
  Zap,
  Users,
};

const TABS: { key: SettingsTab; icon: string }[] = [
  { key: 'general', icon: 'Settings' },
  { key: 'token', icon: 'Coins' },
  { key: 'treasury', icon: 'Wallet' },
  { key: 'governance', icon: 'Vote' },
  { key: 'sprints', icon: 'Zap' },
  { key: 'members', icon: 'Users' },
];

interface SettingsTabsProps {
  activeTab: SettingsTab;
  onTabChange: (tab: SettingsTab) => void;
}

export function SettingsTabs({ activeTab, onTabChange }: SettingsTabsProps) {
  const t = useTranslations('Settings');

  return (
    <>
      {/* Desktop vertical tabs */}
      <nav className="hidden md:flex flex-col gap-1 min-w-[180px]">
        {TABS.map(({ key, icon }) => {
          const Icon = ICON_MAP[icon];
          const isActive = activeTab === key;
          return (
            <button
              key={key}
              onClick={() => onTabChange(key)}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors text-left ${
                isActive
                  ? 'bg-organic-orange/10 text-organic-orange'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              }`}
            >
              <Icon className="w-4 h-4" />
              {t(`tabs.${key}`)}
            </button>
          );
        })}
      </nav>

      {/* Mobile horizontal scroll */}
      <div className="flex md:hidden gap-1.5 overflow-x-auto pb-2 -mx-1 px-1">
        {TABS.map(({ key, icon }) => {
          const Icon = ICON_MAP[icon];
          const isActive = activeTab === key;
          return (
            <button
              key={key}
              onClick={() => onTabChange(key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                isActive
                  ? 'bg-organic-orange text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {t(`tabs.${key}`)}
            </button>
          );
        })}
      </div>
    </>
  );
}
