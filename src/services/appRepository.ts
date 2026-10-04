import type { AppItem } from '../types';
import { DEFAULT_APPS } from '../data/defaultApps';

const STORAGE_KEY = 'HOME_APPS_V1';
const FAILED_ICONS_KEY = 'HOME_FAILED_ICON_URLS_V1';

export class AppRepository {
  /**
   * Check if domain belongs to a staging, dev, or local environment where Google favicons will 404
   */
  static isStagingOrDevDomain(domainOrUrl: string): boolean {
    const d = domainOrUrl.toLowerCase();
    return (
      d.includes('.github.io') ||
      d.includes('.gitlab.io') ||
      d.includes('.pages.dev') ||
      d.includes('.onrender.com') ||
      d.includes('.vercel.app') ||
      d.includes('.netlify.app') ||
      d.includes('.railway.app') ||
      d.includes('.fly.dev') ||
      d.includes('.surge.sh') ||
      d.includes('.web.app') ||
      d.includes('.firebaseapp.com') ||
      d.includes('.azurewebsites.net') ||
      d.includes('.herokuapp.com') ||
      d.includes('.amplifyapp.com') ||
      d.includes('.glitch.me') ||
      d.includes('.replit.app') ||
      d.includes('.repl.co') ||
      d.includes('localhost') ||
      d.endsWith('.local') ||
      d.endsWith('.internal')
    );
  }

  /**
   * Get set of known broken icon URLs
   */
  static getFailedIcons(): Set<string> {
    try {
      const raw = localStorage.getItem(FAILED_ICONS_KEY);
      if (!raw) return new Set();
      const arr = JSON.parse(raw);
      return new Set(Array.isArray(arr) ? arr : []);
    } catch {
      return new Set();
    }
  }

  /**
   * Cache a known broken icon URL so it is never requested over network again
   */
  static markIconFailed(iconUrl: string): void {
    if (!iconUrl) return;
    try {
      const failed = this.getFailedIcons();
      if (!failed.has(iconUrl)) {
        failed.add(iconUrl);
        localStorage.setItem(FAILED_ICONS_KEY, JSON.stringify(Array.from(failed)));
      }
    } catch (e) {
      console.warn('Failed to cache broken icon URL:', e);
    }
  }

  /**
   * Sanitize existing apps: strip broken or non-existent favicon URLs from dev domains
   */
  static sanitizeApps(apps: AppItem[]): AppItem[] {
    const failedIcons = this.getFailedIcons();
    let modified = false;

    const sanitized = apps.map(app => {
      if (app.icon) {
        // If already flagged as broken
        if (failedIcons.has(app.icon)) {
          modified = true;
          return { ...app, icon: undefined, iconType: 'letter' as const };
        }
        // If pointing to a dev/staging domain on Google Favicon resolver or if app.url is a dev host
        if (app.icon.includes('google.com/s2/favicons') || app.icon.includes('gstatic.com/faviconV2')) {
          const match = app.icon.match(/domain=([^&]+)/) || app.icon.match(/url=([^&]+)/);
          const domainTarget = match ? decodeURIComponent(match[1]) : '';
          if (
            this.isStagingOrDevDomain(app.url) ||
            this.isStagingOrDevDomain(app.icon) ||
            (domainTarget && this.isStagingOrDevDomain(domainTarget))
          ) {
            modified = true;
            failedIcons.add(app.icon);
            return { ...app, icon: undefined, iconType: 'letter' as const };
          }
        }
      }
      return app;
    });

    if (modified) {
      try {
        localStorage.setItem(FAILED_ICONS_KEY, JSON.stringify(Array.from(failedIcons)));
        localStorage.setItem(STORAGE_KEY, JSON.stringify(sanitized));
      } catch {}
    }

    return sanitized;
  }

  static getApps(): AppItem[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_APPS));
        return DEFAULT_APPS;
      }
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return this.sanitizeApps(parsed);
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

      // standard reliable high-res Google favicon resolver for public domains
      // For staging/dev domains (e.g. vercel.app, onrender.com), do not set external favicon URL to prevent 404s
      const iconUrl = this.isStagingOrDevDomain(domain)
        ? ''
        : `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;

      return { name, domain, iconUrl };
    } catch {
      return { name: '', domain: '', iconUrl: '' };
    }
  }
}
