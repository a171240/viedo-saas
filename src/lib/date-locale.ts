import { enUS, zhCN } from "date-fns/locale";

export function getDateFnsLocale(locale: string) {
  return locale.startsWith("zh") ? zhCN : enUS;
}
