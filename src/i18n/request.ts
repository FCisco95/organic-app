import {getRequestConfig} from "next-intl/server";

const supported = ["en", "pt-PT", "zh-CN"] as const;
type SupportedLocale = (typeof supported)[number];

export default getRequestConfig(async ({requestLocale}) => {
  const locale = await requestLocale;
  const resolved = (supported.includes(locale as SupportedLocale) ? locale : "en") as SupportedLocale;

  return {
    locale: resolved,
    messages: (await import(`../../messages/${resolved}.json`)).default
  };
});
