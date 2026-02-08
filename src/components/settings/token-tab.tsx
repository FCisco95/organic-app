'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { SettingsField, SettingsInput, SettingsSaveBar } from './settings-field';
import { useUpdateOrganization } from '@/features/settings';
import type { Organization } from '@/features/settings';

interface TokenTabProps {
  org: Organization;
}

export function TokenTab({ org }: TokenTabProps) {
  const t = useTranslations('Settings');
  const updateOrg = useUpdateOrganization();

  const [tokenSymbol, setTokenSymbol] = useState(org.token_symbol);
  const [tokenMint, setTokenMint] = useState(org.token_mint ?? '');
  const [tokenDecimals, setTokenDecimals] = useState(String(org.token_decimals));
  const [tokenTotalSupply, setTokenTotalSupply] = useState(String(org.token_total_supply));

  useEffect(() => {
    setTokenSymbol(org.token_symbol);
    setTokenMint(org.token_mint ?? '');
    setTokenDecimals(String(org.token_decimals));
    setTokenTotalSupply(String(org.token_total_supply));
  }, [org]);

  const dirty =
    tokenSymbol !== org.token_symbol ||
    tokenMint !== (org.token_mint ?? '') ||
    tokenDecimals !== String(org.token_decimals) ||
    tokenTotalSupply !== String(org.token_total_supply);

  const handleSave = () => {
    updateOrg.mutate({
      token_symbol: tokenSymbol,
      token_mint: tokenMint || null,
      token_decimals: Number(tokenDecimals),
      token_total_supply: Number(tokenTotalSupply),
    });
  };

  const handleReset = () => {
    setTokenSymbol(org.token_symbol);
    setTokenMint(org.token_mint ?? '');
    setTokenDecimals(String(org.token_decimals));
    setTokenTotalSupply(String(org.token_total_supply));
  };

  return (
    <div>
      <h2 className="text-lg font-semibold text-gray-900 mb-1">{t('tabs.token')}</h2>
      <p className="text-sm text-gray-500 mb-6">{t('token.description')}</p>

      <SettingsField label={t('token.symbol')} description={t('token.symbolDescription')}>
        <SettingsInput
          value={tokenSymbol}
          onChange={(e) => setTokenSymbol(e.target.value)}
          maxLength={20}
        />
      </SettingsField>

      <SettingsField label={t('token.mint')} description={t('token.mintDescription')}>
        <SettingsInput
          value={tokenMint}
          onChange={(e) => setTokenMint(e.target.value)}
          placeholder="e.g. So11...1112"
          className="font-mono text-xs"
        />
      </SettingsField>

      <SettingsField label={t('token.decimals')}>
        <SettingsInput
          type="number"
          value={tokenDecimals}
          onChange={(e) => setTokenDecimals(e.target.value)}
          min={0}
          max={18}
        />
      </SettingsField>

      <SettingsField label={t('token.totalSupply')}>
        <SettingsInput
          type="number"
          value={tokenTotalSupply}
          onChange={(e) => setTokenTotalSupply(e.target.value)}
          min={1}
        />
      </SettingsField>

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
