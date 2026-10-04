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
}

export class PeerAuthService {
  private static activePeer: Peer | null = null;
  private static activeConn: DataConnection | null = null;

  /**
   * Initializes a listening Peer session on the PC.
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
              conn.send({ status: 'success', message: 'Authenticated on PC' });
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
   * Connects from Phone to the PC's session ID and transmits the login credentials.
   */
  static async sendLoginFromPhone(
    targetPeerId: string,
    payload: Omit<P2PLoginPayload, 'type' | 'version' | 'timestamp'>
  ): Promise<boolean> {
    return new Promise((resolve) => {
      const phonePeer = new Peer({ debug: 1 });

      const timeout = setTimeout(() => {
        phonePeer.destroy();
        resolve(false);
      }, 10000);

      phonePeer.on('open', () => {
        const conn = phonePeer.connect(targetPeerId, { reliable: true });

        conn.on('open', () => {
          const fullPayload: P2PLoginPayload = {
            ...payload,
            type: 'home-pc-login',
            version: 1,
            timestamp: Date.now(),
          };

          conn.send(fullPayload);
        });

        conn.on('data', (res: any) => {
          clearTimeout(timeout);
          if (res && res.status === 'success') {
            setTimeout(() => {
              conn.close();
              phonePeer.destroy();
            }, 500);
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
