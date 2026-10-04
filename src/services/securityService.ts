import { AppRepository } from './appRepository';
import { SettingsRepository } from './settingsRepository';
import type { AppItem, UserSettings } from '../types';

export interface SecurityProfile {
  userName: string;
  avatar: string; // url, emoji, or preset
  hasPin: boolean;
  pinHash: string | null;
  requireLockOnStartup: boolean;
  autoLockMinutes: number; // 0 = never, 5, 15, 30
  biometricEnabled: boolean;
  biometricCredentialId: string | null;
  lastLoginAt: number | null;
}

const SECURITY_STORAGE_KEY = 'HOME_SECURITY_PROFILE_V1';
const LOCK_STATE_SESSION_KEY = 'HOME_PC_IS_LOCKED_V1';

export class SecurityService {
  /**
   * Hashes a PIN using SHA-256 for secure storage.
   */
  static async hashPin(pin: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(`home_salt_${pin}_secure`);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Retrieves security profile.
   */
  static getProfile(): SecurityProfile {
    try {
      const raw = localStorage.getItem(SECURITY_STORAGE_KEY);
      if (raw) {
        return JSON.parse(raw);
      }
    } catch (e) {
      console.error('Error reading security profile:', e);
    }

    const settings = SettingsRepository.getSettings();
    const defaultProfile: SecurityProfile = {
      userName: settings.userName || 'Aditya Singh',
      avatar: '👤',
      hasPin: false,
      pinHash: null,
      requireLockOnStartup: false,
      autoLockMinutes: 0,
      biometricEnabled: false,
      biometricCredentialId: null,
      lastLoginAt: Date.now(),
    };

    return defaultProfile;
  }

  /**
   * Saves security profile.
   */
  static saveProfile(updates: Partial<SecurityProfile>): SecurityProfile {
    const current = this.getProfile();
    const updated: SecurityProfile = { ...current, ...updates };
    try {
      localStorage.setItem(SECURITY_STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
      console.error('Error saving security profile:', e);
    }
    return updated;
  }

  /**
   * Checks if PC is currently locked.
   */
  static isLocked(): boolean {
    const profile = this.getProfile();
    // Check if session storage has explicit lock, or if startup lock is enabled
    const sessionState = sessionStorage.getItem(LOCK_STATE_SESSION_KEY);
    if (sessionState !== null) {
      return sessionState === 'true';
    }
    // If startup lock is required and user has a PIN or biometric
    if (profile.requireLockOnStartup && (profile.hasPin || profile.biometricEnabled)) {
      return true;
    }
    return false;
  }

  /**
   * Explicitly locks the PC.
   */
  static lock(): void {
    sessionStorage.setItem(LOCK_STATE_SESSION_KEY, 'true');
  }

  /**
   * Explicitly unlocks the PC.
   */
  static unlock(): void {
    sessionStorage.setItem(LOCK_STATE_SESSION_KEY, 'false');
    this.saveProfile({ lastLoginAt: Date.now() });
  }

  /**
   * Verifies PIN against stored hash.
   */
  static async verifyPin(enteredPin: string): Promise<boolean> {
    const profile = this.getProfile();
    if (!profile.hasPin || !profile.pinHash) {
      return true;
    }
    const enteredHash = await this.hashPin(enteredPin);
    return enteredHash === profile.pinHash;
  }

  /**
   * Sets or updates security PIN.
   */
  static async setPin(newPin: string | null): Promise<void> {
    if (!newPin || !newPin.trim()) {
      this.saveProfile({
        hasPin: false,
        pinHash: null,
      });
      return;
    }

    const pinHash = await this.hashPin(newPin.trim());
    this.saveProfile({
      hasPin: true,
      pinHash,
    });
  }

  /**
   * Registers Windows Hello / Touch ID platform biometric credential via WebAuthn.
   */
  static async registerBiometric(): Promise<boolean> {
    if (typeof window === 'undefined' || !window.PublicKeyCredential) {
      return false;
    }

    try {
      const isAvailable = await window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
      if (!isAvailable) {
        return false;
      }

      const profile = this.getProfile();
      const challenge = crypto.getRandomValues(new Uint8Array(32));
      const userId = crypto.getRandomValues(new Uint8Array(16));

      const credential = (await navigator.credentials.create({
        publicKey: {
          challenge,
          rp: { name: 'HOME PC Login' },
          user: {
            id: userId,
            name: profile.userName.toLowerCase().replace(/\s+/g, '_'),
            displayName: profile.userName,
          },
          pubKeyCredParams: [
            { alg: -7, type: 'public-key' }, // ES256
            { alg: -257, type: 'public-key' }, // RS256
          ],
          authenticatorSelection: {
            authenticatorAttachment: 'platform',
            userVerification: 'required',
          },
          timeout: 60000,
        },
      })) as PublicKeyCredential | null;

      if (credential && credential.id) {
        this.saveProfile({
          biometricEnabled: true,
          biometricCredentialId: credential.id,
        });
        return true;
      }
      return false;
    } catch (e) {
      console.warn('Biometric registration error:', e);
      return false;
    }
  }

  /**
   * Authenticates using Windows Hello / Touch ID / Face ID platform biometric.
   */
  static async authenticateBiometric(): Promise<boolean> {
    if (typeof window === 'undefined' || !window.PublicKeyCredential) {
      return false;
    }

    try {
      const challenge = crypto.getRandomValues(new Uint8Array(32));
      const assertion = await navigator.credentials.get({
        publicKey: {
          challenge,
          timeout: 60000,
          userVerification: 'required',
        },
      });

      if (assertion) {
        this.unlock();
        return true;
      }
      return false;
    } catch (e) {
      console.warn('Biometric authentication failed:', e);
      return false;
    }
  }

  /**
   * Applies authenticated login data received from a phone QR sync.
   */
  static applyPhoneLogin(payload: {
    userName?: string;
    avatar?: string;
    apps?: AppItem[];
    settings?: Partial<UserSettings>;
  }): void {
    if (payload.userName) {
      this.saveProfile({ userName: payload.userName, avatar: payload.avatar || '👤' });
      SettingsRepository.saveSettings({ userName: payload.userName });
    }
    if (payload.apps && payload.apps.length > 0) {
      AppRepository.saveApps(payload.apps);
    }
    if (payload.settings) {
      SettingsRepository.saveSettings(payload.settings);
    }
    this.unlock();
  }
}
