// scripts/backfill-post-language.ts
//
// One-time script to detect language on existing posts.
// Run: npx tsx scripts/backfill-post-language.ts
//
// Safe to re-run — only updates posts where detected_language IS NULL.

import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { detectLanguage } from '../src/lib/translation/detect-language';

config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function backfill() {
  const { data: posts, error } = await supabase
    .from('posts')
    .select('id, title, body')
    .is('detected_language', null)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Failed to fetch posts:', error.message);
    process.exit(1);
  }

  console.log(`Found ${posts.length} posts without detected_language`);

  let updated = 0;
  for (const post of posts) {
    const lang = detectLanguage(`${post.title} ${post.body}`);
    if (lang) {
      const { error: updateError } = await supabase
        .from('posts')
        .update({ detected_language: lang })
        .eq('id', post.id);

      if (updateError) {
        console.error(`Failed to update post ${post.id}:`, updateError.message);
      } else {
        updated++;
      }
    }
  }

  console.log(`Backfilled ${updated}/${posts.length} posts`);
}

backfill().catch(console.error);
