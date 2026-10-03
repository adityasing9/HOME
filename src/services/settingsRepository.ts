import type { UserSettings } from '../types';
import { DEFAULT_SETTINGS } from '../data/defaultApps';

const SETTINGS_KEY = 'HOME_SETTINGS_V1';

export class SettingsRepository {
  static getSettings(): UserSettings {
    try {
      const raw = localStorage.getItem(SETTINGS_KEY);
      if (!raw) {
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(DEFAULT_SETTINGS));
        return DEFAULT_SETTINGS;
      }
      const parsed = JSON.parse(raw);
      return { ...DEFAULT_SETTINGS, ...parsed };
    } catch (e) {
      console.error('Failed to read settings from localStorage:', e);
      return DEFAULT_SETTINGS;
    }
  }

  static saveSettings(updates: Partial<UserSettings>): UserSettings {
    try {
      const current = this.getSettings();
      const updated = { ...current, ...updates };
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(updated));
      return updated;
    } catch (e) {
      console.error('Failed to persist settings:', e);
      return this.getSettings();
    }
  }

  static resetSettings(): UserSettings {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(DEFAULT_SETTINGS));
      return DEFAULT_SETTINGS;
    } catch (e) {
      console.error('Failed to reset settings:', e);
      return DEFAULT_SETTINGS;
    }
  }

  static getStorageBreakdown(): {
    totalBytes: number;
    formatted: string;
    appsBytes: number;
    settingsBytes: number;
    wallpaperBytes: number;
    quotaPercentage: number;
  } {
    let totalBytes = 0;
    let appsBytes = 0;
    let settingsBytes = 0;
    let wallpaperBytes = 0;

    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) {
          const val = localStorage.getItem(key) || '';
          const size = (key.length + val.length) * 2; // UTF-16 approx 2 bytes per char
          totalBytes += size;

          if (key === 'HOME_APPS_V1') {
            appsBytes = size;
          } else if (key === 'HOME_SETTINGS_V1') {
            settingsBytes = size;
            try {
              const parsed = JSON.parse(val);
              if (parsed.customWallpaper) {
                wallpaperBytes = parsed.customWallpaper.length * 2;
              }
            } catch {
              // ignore
            }
          }
        }
      }
    } catch (e) {
      console.error('Storage breakdown error:', e);
    }

    // 5MB typical browser localStorage limit
    const estimatedQuota = 5 * 1024 * 1024;
    const quotaPercentage = Math.min(100, Math.round((totalBytes / estimatedQuota) * 1000) / 10);

    const formatBytes = (bytes: number) => {
      if (bytes < 1024) return `${bytes} B`;
      if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
      return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    };

    return {
      totalBytes,
      formatted: formatBytes(totalBytes),
      appsBytes,
      settingsBytes,
      wallpaperBytes,
      quotaPercentage,
    };
  }
}
