'use client';

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
  onSave: () => void;
  onReset: () => void;
  saveLabel?: string;
}

export function SettingsSaveBar({
  dirty,
  saving,
  onSave,
  onReset,
  saveLabel = 'Save',
}: SettingsSaveBarProps) {
  if (!dirty) return null;

  return (
    <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-gray-200">
      <button
        onClick={onReset}
        disabled={saving}
        className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 disabled:opacity-50"
      >
        Reset
      </button>
      <button
        onClick={onSave}
        disabled={saving}
        className="px-4 py-2 text-sm font-medium text-white bg-organic-orange hover:bg-organic-orange/90 rounded-lg disabled:opacity-50"
      >
        {saving ? 'Saving...' : saveLabel}
      </button>
    </div>
  );
}
