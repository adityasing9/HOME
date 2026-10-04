import QRCode from 'qrcode';
import jsQR from 'jsqr';
import type { AppItem, UserSettings, HomeBackupData } from '../types';

export interface CompactAppItem {
  n: string; // name
  u: string; // url
  i?: string; // icon
  t?: 'letter' | 'emoji' | 'url' | 'image'; // iconType
  c?: string; // category
  p?: 0 | 1; // pinned
  f?: 0 | 1; // favorite
  d?: string; // description
  g?: string[]; // tags
}

export interface QRLauncherPayload {
  v: 1;
  type: 'home-sync' | 'home-app';
  exportedAt: string;
  apps: CompactAppItem[];
  settings?: Partial<UserSettings>;
}

export interface ParsedQRResult {
  type: 'full-sync' | 'single-app' | 'generic-url' | 'pc-login' | 'unknown';
  apps?: AppItem[];
  settings?: Partial<UserSettings>;
  url?: string;
  sessionId?: string;
  rawText: string;
}

export class QRService {
  /**
   * Compresses a JSON string into a compact format using deflate-raw if available.
   */
  static async compressPayload(jsonStr: string): Promise<string> {
    if (typeof CompressionStream !== 'undefined') {
      try {
        const stream = new Blob([jsonStr]).stream().pipeThrough(new CompressionStream('deflate-raw'));
        const buffer = await new Response(stream).arrayBuffer();
        const bytes = new Uint8Array(buffer);
        let binary = '';
        for (let i = 0; i < bytes.byteLength; i++) {
          binary += String.fromCharCode(bytes[i]);
        }
        return 'z:' + btoa(binary);
      } catch {
        // Fallback below
      }
    }
    return 'b:' + btoa(unescape(encodeURIComponent(jsonStr)));
  }

  /**
   * Decompresses an encoded payload string.
   */
  static async decompressPayload(encoded: string): Promise<string> {
    const trimmed = encoded.trim();
    if (trimmed.startsWith('z:')) {
      const rawBase64 = trimmed.slice(2);
      const binary = atob(rawBase64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
      return await new Response(stream).text();
    } else if (trimmed.startsWith('b:')) {
      return decodeURIComponent(escape(atob(trimmed.slice(2))));
    } else if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      return trimmed;
    }
    // Try standard base64
    try {
      return decodeURIComponent(escape(atob(trimmed)));
    } catch {
      return trimmed;
    }
  }

  /**
   * Encodes a list of apps (and optional settings) into a compact QR payload string.
   */
  static async encodeAppsToQR(
    apps: AppItem[],
    options?: {
      includeSettings?: boolean;
      settings?: UserSettings;
      asShareUrl?: boolean;
    }
  ): Promise<{ payload: string; shareUrl: string; appCount: number }> {
    const compactApps: CompactAppItem[] = apps.map(a => {
      const item: CompactAppItem = {
        n: a.name,
        u: a.url,
      };
      if (a.icon) item.i = a.icon;
      if (a.iconType) item.t = a.iconType;
      if (a.category && a.category !== 'Other') item.c = a.category;
      if (a.pinned) item.p = 1;
      if (a.favorite) item.f = 1;
      if (a.description) item.d = a.description;
      if (a.tags && a.tags.length > 0) item.g = a.tags;
      return item;
    });

    const payloadObj: QRLauncherPayload = {
      v: 1,
      type: apps.length === 1 ? 'home-app' : 'home-sync',
      exportedAt: new Date().toISOString(),
      apps: compactApps,
    };

    if (options?.includeSettings && options.settings) {
      payloadObj.settings = {
        theme: options.settings.theme,
        accentColor: options.settings.accentColor,
        background: options.settings.background,
        appSize: options.settings.appSize,
        pinnedSort: options.settings.pinnedSort,
      };
    }

    const jsonStr = JSON.stringify(payloadObj);
    const compressed = await this.compressPayload(jsonStr);

    const baseUrl = typeof window !== 'undefined'
      ? `${window.location.origin}${window.location.pathname}`
      : 'https://aadityasingh.vercel.app/';

    const shareUrl = `${baseUrl}#import=${encodeURIComponent(compressed)}`;

    return {
      payload: options?.asShareUrl ? shareUrl : compressed,
      shareUrl,
      appCount: apps.length,
    };
  }

  /**
   * Encodes a single app into a shareable QR string or URL.
   */
  static async encodeSingleApp(app: AppItem): Promise<{ payload: string; shareUrl: string }> {
    return this.encodeAppsToQR([app], { asShareUrl: true });
  }

