import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  translateContentWithRuntime,
  type TranslationRuntime,
  type TranslationServiceClient,
} from '../translate-content.js';
import type { TranslationProvider, TranslationRequest } from '../types.js';

// ── Fakes ─────────────────────────────────────────────────────────────────

interface CacheRow {
  content_type: string;
  content_id: string;
  field_name: string;
  translated_text: string;
  source_locale: string;
  target_locale: string;
  provider_chars_used?: number;
}

function makeFakeServiceClient(seed: CacheRow[] = []): {
  client: TranslationServiceClient;
  calls: { select: unknown[]; upserts: unknown[][] };
} {
  const store: CacheRow[] = [...seed];
  const calls = { select: [] as unknown[], upserts: [] as unknown[][] };

  const client: TranslationServiceClient = {
    from() {
      const pred: Record<string, unknown> = {};
      const api = {
        select: () => ({
          eq: (c: string, v: unknown) => {
            pred[c] = v;
            return {
              eq: (c2: string, v2: unknown) => {
                pred[c2] = v2;
                return {
                  eq: (c3: string, v3: unknown) => {
                    pred[c3] = v3;
                    return {
                      in: async (_c4: string, fieldNames: unknown[]) => {
                        calls.select.push({ ...pred, fieldNames });
                        const data = store.filter(
                          (r) =>
                            r.content_type === pred.content_type &&
                            r.content_id === pred.content_id &&
                            r.target_locale === pred.target_locale &&
                            (fieldNames as string[]).includes(r.field_name)
                        );
                        return { data };
                      },
                    };
                  },
                };
              },
            };
          },
        }),
        upsert: async (rows: unknown[]) => {
          calls.upserts.push(rows);
          store.push(...(rows as CacheRow[]));
          return { error: null };
        },
      };
      return api as ReturnType<TranslationServiceClient['from']>;
    },
  };

  return { client, calls };
}

function makeFakeProvider(
  translate: (req: TranslationRequest) => Promise<{
    translations: { text: string; detectedSourceLanguage: string }[];
  }>
): { provider: TranslationProvider; calls: TranslationRequest[] } {
  const calls: TranslationRequest[] = [];
  const provider: TranslationProvider = {
    name: 'fake',
    async translate(req) {
      calls.push(req);
      return translate(req);
    },
    async detectLanguage() {
      return 'en';
    },
  };
  return { provider, calls };
}

function makeRuntime(
  seed: CacheRow[] = [],
  translateFn = async (req: TranslationRequest) => ({
    translations: req.text.map((t) => ({
      text: `[${req.targetLocale}] ${t}`,
      detectedSourceLanguage: 'EN',
    })),
  })
) {
  const { client, calls: cacheCalls } = makeFakeServiceClient(seed);
  const { provider, calls: providerCalls } = makeFakeProvider(translateFn);
  const runtime: TranslationRuntime = { serviceClient: client, provider };
  return { runtime, cacheCalls, providerCalls };
}

// ── Tests ─────────────────────────────────────────────────────────────────

