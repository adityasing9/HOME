import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useApp } from '../../context/AppContext';
import { SecurityService, type SecurityProfile } from '../../services/securityService';
import { PeerAuthService, type P2PLoginPayload } from '../../services/peerAuthService';
import { QRService } from '../../services/qrService';
import {
  Lock,
  Unlock,
  Shield,
  Smartphone,
  Camera,
  KeyRound,
  Fingerprint,
  RefreshCw,
  Check,
  AlertCircle,
  Sun,
  Moon,
  ArrowRight,
} from 'lucide-react';

export const PCLockScreen: React.FC = () => {
  const {
    isPCLocked,
    setIsPCLocked,
    settings,
    updateSettings,
    refreshApps,
    showToast,
  } = useApp();

  const [currentTime, setCurrentTime] = useState<string>('');
  const [currentDate, setCurrentDate] = useState<string>('');
  const [profile, setProfile] = useState<SecurityProfile>(() => SecurityService.getProfile());

  // Input states
  const [pinInput, setPinInput] = useState<string>('');
  const [pinError, setPinError] = useState<string | null>(null);
  const [isShaking, setIsShaking] = useState<boolean>(false);
  const [isVerifying, setIsVerifying] = useState<boolean>(false);

  // Active Login Method: 'pin' | 'qr-phone' | 'webcam'
  const [loginMethod, setLoginMethod] = useState<'pin' | 'qr-phone' | 'webcam'>('pin');

  // QR Phone Login states
  const [peerSessionId, setPeerSessionId] = useState<string | null>(null);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  const [isConnectingPeer, setIsConnectingPeer] = useState<boolean>(false);
  const [authSuccessData, setAuthSuccessData] = useState<P2PLoginPayload | null>(null);

  // Webcam scanning states
  const webcamVideoRef = useRef<HTMLVideoElement | null>(null);
  const webcamStreamRef = useRef<MediaStream | null>(null);
  const webcamAnimRef = useRef<number | null>(null);
  const [webcamError, setWebcamError] = useState<string | null>(null);

  // Update clock every second
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      );
      setCurrentDate(
        now.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Sync profile when lock screen opens
  useEffect(() => {
    if (isPCLocked) {
      setProfile(SecurityService.getProfile());
      setPinInput('');
      setPinError(null);
      setAuthSuccessData(null);
      setLoginMethod(profile.hasPin ? 'pin' : 'qr-phone');
    }
  }, [isPCLocked]);

  // Clean up Peer and Webcam on unlock or unmount
  const stopWebcam = useCallback(() => {
    if (webcamAnimRef.current) {
      cancelAnimationFrame(webcamAnimRef.current);
      webcamAnimRef.current = null;
    }
    if (webcamStreamRef.current) {
      webcamStreamRef.current.getTracks().forEach(t => t.stop());
      webcamStreamRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      PeerAuthService.cleanupSession();
      stopWebcam();
    };
  }, [stopWebcam]);

  // Unlock PC handler
  const handleUnlockSuccess = useCallback((customMsg?: string) => {
    SecurityService.unlock();
    setIsPCLocked(false);
    refreshApps();
    showToast(customMsg || `Welcome back, ${profile.userName}!`, 'success');
  }, [profile.userName, refreshApps, showToast, setIsPCLocked]);

  // Verify PIN submission
  const handlePinSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!profile.hasPin) {
      handleUnlockSuccess();
      return;
    }

    if (!pinInput.trim()) {
      setPinError('Please enter your PIN');
      return;
    }

    setIsVerifying(true);
    setPinError(null);

    const isValid = await SecurityService.verifyPin(pinInput.trim());
    setIsVerifying(false);

    if (isValid) {
      handleUnlockSuccess();
    } else {
      setPinError('Incorrect PIN. Please try again.');
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 500);
      setPinInput('');
      if ('vibrate' in navigator) {
        try { navigator.vibrate([60, 40, 60]); } catch {}
      }
    }
  };

  // Windows Hello / Biometric authentication
  const handleBiometricAuth = async () => {
    setIsVerifying(true);
    setPinError(null);

    const success = await SecurityService.authenticateBiometric();
    setIsVerifying(false);

    if (success) {
      handleUnlockSuccess(`Unlocked with Windows Hello / Biometrics!`);
    } else {
      setPinError('Biometric authentication cancelled or unavailable.');
    }
  };

  // --- Real-time Phone QR Login Session (PeerJS) ---
  const startPeerLoginSession = useCallback(async () => {
    setIsConnectingPeer(true);
    setAuthSuccessData(null);

    try {
      const { sessionId } = await PeerAuthService.createLoginSession(
        (payload) => {
          // Phone scanned and sent authentication!
          setAuthSuccessData(payload);
          if ('vibrate' in navigator) {
            try { navigator.vibrate([40, 30, 40]); } catch {}
          }

          SecurityService.applyPhoneLogin({
            userName: payload.userName,
            avatar: payload.avatar,
            apps: payload.apps,
            settings: payload.settings,
          });

          setTimeout(() => {
            handleUnlockSuccess(`Authenticated via Phone as ${payload.userName || profile.userName}!`);
          }, 1000);
        },
        (err) => {
          console.warn('Peer session notice:', err);
        }
      );

      setPeerSessionId(sessionId);

      // Generate QR Code containing link to pair with this PC
      const baseUrl = typeof window !== 'undefined'
        ? `${window.location.origin}${window.location.pathname}`
        : 'https://aadityasingh.vercel.app/';

      const pairUrl = `${baseUrl}#pc-login=${encodeURIComponent(sessionId)}`;
      const qrData = await QRService.generateQRDataUrl(pairUrl, {
        darkColor: '#0f172a',
        lightColor: '#ffffff',
        width: 320,
      });

      setQrCodeDataUrl(qrData);
    } catch (e) {
      console.error('Failed to create peer login session:', e);
    } finally {
      setIsConnectingPeer(false);
    }
  }, [handleUnlockSuccess, profile.userName]);

  // Manage login method transitions
  useEffect(() => {
    if (!isPCLocked) return;

    if (loginMethod === 'qr-phone') {
      startPeerLoginSession();
      stopWebcam();
    } else if (loginMethod === 'webcam') {
      PeerAuthService.cleanupSession();
      startWebcamScan();
    } else {
      PeerAuthService.cleanupSession();
      stopWebcam();
    }
  }, [isPCLocked, loginMethod]);

  // --- Webcam Scan Login (PC scans phone's QR code) ---
  const startWebcamScan = async () => {
    stopWebcam();
    setWebcamError(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      });

      webcamStreamRef.current = stream;
      if (webcamVideoRef.current) {
        webcamVideoRef.current.srcObject = stream;
        await webcamVideoRef.current.play();

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d', { willReadFrequently: true });

        const scanLoop = () => {
          if (!webcamVideoRef.current || webcamVideoRef.current.readyState !== webcamVideoRef.current.HAVE_ENOUGH_DATA) {
            webcamAnimRef.current = requestAnimationFrame(scanLoop);
            return;
          }

          canvas.width = webcamVideoRef.current.videoWidth;
          canvas.height = webcamVideoRef.current.videoHeight;

          if (ctx) {
            ctx.drawImage(webcamVideoRef.current, 0, 0, canvas.width, canvas.height);
            const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const detected = QRService.decodeFromImageData(imgData);

            if (detected) {
              stopWebcam();
              QRService.parseScannedText(detected).then(result => {
                if (result.type !== 'unknown') {
                  SecurityService.applyPhoneLogin({
                    apps: result.apps,
                    settings: result.settings,
                  });
                  handleUnlockSuccess('QR Code verified via webcam!');
                }
              });
              return;
            }
          }

          webcamAnimRef.current = requestAnimationFrame(scanLoop);
        };

        webcamAnimRef.current = requestAnimationFrame(scanLoop);
      }
    } catch {
      setWebcamError('Webcam access was not granted or is unavailable.');
    }
  };

  if (!isPCLocked) return null;

  return (
    <div className="fixed inset-0 z-[10000] flex flex-col justify-between p-6 sm:p-10 select-none bg-slate-950 text-slate-100 overflow-hidden animate-in fade-in duration-300">
      {/* Dynamic Ambient Glass Lighting Spheres */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[10%] left-[50%] -translate-x-[60%] w-[620px] h-[520px] rounded-full bg-blue-600/20 blur-[130px] animate-pulse" />
        <div className="absolute bottom-[15%] left-[50%] translate-x-[20%] w-[580px] h-[480px] rounded-full bg-indigo-600/20 blur-[130px]" />
      </div>

      {/* Top Header Section: Big OS Clock & Date */}
      <div className="relative z-10 flex flex-col items-center justify-center pt-4 sm:pt-8 text-center">
        <div className="text-5xl sm:text-7xl font-extrabold tracking-tight text-white drop-shadow-md font-sans">
          {currentTime || '00:00'}
        </div>
        <div className="text-sm sm:text-base font-medium text-slate-300/90 mt-1.5 tracking-wide">
          {currentDate}
        </div>
      </div>

      {/* Center Section: User Card & Unlock Interface */}
      <div className="relative z-10 w-full max-w-sm mx-auto my-auto flex flex-col items-center">
        {/* User Avatar Circle */}
        <div className="relative mb-3 group">
          <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-sky-500 via-blue-600 to-indigo-600 p-[3px] shadow-2xl shadow-blue-500/30">
            <div className="w-full h-full rounded-full bg-slate-900 flex items-center justify-center text-3xl overflow-hidden border border-white/10">
              {profile.avatar && profile.avatar.length <= 4 ? (
                <span>{profile.avatar}</span>
              ) : profile.avatar ? (
                <img src={profile.avatar} alt="User Avatar" className="w-full h-full object-cover" />
              ) : (
                <span>👤</span>
              )}
            </div>
          </div>
          <div className="absolute -bottom-1 -right-1 p-1.5 rounded-full bg-slate-900 border border-white/20 text-accent shadow-md">
            <Lock className="w-3.5 h-3.5" />
          </div>
        </div>

        {/* User Name */}
        <h1 className="text-lg font-bold text-white tracking-tight mb-1">
          {profile.userName}
        </h1>
        <p className="text-xs text-slate-400 mb-5">
          {profile.hasPin ? 'PC is locked. Enter PIN or scan with phone.' : 'Click Sign In or scan QR to unlock.'}
        </p>

        {/* --- METHOD 1: PIN INPUT --- */}
        {loginMethod === 'pin' && (
          <form
            onSubmit={handlePinSubmit}
            className={`w-full flex flex-col items-center space-y-3 transition-transform ${
              isShaking ? 'translate-x-[-8px] duration-75' : ''
            }`}
          >
            {profile.hasPin ? (
              <div className="w-full relative">
                <input
                  type="password"
                  autoFocus
                  maxLength={12}
                  value={pinInput}
                  onChange={e => setPinInput(e.target.value)}
                  placeholder="Enter Security PIN"
                  className="w-full px-4 py-2.5 rounded-2xl bg-white/10 border border-white/20 text-center text-white placeholder-slate-400 text-sm outline-none focus:ring-2 focus:ring-accent backdrop-blur-md transition-all font-mono tracking-widest"
                />
                <button
                  type="submit"
                  disabled={isVerifying}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-xl bg-accent text-white hover:bg-accent-hover transition-colors shadow-sm disabled:opacity-50"
                  title="Unlock PC"
                >
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                type="submit"
                disabled={isVerifying}
                className="w-full py-2.5 px-5 rounded-2xl bg-accent text-white font-bold text-sm hover:bg-accent-hover transition-all shadow-lg shadow-accent/25 flex items-center justify-center gap-2"
              >
                <Unlock className="w-4 h-4" />
                <span>Sign In to PC</span>
              </button>
            )}

            {pinError && (
              <p className="text-xs text-rose-400 font-medium text-center animate-in fade-in">
                {pinError}
              </p>
            )}

            {/* Windows Hello / Biometric Button (if enabled) */}
            {profile.biometricEnabled && (
              <button
                type="button"
                onClick={handleBiometricAuth}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-slate-300 hover:text-white transition-all"
              >
                <Fingerprint className="w-3.5 h-3.5 text-accent" />
                <span>Sign in with Windows Hello</span>
              </button>
            )}
          </form>
        )}

        {/* --- METHOD 2: SCAN QR WITH PHONE (WHATSAPP WEB STYLE) --- */}
        {loginMethod === 'qr-phone' && (
          <div className="w-full flex flex-col items-center space-y-3 animate-in fade-in duration-200">
            {authSuccessData ? (
              <div className="p-5 rounded-3xl bg-emerald-500/15 border border-emerald-500/30 text-center space-y-3 animate-in zoom-in-95 max-w-xs w-full">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500 text-white mx-auto flex items-center justify-center shadow-lg shadow-emerald-500/30">
                  <Check className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-sm font-bold text-emerald-400">
                    Phone Synchronized!
                  </div>
                  <div className="text-xs text-slate-300 mt-0.5">
                    Exported {authSuccessData.apps?.length || 0} apps & preferences
                  </div>
                </div>
                <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
                  <div className="h-full bg-emerald-500 animate-pulse w-full" />
                </div>
                <div className="text-[11px] text-slate-400">
                  Launching desktop as {authSuccessData.userName || profile.userName}...
                </div>
              </div>
            ) : isConnectingPeer ? (
              <div className="w-52 h-52 rounded-2xl bg-white/5 border border-white/10 flex flex-col items-center justify-center gap-2 text-slate-400">
                <RefreshCw className="w-6 h-6 animate-spin text-accent" />
                <span className="text-xs">Preparing Login QR...</span>
              </div>
            ) : qrCodeDataUrl ? (
              <div className="flex flex-col items-center p-3 rounded-2xl bg-white shadow-2xl ring-2 ring-accent/50 animate-in zoom-in-95">
                <img
                  src={qrCodeDataUrl}
                  alt="Scan to Login"
                  className="w-44 h-44 object-contain rounded-lg"
                />
                <span className="text-[10px] font-semibold text-slate-900 mt-1">
                  Scan with HOME Mobile Scanner
                </span>
                {peerSessionId && (
                  <span className="text-[9px] font-mono text-slate-500 mt-0.5">
                    Session {peerSessionId.slice(0, 8)}
                  </span>
                )}
              </div>
            ) : (
              <div className="text-xs text-slate-400">Unable to generate QR code.</div>
            )}

            <div className="text-center text-xs text-slate-300 max-w-xs leading-relaxed">
              Open <strong>HOME</strong> on your phone, tap <strong>QR Scan</strong>, and point camera at this screen to login instantly.
            </div>
          </div>
        )}

        {/* --- METHOD 3: SCAN PHONE WITH PC WEBCAM --- */}
        {loginMethod === 'webcam' && (
          <div className="w-full flex flex-col items-center space-y-3 animate-in fade-in duration-200">
            <div className="relative w-56 h-44 rounded-2xl overflow-hidden bg-black/80 border border-white/20 flex items-center justify-center">
              {webcamError ? (
                <div className="p-3 text-center text-xs text-rose-300 space-y-1">
                  <AlertCircle className="w-6 h-6 text-rose-400 mx-auto" />
                  <p>{webcamError}</p>
                </div>
              ) : (
                <>
                  <video ref={webcamVideoRef} playsInline muted autoPlay className="w-full h-full object-cover" />
                  <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                    <div className="w-32 h-32 border-2 border-accent rounded-xl" />
                  </div>
                </>
              )}
            </div>
            <p className="text-xs text-slate-400 text-center">
              Hold your phone's <strong>Export QR Code</strong> up to this webcam to unlock.
            </p>
          </div>
        )}

        {/* Login Method Buttons Selector */}
        <div className="flex items-center gap-2 mt-5 pt-3 border-t border-white/10 w-full justify-center">
          <button
            type="button"
            onClick={() => setLoginMethod('pin')}
            className={`p-2 rounded-xl border text-xs transition-all flex items-center gap-1.5 ${
              loginMethod === 'pin'
                ? 'bg-accent text-white border-accent shadow-sm font-semibold'
                : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
            }`}
            title="Unlock with PIN"
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>PIN</span>
          </button>

          <button
            type="button"
            onClick={() => setLoginMethod('qr-phone')}
            className={`p-2 rounded-xl border text-xs transition-all flex items-center gap-1.5 ${
              loginMethod === 'qr-phone'
                ? 'bg-accent text-white border-accent shadow-sm font-semibold'
                : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
            }`}
            title="Scan QR on screen with phone"
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>Phone QR</span>
          </button>

          <button
            type="button"
            onClick={() => setLoginMethod('webcam')}
            className={`p-2 rounded-xl border text-xs transition-all flex items-center gap-1.5 ${
              loginMethod === 'webcam'
                ? 'bg-accent text-white border-accent shadow-sm font-semibold'
                : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
            }`}
            title="Scan phone with PC webcam"
          >
            <Camera className="w-3.5 h-3.5" />
            <span>PC Webcam</span>
          </button>
        </div>
      </div>

      {/* Bottom Status Bar */}
      <div className="relative z-10 flex items-center justify-between text-xs text-slate-400 max-w-5xl mx-auto w-full pt-4">
        <div className="flex items-center gap-2">
          <Shield className="w-3.5 h-3.5 text-accent" />
          <span className="text-[11px]">HOME PC Security • Protected Session</span>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => updateSettings({ theme: settings.theme === 'dark' ? 'light' : 'dark' })}
            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-colors"
            title="Toggle theme"
          >
            {settings.theme === 'dark' ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Moon className="w-3.5 h-3.5 text-indigo-400" />}
          </button>

          {!profile.hasPin && (
            <button
              type="button"
              onClick={() => handleUnlockSuccess()}
              className="text-[11px] hover:text-white underline underline-offset-2 transition-colors"
            >
              Skip to Desktop (Guest)
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