  /**
   * Parses scanned QR code text into structured data.
   */
  static async parseScannedText(rawText: string): Promise<ParsedQRResult> {
    const trimmed = rawText.trim();
    if (!trimmed) {
      return { type: 'unknown', rawText };
    }

    let payloadString = trimmed;

    // Check if the scanned text is a PC Login QR code (e.g., https://.../#pc-login=SESSION_ID)
    if (trimmed.includes('#pc-login=')) {
      const match = trimmed.match(/#pc-login=([^&]+)/);
      if (match && match[1]) {
        return {
          type: 'pc-login',
          sessionId: decodeURIComponent(match[1]),
          rawText,
        };
      }
    }

    // Check if the scanned text is a HOME share URL (e.g., https://.../#import=... or #sync=...)
    if (trimmed.includes('#import=') || trimmed.includes('#sync=')) {
      const match = trimmed.match(/#(?:import|sync)=([^&]+)/);
      if (match && match[1]) {
        try {
          payloadString = decodeURIComponent(match[1]);
        } catch {
          payloadString = match[1];
        }
      }
    }

    // Attempt decompression
    let decodedJson = '';
    try {
      decodedJson = await this.decompressPayload(payloadString);
    } catch {
      decodedJson = payloadString;
    }

    // Check if it's JSON
    try {
      const parsed = JSON.parse(decodedJson);

      // Format 1: QRLauncherPayload (compact)
      if (parsed && typeof parsed === 'object' && Array.isArray(parsed.apps)) {
        const fullApps: AppItem[] = parsed.apps.map((compact: CompactAppItem, idx: number) => {
          return {
            id: `qr_${Date.now()}_${idx}_${Math.random().toString(36).slice(2, 6)}`,
            name: compact.n || 'Web App',
            url: compact.u || '#',
            icon: compact.i || '',
            iconType: compact.t || (compact.i ? 'image' : 'letter'),
            category: compact.c || 'Other',
            tags: compact.g || [],
            pinned: Boolean(compact.p),
            favorite: Boolean(compact.f),
            description: compact.d || '',
            createdAt: Date.now() - idx * 1000,
            launchCount: 0,
            lastOpenedAt: null,
            pinOrder: idx + 1,
          };
        });

        if (parsed.type === 'home-app' && fullApps.length === 1) {
          return {
            type: 'single-app',
            apps: fullApps,
            settings: parsed.settings,
            rawText,
          };
        }

        return {
          type: 'full-sync',
          apps: fullApps,
          settings: parsed.settings,
          rawText,
        };
      }

      // Format 2: Standard HomeBackupData ({ apps: AppItem[], settings: UserSettings })
      if (parsed && typeof parsed === 'object' && Array.isArray((parsed as HomeBackupData).apps)) {
        return {
          type: 'full-sync',
          apps: (parsed as HomeBackupData).apps,
          settings: (parsed as HomeBackupData).settings,
          rawText,
        };
      }
    } catch {
      // Not valid JSON
    }

    // Check if scanned text is a direct web URL (e.g. https://github.com or http://localhost:3000)
    if (/^https?:\/\/[^\s]+$/i.test(trimmed)) {
      try {
        const urlObj = new URL(trimmed);
        const name = urlObj.hostname.replace(/^www\./, '');
        const singleApp: AppItem = {
          id: `qr_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          name: name.charAt(0).toUpperCase() + name.slice(1),
          url: trimmed,
          icon: `https://www.google.com/s2/favicons?domain=${urlObj.hostname}&sz=128`,
          iconType: 'image',
          category: 'Other',
          tags: ['Scanned'],
          pinned: true,
          favorite: false,
          description: `Imported via QR scan`,
          createdAt: Date.now(),
          launchCount: 0,
          lastOpenedAt: null,
          pinOrder: 99,
        };

        return {
          type: 'single-app',
          apps: [singleApp],
          url: trimmed,
          rawText,
        };
      } catch {
        return { type: 'generic-url', url: trimmed, rawText };
      }
    }

    return { type: 'unknown', rawText };
  }

  /**
   * Generates a high-quality QR code Data URL (PNG) from text.
   */
  static async generateQRDataUrl(
    text: string,
    options?: {
      darkColor?: string;
      lightColor?: string;
      width?: number;
    }
  ): Promise<string> {
    return QRCode.toDataURL(text, {
      errorCorrectionLevel: 'M',
      margin: 2,
      width: options?.width || 360,
      color: {
        dark: options?.darkColor || '#0f172a',
        light: options?.lightColor || '#ffffff',
      },
    });
  }

  /**
   * Decodes a QR code from an HTMLImageElement, HTMLCanvasElement, or ImageData using jsQR.
   */
  static decodeFromImageData(imageData: ImageData): string | null {
    const code = jsQR(imageData.data, imageData.width, imageData.height, {
      inversionAttempts: 'attemptBoth',
    });
    return code ? code.data : null;
  }

  /**
   * Decodes a QR code from a File or Blob image.
   */
  static async decodeFromImageFile(file: File | Blob): Promise<string | null> {
    return new Promise((resolve) => {
      const img = new Image();
      const objectUrl = URL.createObjectURL(file);

      img.onload = () => {
        URL.revokeObjectURL(objectUrl);
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth || img.width;
        canvas.height = img.naturalHeight || img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(null);
          return;
        }

        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const result = this.decodeFromImageData(imageData);
        resolve(result);
      };

      img.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        resolve(null);
      };

      img.src = objectUrl;
    });
  }
}
