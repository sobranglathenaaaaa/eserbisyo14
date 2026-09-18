export type UIStatusTone = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

export type UIDensity = 'compact' | 'comfortable';

export type UIActionPriority = 'primary' | 'secondary' | 'destructive';

export interface UIEmptyState {
  title: {
    en: string;
    fil: string;
  };
  description: {
    en: string;
    fil: string;
  };
}
