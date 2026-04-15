export interface PostTranslation {
  title: string;
  body: string;
  threadParts: { part_order: number; body: string }[] | null;
}

export interface TranslateResponse {
  data: PostTranslation;
  cached: boolean;
  sourceLocale: string;
}
