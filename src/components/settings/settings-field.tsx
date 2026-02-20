'use client';

import { useEffect, useState } from 'react';

interface SettingsFieldProps {
  label: string;
  description?: string;
  children: React.ReactNode;
}

export function SettingsField({ label, description, children }: SettingsFieldProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4 py-4 border-b border-gray-100 last:border-0">
      <div>
        <label className="text-sm font-medium text-gray-900">{label}</label>
        {description && <p className="text-xs text-gray-500 mt-0.5">{description}</p>}
      </div>
      <div className="sm:col-span-2">{children}</div>
    </div>
  );
}

interface SettingsInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  // extends native input
}

export function SettingsInput(props: SettingsInputProps) {
  return (
    <input
      {...props}
      className={`w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-organic-orange/30 focus:border-organic-orange disabled:bg-gray-50 disabled:text-gray-400 ${props.className ?? ''}`}
    />
  );
}

interface SettingsSaveBarProps {
  dirty: boolean;
  saving: boolean;
  onSave: (reason: string) => void;
  onReset: () => void;
  saveLabel?: string;
  resetLabel?: string;
  savingLabel?: string;
  reasonLabel?: string;
  reasonPlaceholder?: string;
  reasonHelp?: string;
}

export function SettingsSaveBar({
  dirty,
  saving,
  onSave,
  onReset,
  saveLabel = 'Save',
  resetLabel = 'Reset',
  savingLabel = 'Saving...',
  reasonLabel = 'Change reason',
  reasonPlaceholder = 'Why are you changing this setting?',
  reasonHelp = 'A reason is required for all settings updates.',
}: SettingsSaveBarProps) {
  const [reason, setReason] = useState('');
  const trimmedReason = reason.trim();
  const canSave = trimmedReason.length >= 8;

  useEffect(() => {
    if (!dirty) {
      setReason('');
    }
  }, [dirty]);

  if (!dirty) return null;

  return (
    <div className="mt-6 pt-4 border-t border-gray-200 space-y-3">
      <div>
        <label className="text-sm font-medium text-gray-900">{reasonLabel}</label>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder={reasonPlaceholder}
          maxLength={500}
          rows={2}
          data-testid="settings-change-reason"
          className="mt-1 w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-organic-orange/30 focus:border-organic-orange resize-none"
        />
        <p className={`mt-1 text-xs ${canSave ? 'text-gray-500' : 'text-red-500'}`}>{reasonHelp}</p>
      </div>

      <div className="flex items-center justify-end gap-3">
        <button
          onClick={() => {
            onReset();
            setReason('');
          }}
          disabled={saving}
          className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 disabled:opacity-50"
        >
          {resetLabel}
        </button>
        <button
          onClick={() => onSave(trimmedReason)}
          disabled={saving || !canSave}
          data-testid="settings-save-button"
          className="px-4 py-2 text-sm font-medium text-white bg-organic-orange hover:bg-organic-orange/90 rounded-lg disabled:opacity-50"
        >
          {saving ? savingLabel : saveLabel}
        </button>
      </div>
    </div>
  );
}
