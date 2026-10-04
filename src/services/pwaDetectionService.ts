import { AppRepository } from './appRepository';
import type { AppItem } from '../types';

export interface PwaIconCandidate {
  url: string;
  label: string;
  width?: number;
  height?: number;
  sizes?: string;
  type?: string;
  purpose?: string;
  isInstallLogo?: boolean;
}

export interface PwaDetectionResult {
  name: string;
  description: string;
  domain: string;
  icons: PwaIconCandidate[];
  bestIcon: string | null;
  isActualInstallLogo?: boolean;
  installLogoLabel?: string;
  manifestFound?: boolean;
  themeColor?: string;
}

/**
 * Probe whether an image URL exists and can be loaded in the browser.
 * HTML <img> and new Image() DO NOT enforce CORS, allowing cross-origin image verification.
 * Note: SPAs return 200 text/html on missing routes; browser Image decoders fail on HTML,
 * which cleanly triggers onerror and avoids false-positive placeholder loads.
 */
export function probeImage(
  url: string,
  timeout = 2500
): Promise<{ ok: boolean; width: number; height: number }> {
  if (typeof window === 'undefined' || typeof Image === 'undefined') {
    return Promise.resolve({ ok: false, width: 0, height: 0 });
  }

  return new Promise(resolve => {
    const img = new Image();
    let settled = false;

    const timer = setTimeout(() => {
      if (!settled) {
        settled = true;
        img.onload = null;
        img.onerror = null;
        resolve({ ok: false, width: 0, height: 0 });
      }
    }, timeout);

    img.onload = () => {
      if (!settled) {
        settled = true;
        clearTimeout(timer);
        const isVectorSvg = url.toLowerCase().includes('.svg');
        const isValid = img.naturalWidth > 0 || isVectorSvg;
        resolve({
          ok: isValid,
          width: img.naturalWidth || (isVectorSvg ? 256 : 0),
          height: img.naturalHeight || (isVectorSvg ? 256 : 0),
        });
      }
    };

    img.onerror = () => {
      if (!settled) {
        settled = true;
        clearTimeout(timer);
        resolve({ ok: false, width: 0, height: 0 });
      }
    };

    img.src = url;
  });
}

export class PwaDetectionService {
  /**
   * Primary PWA Install Logo & metadata detector
   * Resolves the actual logo seen when an app is installed on mobile or desktop.
   */
  static async detectPwa(rawUrl: string): Promise<PwaDetectionResult> {
    const emptyResult: PwaDetectionResult = {
      name: '',
      description: '',
      domain: '',
      icons: [],
      bestIcon: null,
      isActualInstallLogo: false,
    };

    if (!rawUrl || rawUrl.trim().length < 4) return emptyResult;

    let cleanUrl = rawUrl.trim();
    if (!/^https?:\/\//i.test(cleanUrl)) {
      cleanUrl = 'https://' + cleanUrl;
    }

    let parsed: URL;
    try {
      parsed = new URL(cleanUrl);
    } catch {
      return emptyResult;
    }

    const domain = parsed.hostname;
    const origin = parsed.origin;

    // Derive a clean fallback name from the domain
    const hostParts = domain.replace(/^www\./i, '').split('.');
    const rawName = hostParts[0] || 'App';
    const fallbackName = rawName.charAt(0).toUpperCase() + rawName.slice(1);

    // 1. FAST-PATH: Query Serverless API endpoint `/api/pwa-manifest` (bypasses CORS completely)
    try {
      const apiController = new AbortController();
      const apiTimer = setTimeout(() => apiController.abort(), 4500);
      const apiRes = await fetch(`/api/pwa-manifest?url=${encodeURIComponent(cleanUrl)}`, {
        signal: apiController.signal,
        headers: { Accept: 'application/json' },
      }).catch(() => null);
      clearTimeout(apiTimer);

      if (apiRes && apiRes.ok) {
        const data = await apiRes.json().catch(() => null);
        if (data && data.installLogo) {
          const candidates: PwaIconCandidate[] = (data.icons || []).map((ic: any) => ({
            url: ic.url,
            label: ic.label || (ic.source === 'manifest' ? `PWA Install Logo (${ic.sizes})` : 'App Icon'),
            width: ic.sizeNum,
            height: ic.sizeNum,
            sizes: ic.sizes,
            type: ic.type,
            purpose: ic.purpose,
            isInstallLogo: ic.url === data.installLogo,
          }));

          return {
            name: data.name || fallbackName,
            description: data.description || '',
            domain,
            icons: candidates,
            bestIcon: data.installLogo,
            isActualInstallLogo: data.manifestFound || Boolean(data.installLogoDetails?.source === 'manifest'),
            installLogoLabel: data.installLogoDetails?.label || 'Actual PWA Install Logo',
            manifestFound: data.manifestFound,
            themeColor: data.themeColor,
          };
        }
      }
    } catch {}

    // 2. CLIENT-SIDE FALLBACK: Fetch HTML & manifests directly or via CORS proxies
    let detectedName = '';
    let detectedDesc = '';
    const rawCandidatesMap = new Map<string, { label: string; defaultSize: number; isManifest?: boolean; purpose?: string }>();
    const manifestPaths = ['/manifest.json', '/manifest.webmanifest', '/site.webmanifest'];

    // Try fetching manifest files
    for (const path of manifestPaths) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2000);
        const manifestUrl = origin + path;
        const res = await fetch(manifestUrl, {
          signal: controller.signal,
          headers: { Accept: 'application/json' },
        }).catch(() => null);
        clearTimeout(timeoutId);

