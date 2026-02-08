'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Plus, Trash2 } from 'lucide-react';
import { SettingsField, SettingsInput, SettingsSaveBar } from './settings-field';
import { useUpdateOrganization } from '@/features/settings';
import type { Organization, TreasuryAllocationConfig } from '@/features/settings';

interface TreasuryTabProps {
  org: Organization;
}

export function TreasuryTab({ org }: TreasuryTabProps) {
  const t = useTranslations('Settings');
  const updateOrg = useUpdateOrganization();

  const [wallet, setWallet] = useState(org.treasury_wallet ?? '');
  const [allocations, setAllocations] = useState<TreasuryAllocationConfig[]>(
    org.treasury_allocations
  );

  useEffect(() => {
    setWallet(org.treasury_wallet ?? '');
    setAllocations(org.treasury_allocations);
  }, [org]);

  const dirty =
    wallet !== (org.treasury_wallet ?? '') ||
    JSON.stringify(allocations) !== JSON.stringify(org.treasury_allocations);

  const totalPct = allocations.reduce((sum, a) => sum + a.percentage, 0);

  const handleAllocationChange = (
    index: number,
    field: keyof TreasuryAllocationConfig,
    value: string | number
  ) => {
    setAllocations((prev) => prev.map((a, i) => (i === index ? { ...a, [field]: value } : a)));
  };

  const addAllocation = () => {
    setAllocations((prev) => [...prev, { key: '', percentage: 0, color: '#6b7280' }]);
  };

  const removeAllocation = (index: number) => {
    setAllocations((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSave = () => {
    updateOrg.mutate({
      treasury_wallet: wallet || null,
      treasury_allocations: allocations,
    });
  };

  const handleReset = () => {
    setWallet(org.treasury_wallet ?? '');
    setAllocations(org.treasury_allocations);
  };

  return (
    <div>
      <h2 className="text-lg font-semibold text-gray-900 mb-1">{t('tabs.treasury')}</h2>
      <p className="text-sm text-gray-500 mb-6">{t('treasury.description')}</p>

      <SettingsField label={t('treasury.wallet')} description={t('treasury.walletDescription')}>
        <SettingsInput
          value={wallet}
          onChange={(e) => setWallet(e.target.value)}
          placeholder="Solana wallet address"
          className="font-mono text-xs"
        />
      </SettingsField>

      <div className="py-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <label className="text-sm font-medium text-gray-900">{t('treasury.allocations')}</label>
            <p className="text-xs text-gray-500 mt-0.5">
              {t('treasury.allocationsDescription')}
              <span
                className={`ml-2 font-medium ${totalPct === 100 ? 'text-green-600' : 'text-red-500'}`}
              >
                ({totalPct}%)
              </span>
            </p>
          </div>
          <button
            onClick={addAllocation}
            className="inline-flex items-center gap-1 text-sm text-organic-orange hover:text-organic-orange/80"
          >
            <Plus className="w-4 h-4" /> {t('treasury.addCategory')}
          </button>
        </div>

        <div className="space-y-2">
          {allocations.map((alloc, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                type="color"
                value={alloc.color}
                onChange={(e) => handleAllocationChange(i, 'color', e.target.value)}
                className="w-8 h-8 rounded border border-gray-200 cursor-pointer"
              />
              <SettingsInput
                value={alloc.key}
                onChange={(e) => handleAllocationChange(i, 'key', e.target.value)}
                placeholder={t('treasury.categoryName')}
                className="flex-1"
              />
              <SettingsInput
                type="number"
                value={String(alloc.percentage)}
                onChange={(e) => handleAllocationChange(i, 'percentage', Number(e.target.value))}
                min={0}
                max={100}
                className="w-20"
              />
              <span className="text-sm text-gray-500">%</span>
              <button
                onClick={() => removeAllocation(i)}
                className="p-1.5 text-gray-400 hover:text-red-500"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </div>

      <SettingsSaveBar
        dirty={dirty}
        saving={updateOrg.isPending}
        onSave={handleSave}
        onReset={handleReset}
        saveLabel={t('save')}
      />
    </div>
  );
}
