import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  DEFAULT_TRANSLATION_SETTINGS,
  translationSettingsSchema,
  type TranslationSettings,
} from '@/features/settings/schemas';
import { logger } from '@/lib/logger';

export interface PublicFlagsResponse {
  translation_settings: TranslationSettings;
}

// Public read-only endpoint so the client can gate translate UI without
// requiring admin auth. Never return anything other than the flags the
// UI explicitly needs — the admin PATCH path at /api/settings stays gated.
export async function GET() {
  try {
    const supabase = await createClient();

    const { data: org, error } = await supabase
      .from('orgs')
      .select('translation_settings')
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle();

    if (error || !org) {
      // Fall back to defaults rather than 500ing the client. Missing row
      // is an install-time state, not a runtime failure.
      return NextResponse.json<PublicFlagsResponse>({
        translation_settings: DEFAULT_TRANSLATION_SETTINGS,
      });
    }

    const parsed = translationSettingsSchema.safeParse(
      (org as { translation_settings: unknown }).translation_settings
    );
    const translation_settings = parsed.success
      ? parsed.data
      : DEFAULT_TRANSLATION_SETTINGS;

    return NextResponse.json<PublicFlagsResponse>({ translation_settings });
  } catch (err) {
    logger.error('Public flags GET error:', err);
    return NextResponse.json<PublicFlagsResponse>({
      translation_settings: DEFAULT_TRANSLATION_SETTINGS,
    });
  }
}
