import type { HomeBackupData, AppItem, UserSettings } from '../types';
import { AppRepository } from './appRepository';
import { SettingsRepository } from './settingsRepository';

export class BackupService {
  static exportBackup(): void {
    const apps = AppRepository.getApps();
    const settings = SettingsRepository.getSettings();

    const data: HomeBackupData = {
      version: 1,
      exportedAt: new Date().toISOString(),
      apps,
      settings,
    };

    const jsonString = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `HOME-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  static validateBackup(data: unknown): { isValid: boolean; error?: string; apps?: AppItem[]; settings?: UserSettings } {
    if (!data || typeof data !== 'object') {
      return { isValid: false, error: 'Backup file does not contain a valid JSON object.' };
    }

    const obj = data as Record<string, unknown>;

    if (!Array.isArray(obj.apps)) {
      return { isValid: false, error: 'Backup is missing the "apps" array list.' };
    }

    // validate apps structure minimally
    for (const app of obj.apps) {
      if (!app || typeof app !== 'object' || !app.name || !app.url) {
        return { isValid: false, error: 'One or more apps in the backup lack a valid name or URL.' };
      }
    }

    const settings = (obj.settings && typeof obj.settings === 'object')
      ? (obj.settings as UserSettings)
      : SettingsRepository.getSettings();

    return {
      isValid: true,
      apps: obj.apps as AppItem[],
      settings,
    };
  }

  static restoreBackup(apps: AppItem[], settings: UserSettings): void {
    AppRepository.saveApps(apps);
    SettingsRepository.saveSettings(settings);
  }
}
