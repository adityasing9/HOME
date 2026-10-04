import { AppRepository } from './appRepository';
import type { AppItem } from '../types';

export interface PwaIconCandidate {
  url: string;
  label: string;
  width?: number;
  height?: number;
  sizes?: string;
  type?: string;
}

export interface PwaDetectionResult {
  name: string;
  description: string;
  domain: string;
  icons: PwaIconCandidate[];
  bestIcon: string | null;
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
   * Comprehensive PWA logo & metadata detector
   */
  static async detectPwa(rawUrl: string): Promise<PwaDetectionResult> {
    const emptyResult: PwaDetectionResult = {
      name: '',
      description: '',
      domain: '',
      icons: [],
      bestIcon: null,
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

    let detectedName = '';
    let detectedDesc = '';
    const rawCandidatesMap = new Map<string, { label: string; defaultSize?: number }>();
    const manifestPaths = ['/manifest.webmanifest', '/manifest.json', '/site.webmanifest'];

    // 1. Attempt to fetch root HTML page if CORS is enabled
    try {
      const pageController = new AbortController();
      const pageTimer = setTimeout(() => pageController.abort(), 2000);
      const pageRes = await fetch(origin, {
        signal: pageController.signal,
        headers: { Accept: 'text/html' },
      }).catch(() => null);
      clearTimeout(pageTimer);

      if (pageRes && pageRes.ok) {
        const html = await pageRes.text().catch(() => '');
        if (html) {
          // Extract <title>
          const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
          if (titleMatch && titleMatch[1]) {
            const rawTitle = titleMatch[1].trim();
            const cleanTitle = rawTitle.split(/ [|\-–—:] /)[0].trim();
            if (cleanTitle && cleanTitle.length > 1 && cleanTitle.length < 50) {
              detectedName = cleanTitle;
            }
          }

          // Extract meta description
          const descMatch =
            html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i) ||
            html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*name=["']description["']/i) ||
            html.match(/<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']+)["']/i);
          if (descMatch && descMatch[1]) {
            detectedDesc = descMatch[1].trim();
          }

          // Extract link tags
          const linkRegex = /<link\s+([^>]+)>/gi;
          let linkMatch: RegExpExecArray | null;
          while ((linkMatch = linkRegex.exec(html)) !== null) {
            const attrs = linkMatch[1];
            const relMatch = attrs.match(/rel=["']([^"']+)["']/i);
            const hrefMatch = attrs.match(/href=["']([^"']+)["']/i);
            if (relMatch && hrefMatch) {
              const rel = relMatch[1].toLowerCase();
              const href = hrefMatch[1].trim();
              try {
                const absHref = new URL(href, origin).href;
                if (rel.includes('manifest') && !manifestPaths.includes(href)) {
                  manifestPaths.unshift(href);
                } else if (rel.includes('apple-touch-icon')) {
                  rawCandidatesMap.set(absHref, { label: 'Apple Touch Icon', defaultSize: 180 });
                } else if (rel.includes('icon')) {
                  const sizesMatch = attrs.match(/sizes=["']([^"']+)["']/i);
                  const sz = sizesMatch ? parseInt(sizesMatch[1].split('x')[0], 10) : undefined;
                  rawCandidatesMap.set(absHref, {
                    label: sizesMatch ? `Icon (${sizesMatch[1]})` : 'Page Icon',
                    defaultSize: sz || (absHref.endsWith('.svg') ? 256 : 64),
                  });
                }
              } catch {}
            }
          }
        }
      }
    } catch {}

    // 2. Fetch public PWA web manifest
    for (const path of manifestPaths) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2000);
        const manifestUrl = path.startsWith('http') ? path : origin + path;
        const res = await fetch(manifestUrl, {
          signal: controller.signal,
          headers: { Accept: 'application/json' },
        }).catch(() => null);
        clearTimeout(timeoutId);

