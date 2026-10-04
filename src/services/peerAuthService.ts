import Peer, { type DataConnection } from 'peerjs';
import type { AppItem, UserSettings } from '../types';

export interface P2PLoginPayload {
  type: 'home-pc-login';
  version: 1;
  token: string;
  timestamp: number;
  userName?: string;
  avatar?: string;
  apps?: AppItem[];
  settings?: Partial<UserSettings>;
  deviceInfo?: string;
}

export interface LinkedDevice {
  id: string;
  name: string; // e.g. "Google Chrome (Windows PC)"
  sessionId: string;
  linkedAt: number;
  appsCount: number;
  userName?: string;
  status: 'active' | 'synced';
}

const LINKED_DEVICES_STORAGE_KEY = 'HOME_LINKED_DEVICES_V1';

export function getDeviceDescription(): string {
  if (typeof navigator === 'undefined') return 'Desktop Browser';
  const ua = navigator.userAgent;
  let os = 'PC';
  if (/Windows/i.test(ua)) os = 'Windows PC';
  else if (/Macintosh|Mac OS X/i.test(ua)) os = 'macOS';
  else if (/iPhone|iPad|iPod/i.test(ua)) os = 'iPhone / iPad';
  else if (/Android/i.test(ua)) os = 'Android Phone';
  else if (/Linux/i.test(ua)) os = 'Linux PC';

  let browser = 'Web Browser';
  if (/Edg/i.test(ua)) browser = 'Microsoft Edge';
  else if (/Chrome/i.test(ua)) browser = 'Google Chrome';
  else if (/Firefox/i.test(ua)) browser = 'Mozilla Firefox';
  else if (/Safari/i.test(ua) && !/Chrome/i.test(ua)) browser = 'Apple Safari';

  return `${browser} (${os})`;
}

export class PeerAuthService {
  private static activePeer: Peer | null = null;
  private static activeConn: DataConnection | null = null;

  /**
   * Initializes a listening Peer session on the PC (WhatsApp Web style).
   * Returns the generated session ID to be displayed in the QR code.
   */
  static async createLoginSession(
    onAuthenticated: (payload: P2PLoginPayload) => void,
    onError?: (err: Error) => void
  ): Promise<{ sessionId: string; cleanup: () => void }> {
    this.cleanupSession();

    return new Promise((resolve, reject) => {
      // Create random 8-character session token
      const sessionSuffix = Math.random().toString(36).substring(2, 10);
      const peerId = `home-pc-${Date.now().toString(36)}-${sessionSuffix}`;

      const peer = new Peer(peerId, {
        debug: 1,
      });

      this.activePeer = peer;

      peer.on('open', (id) => {
        resolve({
          sessionId: id,
          cleanup: () => this.cleanupSession(),
        });
      });

      peer.on('connection', (conn) => {
        this.activeConn = conn;

        conn.on('data', (data) => {
          try {
            const payload = data as P2PLoginPayload;
            if (payload && payload.type === 'home-pc-login') {
              conn.send({ status: 'success', message: 'Data successfully received on PC' });
              onAuthenticated(payload);
            }
          } catch (e) {
            console.error('Failed to parse peer login data:', e);
          }
        });

        conn.on('error', (err) => {
          console.warn('Peer connection error:', err);
          onError?.(err);
        });
      });

      peer.on('error', (err) => {
        console.warn('Peer error:', err);
        onError?.(err);
        reject(err);
      });
    });
  }

  /**
   * Connects from Phone to the PC's session ID and transmits the login & app catalog payload.
   */
  static async sendLoginFromPhone(
    targetPeerId: string,
    payload: Omit<P2PLoginPayload, 'type' | 'version' | 'timestamp'>,
    onProgress?: (stage: 'connecting' | 'exporting' | 'synced') => void
  ): Promise<boolean> {
    return new Promise((resolve) => {
      onProgress?.('connecting');
      const phonePeer = new Peer({ debug: 1 });

      const timeout = setTimeout(() => {
        phonePeer.destroy();
        resolve(false);
      }, 15000);

      phonePeer.on('open', () => {
        const conn = phonePeer.connect(targetPeerId, { reliable: true });

        conn.on('open', () => {
          onProgress?.('exporting');
          const fullPayload: P2PLoginPayload = {
            ...payload,
            type: 'home-pc-login',
            version: 1,
            timestamp: Date.now(),
            deviceInfo: getDeviceDescription(),
          };

          conn.send(fullPayload);
        });

        conn.on('data', (res: any) => {
          clearTimeout(timeout);
          if (res && res.status === 'success') {
            onProgress?.('synced');

            // Save linked device to phone history
            this.addLinkedDevice({
              id: `link_${Date.now()}`,
              name: 'Connected PC Browser',
              sessionId: targetPeerId,
              linkedAt: Date.now(),
              appsCount: payload.apps?.length || 0,
              userName: payload.userName,
              status: 'synced',
            });

            setTimeout(() => {
              conn.close();
              phonePeer.destroy();
            }, 600);
            resolve(true);
          }
        });

        conn.on('error', () => {
          clearTimeout(timeout);
          phonePeer.destroy();
          resolve(false);
        });
      });

      phonePeer.on('error', () => {
        clearTimeout(timeout);
        phonePeer.destroy();
        resolve(false);
      });
    });
  }

  /**
   * Linked Devices (WhatsApp Web Style) History Management
   */
  static getLinkedDevices(): LinkedDevice[] {
    try {
      const raw = localStorage.getItem(LINKED_DEVICES_STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  static addLinkedDevice(device: LinkedDevice): void {
    const list = this.getLinkedDevices().filter(d => d.sessionId !== device.sessionId);
    list.unshift(device);
    try {
      localStorage.setItem(LINKED_DEVICES_STORAGE_KEY, JSON.stringify(list.slice(0, 10)));
    } catch (e) {
      console.error('Error saving linked devices:', e);
    }
  }

  static removeLinkedDevice(sessionId: string): void {
    const list = this.getLinkedDevices().filter(d => d.sessionId !== sessionId);
    try {
      localStorage.setItem(LINKED_DEVICES_STORAGE_KEY, JSON.stringify(list));
    } catch (e) {
      console.error('Error updating linked devices:', e);
    }
  }

  static clearLinkedDevices(): void {
    localStorage.removeItem(LINKED_DEVICES_STORAGE_KEY);
  }

  static cleanupSession(): void {
    if (this.activeConn) {
      try {
        this.activeConn.close();
      } catch {}
      this.activeConn = null;
    }
    if (this.activePeer) {
      try {
        this.activePeer.destroy();
      } catch {}
      this.activePeer = null;
    }
  }
}
