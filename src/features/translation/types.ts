export interface PostTranslation {
  title: string;
  body: string;
  threadParts: { part_order: number; body: string }[] | null;
}

export interface TranslateResponse {
  data: Record<string, string>;
  cached: boolean;
  sourceLocale: string;
}
