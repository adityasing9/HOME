export type AccentColor = 'blue' | 'purple' | 'green' | 'orange' | 'red' | 'pink';

export type ThemeMode = 'light' | 'dark' | 'system';

export type BackgroundPreset = 'default' | 'midnight' | 'aurora' | 'sunset' | 'minimal' | 'custom';

export type AppSize = 'compact' | 'standard' | 'spacious';

export type SortOption = 'name-asc' | 'name-desc' | 'recently-opened' | 'recently-added' | 'most-used';

export type DefaultCategory =
  | 'AI'
  | 'Education'
  | 'Development'
  | 'Productivity'
  | 'Utilities'
  | 'Finance'
  | 'Entertainment'
  | 'Games'
  | 'Projects'
  | 'Other';

export const CATEGORIES: DefaultCategory[] = [
  'AI',
  'Education',
  'Development',
  'Productivity',
  'Utilities',
  'Finance',
  'Entertainment',
  'Games',
  'Projects',
  'Other',
];

export interface AppItem {
  id: string;
  name: string;
  description: string;
  url: string;
  icon?: string;
  iconType?: 'letter' | 'emoji' | 'url' | 'image';
  category: DefaultCategory | string;
  tags: string[];
  pinned: boolean;
  pinOrder: number;
  favorite: boolean;
  createdAt: number;
  lastOpenedAt: number | null;
  launchCount: number;
}

export type PinnedSortOption =
  | 'newest'
  | 'custom'
  | 'name-asc'
  | 'name-desc'
  | 'most-used'
  | 'recently-opened';

export interface UserSettings {
  theme: ThemeMode;
  accentColor: AccentColor;
  background: BackgroundPreset;
  customWallpaper: string | null;
  appSize: AppSize;
  animations: boolean;
  defaultSort: SortOption;
  pinnedSort: PinnedSortOption;
  defaultCategory: string;
  openInNewTab: boolean;
  searchDescriptions: boolean;
  searchCategories: boolean;
  userName: string;
  hasCompletedWelcome: boolean;
}

export interface HomeBackupData {
  version: number;
  exportedAt: string;
  apps: AppItem[];
  settings: UserSettings;
}