        if (res && res.ok) {
          const contentType = res.headers.get('content-type') || '';
          if (contentType.includes('json') || contentType.includes('manifest')) {
            const data = await res.json().catch(() => null);
            if (data && typeof data === 'object') {
              if (data.name && typeof data.name === 'string') {
                detectedName = data.name.trim();
              } else if (data.short_name && typeof data.short_name === 'string' && !detectedName) {
                detectedName = data.short_name.trim();
              }

              if (data.description && typeof data.description === 'string' && !detectedDesc) {
                detectedDesc = data.description.trim();
              }

              if (Array.isArray(data.icons)) {
                for (const ic of data.icons) {
                  if (ic && ic.src && typeof ic.src === 'string') {
                    try {
                      const absoluteSrc = new URL(ic.src, manifestUrl).href;
                      const sizeNum = ic.sizes ? parseInt(ic.sizes.split('x')[0], 10) : 192;
                      rawCandidatesMap.set(absoluteSrc, {
                        label: ic.sizes ? `PWA (${ic.sizes})` : 'PWA Manifest Icon',
                        defaultSize: sizeNum,
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

    // 3. Add standard PWA and mobile icon endpoints to candidates list
    const standardIconEndpoints: { path: string; label: string; defaultSize: number }[] = [
      { path: '/apple-touch-icon.png', label: 'Apple Touch Icon', defaultSize: 180 },
      { path: '/apple-touch-icon-precomposed.png', label: 'Apple Touch Precomposed', defaultSize: 180 },
      { path: '/android-chrome-512x512.png', label: 'Android PWA 512', defaultSize: 512 },
      { path: '/android-chrome-192x192.png', label: 'Android PWA 192', defaultSize: 192 },
      { path: '/pwa-512x512.png', label: 'PWA Icon (512px)', defaultSize: 512 },
      { path: '/pwa-192x192.png', label: 'PWA Icon (192px)', defaultSize: 192 },
      { path: '/icons/icon-512x512.png', label: 'Icon 512px', defaultSize: 512 },
      { path: '/icons/icon-192x192.png', label: 'Icon 192px', defaultSize: 192 },
      { path: '/icon-512.png', label: 'Icon 512', defaultSize: 512 },
      { path: '/icon-192.png', label: 'Icon 192', defaultSize: 192 },
      { path: '/logo192.png', label: 'App Logo 192', defaultSize: 192 },
      { path: '/logo512.png', label: 'App Logo 512', defaultSize: 512 },
      { path: '/favicon.svg', label: 'Vector SVG Favicon', defaultSize: 256 },
      { path: '/favicon.ico', label: 'Favicon', defaultSize: 32 },
    ];

    standardIconEndpoints.forEach(item => {
      const full = origin + item.path;
      if (!rawCandidatesMap.has(full)) {
        rawCandidatesMap.set(full, { label: item.label, defaultSize: item.defaultSize });
      }
    });

    // Fallbacks for standard non-staging domains
    const isDevOrStaging = AppRepository.isStagingOrDevDomain(domain);
    if (!isDevOrStaging) {
      const googleFaviconUrl = `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;
      const duckFaviconUrl = `https://icons.duckduckgo.com/ip3/${domain}.ico`;
      rawCandidatesMap.set(googleFaviconUrl, { label: 'Google Favicon (128px)', defaultSize: 128 });
      rawCandidatesMap.set(duckFaviconUrl, { label: 'DuckDuckGo Favicon', defaultSize: 64 });
    }

    // 4. Concurrently probe candidates to verify reachability and natural dimensions
    const verifiedIcons: PwaIconCandidate[] = [];
    const probeEntries = Array.from(rawCandidatesMap.entries());

    await Promise.all(
      probeEntries.map(async ([candidateUrl, meta]) => {
        const probe = await probeImage(candidateUrl, 2000);
        if (probe.ok) {
          verifiedIcons.push({
            url: candidateUrl,
            label: meta.label,
            width: probe.width || meta.defaultSize || 64,
            height: probe.height || meta.defaultSize || 64,
            sizes: probe.width ? `${probe.width}x${probe.height}` : undefined,
          });
        }
      })
    );

    // 5. Sort verified icons by resolution and priority
    verifiedIcons.sort((a, b) => {
      // Prioritize Vector SVG
      const isSvgA = a.url.toLowerCase().endsWith('.svg');
      const isSvgB = b.url.toLowerCase().endsWith('.svg');
      if (isSvgA && !isSvgB) return -1;
      if (!isSvgA && isSvgB) return 1;

      // Prioritize large high-res icons (512, 192, 180)
      const sizeA = a.width || 0;
      const sizeB = b.width || 0;
      return sizeB - sizeA;
    });

    const bestIcon = verifiedIcons.length > 0 ? verifiedIcons[0].url : null;

    return {
      name: detectedName || fallbackName,
      description: detectedDesc,
      domain,
      icons: verifiedIcons,
      bestIcon,
    };
  }

  /**
   * Detect and apply PWA logo for an individual existing app
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
   * Batch auto-detect logos for apps
   * @param apps List of current apps
   * @param onProgress Callback invoked per scanned app
   * @param forceAll If true, probes all apps; if false, probes apps missing icons or having letter fallbacks
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
