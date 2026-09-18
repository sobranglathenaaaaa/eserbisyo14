import { residentNavigation } from '@/features/resident/model/navigation';

export type ChatNavigationTarget = {
  labelEn: string;
  labelFil: string;
  route: string;
  aliases: string[];
};

const RESIDENT_CHAT_ROUTE_ALIASES: Record<string, string[]> = {
  '/resident/dashboard': ['home', 'simula', 'dashboard', 'resident dashboard'],
  '/resident/document-requests': [
    'get documents',
    'document requests',
    'documents',
    'barangay clearance',
    'certificate',
  ],
  '/resident/notifications': ['updates', 'notifications', 'alerts', 'abiso'],
  '/resident/medicines': ['appointment', 'book appointment', 'check-up', 'doctor schedule', 'medical checkup'],
  '/resident/blotter-reporting': ['report an incident', 'incident', 'blotter', 'blotter reporting'],
  '/resident/request-history': ['past requests', 'request history', 'history', 'nakaraang kahilingan'],
  '/resident/my-profile': ['my profile', 'profile', 'aking profile'],
  '/resident/census': ['household', 'census', 'household and census'],
  '/resident/chatbot': ['assistant', 'ai assistant', 'chatbot', 'service assistant'],
};

const CHAT_ROUTE_ALLOWLIST = new Set(Object.keys(RESIDENT_CHAT_ROUTE_ALIASES));

export const residentChatNavigationTargets: ChatNavigationTarget[] = residentNavigation
  .filter((item) => CHAT_ROUTE_ALLOWLIST.has(item.href))
  .map((item) => ({
    labelEn: item.label.en,
    labelFil: item.label.fil,
    route: item.href,
    aliases: RESIDENT_CHAT_ROUTE_ALIASES[item.href] ?? [],
  }));