describe('translateContentWithRuntime', () => {
  it('short-circuits on empty fields without touching provider or cache', async () => {
    const { runtime, cacheCalls, providerCalls } = makeRuntime();

    const result = await translateContentWithRuntime(runtime, {
      contentType: 'post',
      contentId: 'post-1',
      fields: [],
      sourceLocale: 'en',
      targetLocale: 'pt-PT',
    });

    assert.deepEqual(result.translations, {});
    assert.equal(result.cached, true);
    assert.equal(result.providerCharsUsed, 0);
    assert.equal(cacheCalls.select.length, 0);
    assert.equal(providerCalls.length, 0);
  });

  it('short-circuits when source locale equals target locale', async () => {
    const { runtime, cacheCalls, providerCalls } = makeRuntime();

    const result = await translateContentWithRuntime(runtime, {
      contentType: 'proposal',
      contentId: 'prop-1',
      fields: [
        { name: 'title', text: 'Hello' },
        { name: 'body', text: 'World' },
      ],
      sourceLocale: 'en',
      targetLocale: 'en',
    });

    assert.deepEqual(result.translations, { title: 'Hello', body: 'World' });
    assert.equal(result.cached, true);
    assert.equal(result.sourceLocale, 'en');
    assert.equal(result.providerCharsUsed, 0);
    assert.equal(cacheCalls.select.length, 0);
    assert.equal(providerCalls.length, 0);
  });

  it('returns full cache hit with providerCharsUsed=0 when every field is cached', async () => {
    const seed: CacheRow[] = [
      {
        content_type: 'idea',
        content_id: 'idea-1',
        field_name: 'title',
        translated_text: 'Título traduzido',
        source_locale: 'en',
        target_locale: 'pt-PT',
      },
      {
        content_type: 'idea',
        content_id: 'idea-1',
        field_name: 'body',
        translated_text: 'Corpo traduzido',
        source_locale: 'en',
        target_locale: 'pt-PT',
      },
    ];
    const { runtime, providerCalls } = makeRuntime(seed);

    const result = await translateContentWithRuntime(runtime, {
      contentType: 'idea',
      contentId: 'idea-1',
      fields: [
        { name: 'title', text: 'Title' },
        { name: 'body', text: 'Body' },
      ],
      sourceLocale: 'en',
      targetLocale: 'pt-PT',
    });

    assert.equal(result.cached, true);
    assert.equal(result.providerCharsUsed, 0);
    assert.equal(providerCalls.length, 0);
    assert.equal(result.translations.title, 'Título traduzido');
    assert.equal(result.translations.body, 'Corpo traduzido');
    assert.equal(result.sourceLocale, 'en');
  });

  it('calls provider only for uncached fields on partial cache hit', async () => {
    const seed: CacheRow[] = [
      {
        content_type: 'proposal',
        content_id: 'prop-2',
        field_name: 'title',
        translated_text: 'Titre',
        source_locale: 'en',
        target_locale: 'pt-PT',
      },
    ];
    const { runtime, providerCalls, cacheCalls } = makeRuntime(seed);

    const result = await translateContentWithRuntime(runtime, {
      contentType: 'proposal',
      contentId: 'prop-2',
      fields: [
        { name: 'title', text: 'Title' },
        { name: 'body', text: 'Body text' },
        { name: 'summary', text: 'Summary text here' },
      ],
      sourceLocale: 'en',
      targetLocale: 'pt-PT',
    });

    assert.equal(providerCalls.length, 1);
    assert.deepEqual(providerCalls[0].text, ['Body text', 'Summary text here']);

    assert.equal(result.cached, false);
    // Only uncached fields count toward char accounting.
    assert.equal(result.providerCharsUsed, 'Body text'.length + 'Summary text here'.length);
    assert.equal(result.translations.title, 'Titre');
    assert.equal(result.translations.body, '[pt-PT] Body text');
    assert.equal(result.translations.summary, '[pt-PT] Summary text here');

    // Upsert happened for the two new rows with per-field char counts.
    const lastUpsert = cacheCalls.upserts.at(-1);
    assert.ok(lastUpsert);
    assert.equal(lastUpsert!.length, 2);
    const bodyRow = lastUpsert!.find(
      (r) => (r as { field_name: string }).field_name === 'body'
    ) as { provider_chars_used: number } | undefined;
    assert.ok(bodyRow);
    assert.equal(bodyRow!.provider_chars_used, 'Body text'.length);
  });

  it('resolves detected source locale from DeepL response when sourceLocale is null', async () => {
    const { runtime } = makeRuntime([], async (req) => ({
      translations: req.text.map((t) => ({
        text: `[${req.targetLocale}] ${t}`,
        detectedSourceLanguage: 'PT',
      })),
    }));

    const result = await translateContentWithRuntime(runtime, {
      contentType: 'comment',
      contentId: 'c-1',
      fields: [{ name: 'body', text: 'Olá' }],
      sourceLocale: null,
      targetLocale: 'en',
    });

    assert.equal(result.sourceLocale, 'pt-PT');
    assert.equal(result.providerCharsUsed, 'Olá'.length);
  });

  it('bubbles up provider errors', async () => {
    const { runtime } = makeRuntime([], async () => {
      throw new Error('deepl 429');
    });

    await assert.rejects(
      translateContentWithRuntime(runtime, {
        contentType: 'post',
        contentId: 'p-1',
        fields: [{ name: 'title', text: 'Hi' }],
        sourceLocale: 'en',
        targetLocale: 'pt-PT',
      }),
      /deepl 429/
    );
  });
});
