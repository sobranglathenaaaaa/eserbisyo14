import type { Locale } from '@/lib/types/models';

export interface LocalizedCopy {
  en: string;
  fil: string;
}

export function copy(locale: Locale, value: string | LocalizedCopy) {
  if (typeof value === 'string') {
    return value;
  }

  return locale === 'fil' ? value.fil : value.en;
}

export function copyText(locale: Locale, en: string, fil: string) {
  return locale === 'fil' ? fil : en;
}
