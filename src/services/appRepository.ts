import type { AppItem } from '../types';
import { DEFAULT_APPS } from '../data/defaultApps';

const STORAGE_KEY = 'HOME_APPS_V1';

export class AppRepository {
  static getApps(): AppItem[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_APPS));
        return DEFAULT_APPS;
      }
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed;
      }
      return DEFAULT_APPS;
    } catch (e) {
      console.error('Failed to read apps from localStorage:', e);
      return DEFAULT_APPS;
    }
  }

  static saveApps(apps: AppItem[]): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(apps));
    } catch (e) {
      console.error('Failed to persist apps:', e);
    }
  }

  static addApp(app: Omit<AppItem, 'id' | 'createdAt' | 'launchCount' | 'lastOpenedAt' | 'pinOrder'> & { id?: string; pinOrder?: number }): AppItem {
    const apps = this.getApps();
    const newId = app.id || `app-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const highestPinOrder = apps.filter(a => a.pinned).reduce((max, a) => Math.max(max, a.pinOrder), -1);

    const newApp: AppItem = {
      ...app,
      id: newId,
      createdAt: Date.now(),
      launchCount: 0,
      lastOpenedAt: null,
      pinOrder: app.pinned ? highestPinOrder + 1 : 9999,
    };

    const updated = [newApp, ...apps];
    this.saveApps(updated);
    return newApp;
  }

  static updateApp(id: string, updates: Partial<AppItem>): AppItem | null {
    const apps = this.getApps();
    const index = apps.findIndex(a => a.id === id);
    if (index === -1) return null;

    const existing = apps[index];
    const updatedApp = { ...existing, ...updates };
    apps[index] = updatedApp;
    this.saveApps(apps);
    return updatedApp;
  }

  static deleteApp(id: string): boolean {
    const apps = this.getApps();
    const filtered = apps.filter(a => a.id !== id);
    if (filtered.length !== apps.length) {
      this.saveApps(filtered);
      return true;
    }
    return false;
  }

  static togglePin(id: string): AppItem | null {
    const apps = this.getApps();
    const app = apps.find(a => a.id === id);
    if (!app) return null;

    const willBePinned = !app.pinned;
    const highestPinOrder = apps.filter(a => a.pinned).reduce((max, a) => Math.max(max, a.pinOrder), -1);

    app.pinned = willBePinned;
    app.pinOrder = willBePinned ? highestPinOrder + 1 : 9999;

    this.saveApps(apps);
    return app;
  }

  static toggleFavorite(id: string): AppItem | null {
    const apps = this.getApps();
    const app = apps.find(a => a.id === id);
    if (!app) return null;

    app.favorite = !app.favorite;
    this.saveApps(apps);
    return app;
  }

  static reorderPinned(orderedIds: string[]): AppItem[] {
    const apps = this.getApps();
    const idToOrder = new Map<string, number>();
    orderedIds.forEach((id, index) => idToOrder.set(id, index));

    const updated = apps.map(app => {
      if (idToOrder.has(app.id)) {
        return { ...app, pinned: true, pinOrder: idToOrder.get(app.id)! };
      }
      return app;
    });

    this.saveApps(updated);
    return updated;
  }

  static recordLaunch(id: string): AppItem | null {
    const apps = this.getApps();
    const app = apps.find(a => a.id === id);
    if (!app) return null;

    app.lastOpenedAt = Date.now();
    app.launchCount = (app.launchCount || 0) + 1;
    this.saveApps(apps);
    return app;
  }

  static clearActivity(): AppItem[] {
    const apps = this.getApps().map(app => ({
      ...app,
      lastOpenedAt: null,
      launchCount: 0,
    }));
    this.saveApps(apps);
    return apps;
  }

  static resetToDefault(): AppItem[] {
    this.saveApps(DEFAULT_APPS);
    return DEFAULT_APPS;
  }

  static clearAll(): void {
    localStorage.removeItem(STORAGE_KEY);
  }

  static checkDuplicateUrl(url: string, excludeId?: string): AppItem | null {
    const normalized = url.trim().toLowerCase().replace(/\/+$/, '');
    const apps = this.getApps();
    return apps.find(a => {
      if (excludeId && a.id === excludeId) return false;
      const appUrl = a.url.trim().toLowerCase().replace(/\/+$/, '');
      return appUrl === normalized;
    }) || null;
  }

  /**
   * Helper to detect metadata client-side from URL
   */
  static extractMetadataFromUrl(url: string): { name: string; domain: string; iconUrl: string } {
    try {
      let cleanUrl = url.trim();
      if (!/^https?:\/\//i.test(cleanUrl)) {
        cleanUrl = 'https://' + cleanUrl;
      }
      const parsed = new URL(cleanUrl);
      const domain = parsed.hostname;
      
      // derive reasonable display name
      const parts = domain.replace(/^www\./i, '').split('.');
      const rawName = parts[0] || 'App';
      const name = rawName.charAt(0).toUpperCase() + rawName.slice(1);

      // standard reliable high-res Google favicon resolver
      const iconUrl = `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;

      return { name, domain, iconUrl };
    } catch {
      return { name: '', domain: '', iconUrl: '' };
    }
  }
}