        if (res && res.ok) {
          const contentType = res.headers.get('content-type') || '';
          if (!contentType.includes('html')) {
            const data = await res.json().catch(() => null);
            if (data && typeof data === 'object') {
              if (data.name && typeof data.name === 'string') detectedName = data.name.trim();
              else if (data.short_name && typeof data.short_name === 'string') detectedName = data.short_name.trim();

              if (data.description && typeof data.description === 'string') detectedDesc = data.description.trim();

              if (Array.isArray(data.icons)) {
                for (const ic of data.icons) {
                  if (ic && ic.src) {
                    try {
                      const absoluteSrc = new URL(ic.src, manifestUrl).href;
                      const sizeNum = ic.sizes ? parseInt(ic.sizes.split('x')[0], 10) : 192;
                      const purpose = (ic.purpose || 'any').toLowerCase();
                      rawCandidatesMap.set(absoluteSrc, {
                        label: `PWA Install Logo (${ic.sizes || '192x192'}${purpose.includes('maskable') ? ' Maskable' : ''})`,
                        defaultSize: isNaN(sizeNum) ? 192 : sizeNum,
                        isManifest: true,
                        purpose,
                      });
                    } catch {}
                  }
                }
              }
              break;
            }
          }
        }
      } catch {}
    }

    // Standard PWA install icon endpoints (ranked by install priority)
    const standardIconEndpoints: { path: string; label: string; defaultSize: number; isManifest?: boolean; purpose?: string }[] = [
      { path: '/icons/icon-512x512-maskable.png', label: 'Actual PWA Install Logo (512x512 Maskable)', defaultSize: 512, isManifest: true, purpose: 'maskable' },
      { path: '/icon-512x512.png', label: 'Actual PWA Install Logo (512x512)', defaultSize: 512, isManifest: true, purpose: 'maskable any' },
      { path: '/icons/icon-512x512.png', label: 'Actual PWA Install Logo (512x512)', defaultSize: 512, isManifest: true, purpose: 'maskable any' },
      { path: '/pwa-512x512.png', label: 'PWA Icon (512x512)', defaultSize: 512, isManifest: true },
      { path: '/assets/maskable_icon.png', label: 'PWA Maskable Icon (512px)', defaultSize: 512, isManifest: true, purpose: 'maskable' },
      { path: '/logo512.png', label: 'App Install Logo (512px)', defaultSize: 512, isManifest: true },
      { path: '/android-chrome-512x512.png', label: 'Android PWA Icon (512px)', defaultSize: 512, isManifest: true },
      { path: '/home-icon-512.png', label: 'PWA Install Logo (512px)', defaultSize: 512, isManifest: true },

      { path: '/icons/icon-192x192.png', label: 'PWA Install Logo (192x192)', defaultSize: 192, isManifest: true },
      { path: '/icon-192x192.png', label: 'PWA Install Logo (192x192)', defaultSize: 192, isManifest: true },
      { path: '/pwa-192x192.png', label: 'PWA Icon (192x192)', defaultSize: 192, isManifest: true },
      { path: '/logo192.png', label: 'App Logo (192px)', defaultSize: 192, isManifest: true },
      { path: '/android-chrome-192x192.png', label: 'Android PWA Icon (192px)', defaultSize: 192, isManifest: true },
      { path: '/home-icon-192.png', label: 'PWA Icon (192px)', defaultSize: 192, isManifest: true },

      { path: '/apple-touch-icon.png', label: 'Apple Touch Icon (iOS Install 180px)', defaultSize: 180 },
      { path: '/apple-touch-icon-precomposed.png', label: 'Apple Touch Precomposed (180px)', defaultSize: 180 },
      { path: '/favicon.svg', label: 'Vector SVG Icon', defaultSize: 256 },
      { path: '/favicon.ico', label: 'Favicon', defaultSize: 32 },
    ];

    standardIconEndpoints.forEach(item => {
      const full = origin + item.path;
      if (!rawCandidatesMap.has(full)) {
        rawCandidatesMap.set(full, {
          label: item.label,
          defaultSize: item.defaultSize,
          isManifest: item.isManifest,
          purpose: item.purpose,
        });
      }
    });

    // Concurrently probe candidate images to verify browser loadability
    const verifiedIcons: PwaIconCandidate[] = [];
    const probeEntries = Array.from(rawCandidatesMap.entries());

    await Promise.all(
      probeEntries.map(async ([candidateUrl, meta]) => {
        const probe = await probeImage(candidateUrl, 2200);
        if (probe.ok) {
          verifiedIcons.push({
            url: candidateUrl,
            label: meta.label,
            width: probe.width || meta.defaultSize || 64,
            height: probe.height || meta.defaultSize || 64,
            sizes: probe.width ? `${probe.width}x${probe.height}` : undefined,
            isInstallLogo: Boolean(meta.isManifest && (probe.width >= 192 || meta.defaultSize >= 192)),
            purpose: meta.purpose,
          });
        }
      })
    );

    // Rank verified icons strictly according to W3C PWA Install Icon specifications:
    // 1. Manifest / Install icons have absolute priority
    // 2. 512x512 is rank 1 (splash & desktop shortcut), 192x192 is rank 2 (mobile launcher), 180x180 is rank 3 (iOS home screen)
    // 3. Small favicons (16px, 32px) are demoted to lowest priority
    verifiedIcons.sort((a, b) => {
      if (a.isInstallLogo && !b.isInstallLogo) return -1;
      if (!a.isInstallLogo && b.isInstallLogo) return 1;

      const aSize = a.width || 0;
      const bSize = b.width || 0;

      // 512px gets top preference
      const aScore = (aSize === 512 ? 1000 : aSize === 192 ? 500 : aSize === 180 ? 400 : aSize) + (a.purpose?.includes('maskable') ? 50 : 0);
      const bScore = (bSize === 512 ? 1000 : bSize === 192 ? 500 : bSize === 180 ? 400 : bSize) + (b.purpose?.includes('maskable') ? 50 : 0);
      return bScore - aScore;
    });

    const bestIcon = verifiedIcons.length > 0 ? verifiedIcons[0].url : null;
    const isActual = verifiedIcons.length > 0 && Boolean(verifiedIcons[0].isInstallLogo);

    return {
      name: detectedName || fallbackName,
      description: detectedDesc,
      domain,
      icons: verifiedIcons,
      bestIcon,
      isActualInstallLogo: isActual,
      installLogoLabel: isActual ? verifiedIcons[0].label : undefined,
      manifestFound: Boolean(detectedName || isActual),
    };
  }

  /**
   * Detect and apply the actual PWA install logo for an individual app
   */
  static async updateAppWithPwaLogo(app: AppItem): Promise<AppItem | null> {
    const result = await this.detectPwa(app.url);
    if (result.bestIcon) {
      return AppRepository.updateApp(app.id, {
        icon: result.bestIcon,
        iconType: 'url',
      });
    }
    return null;
  }

  /**
   * Batch auto-upgrade all apps to their actual PWA install logos
   */
  static async autoUpgradeAllMissingLogos(
    apps: AppItem[],
    onProgress?: (current: number, total: number, appName: string) => void,
    forceAll = false
  ): Promise<{ updatedCount: number; updatedApps: AppItem[] }> {
    const failedIcons = AppRepository.getFailedIcons();
    const targetApps = forceAll
      ? apps
      : apps.filter(
          a =>
            !a.icon ||
            a.iconType === 'letter' ||
            failedIcons.has(a.icon) ||
            a.icon.includes('google.com/s2/favicons')
        );

    let updatedCount = 0;

    for (let i = 0; i < targetApps.length; i++) {
      const app = targetApps[i];
      if (onProgress) {
        onProgress(i + 1, targetApps.length, app.name);
      }

      try {
        const res = await this.detectPwa(app.url);
        if (res.bestIcon) {
          AppRepository.updateApp(app.id, {
            icon: res.bestIcon,
            iconType: 'url',
          });
          updatedCount++;
        }
      } catch {}
    }

    return {
      updatedCount,
      updatedApps: AppRepository.getApps(),
    };
  }
}
