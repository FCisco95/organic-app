'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { X, Plus, Trash2, AlertCircle } from 'lucide-react';
import { useManualDistribution } from '@/features/rewards';

interface DistributionRow {
  user_id: string;
  token_amount: string;
  category: 'bonus' | 'bounty' | 'correction';
  reason: string;
}

const EMPTY_ROW: DistributionRow = {
  user_id: '',
  token_amount: '',
  category: 'bonus',
  reason: '',
};

interface ManualDistributionModalProps {
  open: boolean;
  onClose: () => void;
}

export function ManualDistributionModal({ open, onClose }: ManualDistributionModalProps) {
  const t = useTranslations('Rewards');
  const manualDist = useManualDistribution();
  const [rows, setRows] = useState<DistributionRow[]>([{ ...EMPTY_ROW }]);

  if (!open) return null;

  const addRow = () => {
    setRows((prev) => [...prev, { ...EMPTY_ROW }]);
  };

  const removeRow = (index: number) => {
    setRows((prev) => prev.filter((_, i) => i !== index));
  };

  const updateRow = (index: number, field: keyof DistributionRow, value: string) => {
    setRows((prev) =>
      prev.map((row, i) => (i === index ? { ...row, [field]: value } : row))
    );
  };

  const isValid = rows.every(
    (r) => r.user_id.trim() && Number(r.token_amount) > 0 && r.reason.trim()
  );

  const handleSubmit = () => {
    if (!isValid) return;
    manualDist.mutate(
      {
        distributions: rows.map((r) => ({
          user_id: r.user_id.trim(),
          token_amount: Number(r.token_amount),
          category: r.category,
          reason: r.reason.trim(),
        })),
      },
      {
        onSuccess: () => {
          setRows([{ ...EMPTY_ROW }]);
          onClose();
        },
      }
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-xl border border-gray-200 shadow-xl w-full max-w-2xl mx-4 p-6 max-h-[80vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">{t('manualModal.title')}</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Rows */}
        <div className="space-y-4 mb-4">
          {rows.map((row, index) => (
            <div key={index} className="bg-gray-50 rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-gray-500">
                  {t('manualModal.recipientLabel', { num: index + 1 })}
                </span>
                {rows.length > 1 && (
                  <button
                    onClick={() => removeRow(index)}
                    className="text-gray-400 hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  type="text"
                  value={row.user_id}
                  onChange={(e) => updateRow(index, 'user_id', e.target.value)}
                  placeholder={t('manualModal.userIdPlaceholder')}
                  className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-organic-orange/30 focus:border-organic-orange font-mono"
                />
                <input
                  type="number"
                  value={row.token_amount}
                  onChange={(e) => updateRow(index, 'token_amount', e.target.value)}
                  placeholder={t('manualModal.tokenAmountPlaceholder')}
                  min="0"
                  step="0.001"
                  className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-organic-orange/30 focus:border-organic-orange"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <select
                  value={row.category}
                  onChange={(e) =>
                    updateRow(index, 'category', e.target.value)
                  }
                  className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-organic-orange/30 focus:border-organic-orange"
                >
                  <option value="bonus">{t('distributionCategory.bonus')}</option>
                  <option value="bounty">{t('distributionCategory.bounty')}</option>
                  <option value="correction">{t('distributionCategory.correction')}</option>
                </select>
                <input
                  type="text"
                  value={row.reason}
                  onChange={(e) => updateRow(index, 'reason', e.target.value)}
                  placeholder={t('manualModal.reasonPlaceholder')}
                  className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-organic-orange/30 focus:border-organic-orange"
                />
              </div>
            </div>
          ))}
        </div>

        {/* Add Row */}
        <button
          onClick={addRow}
          className="flex items-center gap-2 text-sm font-medium text-organic-orange hover:text-organic-orange/80 mb-4"
        >
          <Plus className="w-4 h-4" />
          {t('manualModal.addRecipient')}
        </button>

        {/* Error */}
        {manualDist.isError && (
          <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2 mb-4">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {manualDist.error.message}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 px-4 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            {t('manualModal.cancel')}
          </button>
          <button
            onClick={handleSubmit}
            disabled={!isValid || manualDist.isPending}
            className="flex-1 py-2.5 px-4 text-sm font-medium text-white bg-organic-orange hover:bg-organic-orange/90 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {manualDist.isPending ? t('manualModal.sending') : t('manualModal.submit')}
          </button>
        </div>
      </div>
    </div>
  );
}
