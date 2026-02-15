'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { useRespondToDispute } from '@/features/disputes/hooks';
import { Plus, X, Loader2 } from 'lucide-react';

interface RespondPanelProps {
  disputeId: string;
  onSuccess?: () => void;
}

export function RespondPanel({ disputeId, onSuccess }: RespondPanelProps) {
  const tf = useTranslations('Disputes.form');
  const respond = useRespondToDispute();

  const [responseText, setResponseText] = useState('');
  const [responseLinks, setResponseLinks] = useState<string[]>([]);
  const [newLink, setNewLink] = useState('');

  const handleAddLink = () => {
    if (newLink.trim()) {
      setResponseLinks((prev) => [...prev, newLink.trim()]);
      setNewLink('');
    }
  };

  const handleSubmit = async () => {
    if (responseText.length < 20) return;

    try {
      await respond.mutateAsync({
        disputeId,
        input: {
          response_text: responseText,
          response_links: responseLinks,
        },
      });
      onSuccess?.();
    } catch {
      // Error handled by mutation
    }
  };

  return (
    <div className="rounded-lg border border-gray-200 p-5 space-y-4">
      <h3 className="text-sm font-semibold text-gray-900">{tf('response')}</h3>

      <textarea
        value={responseText}
        onChange={(e) => setResponseText(e.target.value)}
        placeholder={tf('responsePlaceholder')}
        rows={4}
        maxLength={5000}
        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm resize-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
      />
      <p className="text-xs text-gray-400">{responseText.length}/5000</p>

      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">
          {tf('responseLinks')}
        </label>
        <div className="flex gap-2">
          <input
            value={newLink}
            onChange={(e) => setNewLink(e.target.value)}
            placeholder="https://..."
            className="flex-1 rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
          />
          <Button variant="outline" size="sm" onClick={handleAddLink} disabled={!newLink.trim()}>
            <Plus className="w-4 h-4" />
          </Button>
        </div>
        {responseLinks.length > 0 && (
          <ul className="mt-2 space-y-1">
            {responseLinks.map((link, i) => (
              <li key={i} className="flex items-center gap-2 text-xs text-gray-600">
                <span className="truncate flex-1">{link}</span>
                <button
                  onClick={() => setResponseLinks((prev) => prev.filter((_, idx) => idx !== i))}
                  className="text-gray-400 hover:text-red-500"
                >
                  <X className="w-3 h-3" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <Button
        onClick={handleSubmit}
        disabled={responseText.length < 20 || respond.isPending}
        className="bg-orange-600 hover:bg-orange-700 text-white"
      >
        {respond.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
        Submit Response
      </Button>

      {respond.isError && (
        <p className="text-sm text-red-600">{respond.error.message}</p>
      )}
    </div>
  );
}
