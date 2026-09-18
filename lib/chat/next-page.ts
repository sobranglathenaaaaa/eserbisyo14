import { residentChatNavigationTargets } from '@/lib/chat/navigation-targets';

export type ChatLocaleHint = 'en' | 'fil';

export function fallbackContinueHere(localeHint: ChatLocaleHint): string {
  return localeHint === 'fil' ? 'Simula (/resident/dashboard)' : 'Home (/resident/dashboard)';
}

export function normalizeNextPageForChat(rawNextPage: string, localeHint: ChatLocaleHint): string {
  const nextPage = rawNextPage.replace(/\s+/g, ' ').trim();
  if (!nextPage) {
    return fallbackContinueHere(localeHint);
  }

  const lower = nextPage.toLowerCase();
  const matchedTarget = residentChatNavigationTargets.find((target) =>
    target.aliases.some((alias) => lower.includes(alias)) || lower.includes(target.route.toLowerCase())
  );

  if (!matchedTarget) {
    return fallbackContinueHere(localeHint);
  }

  const label = localeHint === 'fil' ? matchedTarget.labelFil : matchedTarget.labelEn;
  return `${label} (${matchedTarget.route})`;
}
