import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useApp } from '../../context/AppContext';
import { QRService, type ParsedQRResult } from '../../services/qrService';
import type { AppItem } from '../../types';
import { AppIcon } from '../common/AppIcon';
import { PeerAuthService, type P2PLoginPayload, type LinkedDevice } from '../../services/peerAuthService';
import { SecurityService } from '../../services/securityService';
import {
  X,
  QrCode,
  Camera,
  Upload,
  Download,
  Copy,
  Check,
  Share2,
  RefreshCw,
  Flashlight,
  FlipHorizontal,
  AlertCircle,
  Laptop,
  Smartphone,
  CheckCircle2,
  Trash2,
} from 'lucide-react';

export const QRModal: React.FC = () => {
  const {
    isQROpen,
    setIsQROpen,
    qrInitialTab,
    qrTargetApp,
    setQRTargetApp,
    apps,
    settings,
    importAppsFromQR,
    showToast,
    refreshApps,
  } = useApp();

  const [activeTab, setActiveTab] = useState<'web-login' | 'export' | 'scan'>('web-login');

  // --- Web Login (WhatsApp Style) State ---
  const [webLoginSubTab, setWebLoginSubTab] = useState<'host-pc' | 'phone-export'>(() => {
    return typeof window !== 'undefined' && window.innerWidth < 768 ? 'phone-export' : 'host-pc';
  });
  const [pcSessionId, setPcSessionId] = useState<string | null>(null);
  const [pcQrDataUrl, setPcQrDataUrl] = useState<string>('');
  const [isPcListening, setIsPcListening] = useState<boolean>(false);
  const [staySignedIn, setStaySignedIn] = useState<boolean>(true);
  const [pcSyncStage, setPcSyncStage] = useState<'idle' | 'syncing' | 'done'>('idle');
  const [pcSyncProgress, setPcSyncProgress] = useState<number>(0);
  const [pcSyncPayload, setPcSyncPayload] = useState<P2PLoginPayload | null>(null);

  // Phone export progress state
  const [phoneExportStage, setPhoneExportStage] = useState<'idle' | 'connecting' | 'exporting' | 'synced' | 'error'>('idle');
  const [linkedDevices, setLinkedDevices] = useState<LinkedDevice[]>(() => PeerAuthService.getLinkedDevices());

  // --- Export State ---
  const [exportScope, setExportScope] = useState<'all' | 'pinned' | 'single'>('all');
  const [selectedSingleAppId, setSelectedSingleAppId] = useState<string>('');
  const [includeSettings, setIncludeSettings] = useState<boolean>(true);
  const asShareUrl = true;
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [shareUrl, setShareUrl] = useState<string>('');
  const [copiedLink, setCopiedLink] = useState<boolean>(false);
  const [payloadSize, setPayloadSize] = useState<number>(0);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);

  // --- Scan & Import State ---
  const [scanMode, setScanMode] = useState<'camera' | 'upload' | 'paste'>('camera');
  const [cameraFacing, setCameraFacing] = useState<'environment' | 'user'>('environment');
  const [hasTorch, setHasTorch] = useState<boolean>(false);
  const [torchOn, setTorchOn] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [manualText, setManualText] = useState<string>('');
  const [isDecoding, setIsDecoding] = useState<boolean>(false);

  // Scanned result for review
  const [scannedResult, setScannedResult] = useState<ParsedQRResult | null>(null);
  const [importMode, setImportMode] = useState<'merge' | 'replace'>('merge');
  const [applySettings, setApplySettings] = useState<boolean>(true);

  // Media references
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Initialize tabs when modal opens
  useEffect(() => {
    if (isQROpen) {
      setActiveTab(qrInitialTab || 'web-login');
      setScannedResult(null);
      setCameraError(null);
      setManualText('');
      setPhoneExportStage('idle');
      setLinkedDevices(PeerAuthService.getLinkedDevices());

      if (qrTargetApp) {
        setExportScope('single');
        setSelectedSingleAppId(qrTargetApp.id);
      } else {
        setExportScope('all');
        if (apps.length > 0) {
          setSelectedSingleAppId(apps[0].id);
        }
      }

      // If URL has #import= or #sync= or #pc-login=, immediately parse it
      if (typeof window !== 'undefined' && (window.location.hash.includes('#import=') || window.location.hash.includes('#sync=') || window.location.hash.includes('#pc-login='))) {
        setActiveTab('scan');
        QRService.parseScannedText(window.location.href).then(result => {
          if (result.type !== 'unknown') {
            setScannedResult(result);
            if ('vibrate' in navigator) {
              try { navigator.vibrate([30, 20, 30]); } catch {}
            }
          }
        });
      }
    } else {
      stopCamera();
    }
  }, [isQROpen, qrInitialTab, qrTargetApp, apps]);

  // Peer listening session for PC Host mode (WhatsApp Web Style)
  useEffect(() => {
    if (!isQROpen || activeTab !== 'web-login' || webLoginSubTab !== 'host-pc') {
      PeerAuthService.cleanupSession();
      setIsPcListening(false);
      return;
    }

    let isMounted = true;
    setIsPcListening(true);
    setPcSyncStage('idle');
    setPcSyncProgress(0);
    setPcSyncPayload(null);

    PeerAuthService.createLoginSession(
      async (payload) => {
        if (!isMounted) return;
        setPcSyncPayload(payload);
        setPcSyncStage('syncing');

        // Smooth progress animation simulating WhatsApp Web sync
        for (let p = 15; p <= 100; p += 15) {
          if (!isMounted) break;
          setPcSyncProgress(p);
          await new Promise(r => setTimeout(r, 110));
        }

        if ('vibrate' in navigator) {
          try { navigator.vibrate([50, 40, 50]); } catch {}
        }

        // Apply incoming login data (apps, settings, profile)
        SecurityService.applyPhoneLogin({
          userName: payload.userName,
          avatar: payload.avatar,
          apps: payload.apps,
          settings: payload.settings,
        });

        refreshApps();
        setPcSyncStage('done');
        showToast(`Synchronized ${payload.apps?.length || 0} apps from Phone!`, 'success');

        setTimeout(() => {
          if (isMounted) {
            setIsQROpen(false);
          }
        }, 1500);
      },
      (err) => {
        console.warn('PC Login session notice:', err);
      }
    ).then(async ({ sessionId }) => {
      if (!isMounted) return;
      setPcSessionId(sessionId);

      const baseUrl = typeof window !== 'undefined'
        ? `${window.location.origin}${window.location.pathname}`
        : 'https://aadityasingh.vercel.app/';

      const pairUrl = `${baseUrl}#pc-login=${encodeURIComponent(sessionId)}`;
      const darkColor = settings.theme === 'dark' ? '#0f172a' : '#090d16';
      const qrUrl = await QRService.generateQRDataUrl(pairUrl, {
        darkColor,
        lightColor: '#ffffff',
        width: 320,
      });

      if (isMounted) {
        setPcQrDataUrl(qrUrl);
      }
    }).catch(err => {
      console.error('Failed to create PC login session:', err);
    });

    return () => {
      isMounted = false;
      PeerAuthService.cleanupSession();
    };
  }, [isQROpen, activeTab, webLoginSubTab, settings.theme, refreshApps, showToast, setIsQROpen]);

  // Generate QR code when export options change
  useEffect(() => {
    if (!isQROpen || activeTab !== 'export') return;

    let targetApps: AppItem[] = [];
    if (exportScope === 'all') {
      targetApps = apps;
    } else if (exportScope === 'pinned') {
      targetApps = apps.filter(a => a.pinned);
    } else {
      const single = apps.find(a => a.id === selectedSingleAppId) || qrTargetApp || apps[0];
      targetApps = single ? [single] : [];
    }

    if (targetApps.length === 0) {
      setQrDataUrl('');
      return;
    }

    let isCancelled = false;
    setIsGenerating(true);

    QRService.encodeAppsToQR(targetApps, {
      includeSettings: exportScope !== 'single' && includeSettings,
      settings,
      asShareUrl,
    }).then(async ({ payload, shareUrl }) => {
      if (isCancelled) return;
      setShareUrl(shareUrl);
      setPayloadSize(new Blob([payload]).size);

      try {
        const darkColor = settings.theme === 'dark' ? '#0f172a' : '#090d16';
        const url = await QRService.generateQRDataUrl(payload, {
          darkColor,
          lightColor: '#ffffff',
          width: 380,
        });
        if (!isCancelled) {
          setQrDataUrl(url);
        }
      } catch (err) {
        console.error('Failed to generate QR Data URL:', err);
      } finally {
        if (!isCancelled) setIsGenerating(false);
      }
    });

    return () => {
      isCancelled = true;
    };
  }, [isQROpen, activeTab, exportScope, selectedSingleAppId, includeSettings, asShareUrl, apps, settings, qrTargetApp]);

  // Camera stream controls
  const stopCamera = useCallback(() => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        try {
          track.stop();
        } catch {}
      });
      streamRef.current = null;
    }
    setTorchOn(false);
    setHasTorch(false);
  }, []);

  const handleScanSuccess = useCallback(async (rawText: string) => {
    stopCamera();
    if ('vibrate' in navigator) {
      try { navigator.vibrate([40, 30, 40]); } catch {}
    }
    showToast('QR Code Scanned!', 'success');

    setIsDecoding(true);
    try {
      const parsed = await QRService.parseScannedText(rawText);
      setScannedResult(parsed);
    } catch {
      showToast('Could not parse scanned QR code.', 'error');
    } finally {
      setIsDecoding(false);
    }
  }, [stopCamera, showToast]);

  const startCamera = useCallback(async () => {
    stopCamera();
    setCameraError(null);

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraError('Camera access is not supported by your browser. You can upload a QR image instead.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: cameraFacing,
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      streamRef.current = stream;

      // Check torch capability
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        const capabilities = (videoTrack.getCapabilities ? videoTrack.getCapabilities() : {}) as { torch?: boolean };
        setHasTorch(Boolean(capabilities && capabilities.torch));
      }

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();

        // Start scanning loop using offscreen canvas and jsQR
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d', { willReadFrequently: true });

        const scanFrame = () => {
          if (!videoRef.current || videoRef.current.readyState !== videoRef.current.HAVE_ENOUGH_DATA) {
            animFrameRef.current = requestAnimationFrame(scanFrame);
            return;
          }

          canvas.width = videoRef.current.videoWidth;
          canvas.height = videoRef.current.videoHeight;

          if (ctx) {
            ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const detectedCode = QRService.decodeFromImageData(imageData);

            if (detectedCode) {
              handleScanSuccess(detectedCode);
              return;
            }
          }

          animFrameRef.current = requestAnimationFrame(scanFrame);
        };

        animFrameRef.current = requestAnimationFrame(scanFrame);
      }
    } catch (err: unknown) {
      console.warn('Camera stream error:', err);
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('Permission') || msg.includes('denied') || msg.includes('NotAllowedError')) {
        setCameraError('Camera permission was denied. Please allow camera permissions in your browser or upload an image below.');
      } else {
        setCameraError('Unable to access camera. You can upload an image containing a QR code instead.');
      }
    }
  }, [cameraFacing, stopCamera, handleScanSuccess]);

  // Toggle Torch/Flashlight
  const toggleTorch = async () => {
    if (!streamRef.current) return;
    const track = streamRef.current.getVideoTracks()[0];
    if (!track) return;

    try {
      const nextTorch = !torchOn;
      await (track as any).applyConstraints({
        advanced: [{ torch: nextTorch }],
      });
      setTorchOn(nextTorch);
    } catch (e) {
      console.warn('Torch toggle failed:', e);
    }
  };

  // Flip camera between front and rear
  const flipCamera = () => {
    setCameraFacing(prev => (prev === 'environment' ? 'user' : 'environment'));
  };

  // Manage camera on tab/mode change
  useEffect(() => {
    if (isQROpen && activeTab === 'scan' && scanMode === 'camera' && !scannedResult) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [isQROpen, activeTab, scanMode, cameraFacing, scannedResult, startCamera, stopCamera]);

  // Decode from uploaded image file
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsDecoding(true);
    try {
      const decodedText = await QRService.decodeFromImageFile(file);
      if (decodedText) {
        handleScanSuccess(decodedText);
      } else {
        showToast('No QR code detected in this image. Please try another image.', 'warning');
      }
    } catch {
      showToast('Error processing uploaded image.', 'error');
    } finally {
      setIsDecoding(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Decode manual text or link
  const handleManualDecode = async () => {
    if (!manualText.trim()) return;
    setIsDecoding(true);
    try {
      const parsed = await QRService.parseScannedText(manualText);
      if (parsed.type !== 'unknown') {
        setScannedResult(parsed);
        showToast('Setup parsed successfully!', 'success');
      } else {
        showToast('Invalid QR payload or unrecognized link format.', 'error');
      }
    } catch {
      showToast('Error parsing text.', 'error');
    } finally {
      setIsDecoding(false);
    }
  };

  // Confirm and commit import
  const handleConfirmImport = () => {
    if (!scannedResult || !scannedResult.apps || scannedResult.apps.length === 0) {
      showToast('No apps to import.', 'warning');
      return;
    }

    importAppsFromQR(
      scannedResult.apps,
      importMode,
      applySettings && scannedResult.settings ? scannedResult.settings : undefined
    );

    // Clean hash from URL if present
    if (typeof window !== 'undefined' && (window.location.hash.includes('#import=') || window.location.hash.includes('#sync='))) {
      window.history.replaceState(null, '', window.location.pathname);
    }

    setIsQROpen(false);
    setScannedResult(null);
  };

  const [isAuthorizingPC, setIsAuthorizingPC] = useState<boolean>(false);

  const handleAuthorizePCLogin = async () => {
    if (!scannedResult || !scannedResult.sessionId) return;
    setIsAuthorizingPC(true);
    setPhoneExportStage('connecting');
    try {
      const success = await PeerAuthService.sendLoginFromPhone(
        scannedResult.sessionId,
        {
          token: `phone_token_${Date.now()}`,
          userName: settings.userName || 'Aditya Singh',
          avatar: '👤',
          apps,
          settings,
        },
        (stage) => {
          setPhoneExportStage(stage);
        }
      );

      if (success) {
        setPhoneExportStage('synced');
        setLinkedDevices(PeerAuthService.getLinkedDevices());
        showToast('All apps & data successfully exported to PC!', 'success');
        setTimeout(() => {
          setIsQROpen(false);
          setScannedResult(null);
          setPhoneExportStage('idle');
        }, 1500);
      } else {
        setPhoneExportStage('error');
        showToast('Could not establish connection to PC. Ensure PC is on the login screen.', 'error');
      }
    } catch {
      setPhoneExportStage('error');
      showToast('Error authorizing PC login.', 'error');
    } finally {
      setIsAuthorizingPC(false);
    }
  };

  // Copy share URL to clipboard
  const handleCopyLink = () => {
    if (!shareUrl) return;
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopiedLink(true);
      showToast('Direct import link copied to clipboard!', 'success');
      setTimeout(() => setCopiedLink(false), 2000);
    });
  };

  // Download QR PNG
  const handleDownloadQR = () => {
    if (!qrDataUrl) return;
    const a = document.createElement('a');
    a.href = qrDataUrl;
    a.download = `HOME-QR-${exportScope === 'single' ? 'app' : 'setup'}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    showToast('QR Code image downloaded!', 'success');
  };

  // Native share sheet if supported
  const handleNativeShare = async () => {
    if (typeof navigator !== 'undefined' && navigator.share && shareUrl) {
      try {
        await navigator.share({
          title: 'HOME — Web App Setup',
          text: `Scan or open to import apps into HOME!`,
          url: shareUrl,
        });
      } catch {
        // User cancelled share
      }
    } else {
      handleCopyLink();
    }
  };

  if (!isQROpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className="w-full max-w-xl max-h-[92vh] flex flex-col rounded-[26px] home-panel-window border-subtle shadow-2xl backdrop-blur-2xl overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={e => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-subtle">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-accent text-white shadow-md shadow-accent/25">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-main leading-tight">
                QR Code Sync & Backup
              </h2>
              <p className="text-xs text-muted">
                Transfer and import apps across devices instantaneously
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              stopCamera();
              setIsQROpen(false);
              setQRTargetApp(null);
            }}
            className="p-1.5 rounded-xl hover-tile text-muted hover:text-main transition-colors"
            title="Close dialog (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher (Web Sync vs Export vs Scan) */}
        {!scannedResult && (
          <div className="flex p-1.5 mx-5 sm:mx-6 mt-4 rounded-xl bg-black/5 dark:bg-white/5 border border-subtle text-xs font-semibold gap-1">
            <button
              type="button"
              onClick={() => {
                setActiveTab('web-login');
                stopCamera();
              }}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg transition-all ${
                activeTab === 'web-login'
                  ? 'bg-accent text-white shadow-sm'
                  : 'text-muted hover:text-main'
              }`}
            >
              <Laptop className="w-3.5 h-3.5" />
              <span className="truncate">Link PC (Web Sync)</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('export');
                stopCamera();
              }}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg transition-all ${
                activeTab === 'export'
                  ? 'bg-accent text-white shadow-sm'
                  : 'text-muted hover:text-main'
              }`}
            >
              <QrCode className="w-3.5 h-3.5" />
              <span className="truncate">Export QR</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('scan');
              }}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg transition-all ${
                activeTab === 'scan'
                  ? 'bg-accent text-white shadow-sm'
                  : 'text-muted hover:text-main'
              }`}
            >
              <Camera className="w-3.5 h-3.5" />
              <span className="truncate">Scan / Import</span>
            </button>
          </div>
        )}

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">
          {/* ========================================================
              VIEW 1: IMPORT REVIEW (WHEN QR IS SCANNED / DECODED)
              ======================================================== */}
          {scannedResult ? (
            <div className="space-y-4 animate-in fade-in duration-200">
              {scannedResult.type === 'pc-login' ? (
                /* --- WhatsApp Web PC Login Authorization & Data Export Card --- */
                <div className="p-5 sm:p-6 rounded-3xl glass-subtle border border-emerald-500/40 bg-emerald-500/5 text-center space-y-4 animate-in zoom-in-95">
                  <div className="w-14 h-14 rounded-2xl bg-emerald-600 text-white mx-auto flex items-center justify-center shadow-xl shadow-emerald-600/30">
                    <Laptop className="w-7 h-7" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-main">Export Data to PC</h3>
                    <p className="text-xs text-muted mt-1 max-w-sm mx-auto">
                      A desktop browser is requesting to link and synchronize with your personal HOME setup.
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl glass-subtle border-subtle text-xs text-left space-y-2.5 bg-black/[0.03] dark:bg-white/[0.04]">
                    <div className="flex justify-between items-center pb-2 border-b border-subtle">
                      <span className="text-muted">Target PC Session:</span>
                      <span className="font-mono text-[11px] text-accent truncate max-w-[180px]">
                        {scannedResult.sessionId}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted">Account Profile:</span>
                      <span className="font-semibold text-main">{settings.userName || 'Aditya Singh'}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted">Applications to Export:</span>
                      <span className="font-semibold text-emerald-500 font-mono">{apps.length} apps & bookmarks</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted">Appearance & Layout:</span>
                      <span className="font-semibold text-main capitalize">{settings.theme} Theme, {settings.accentColor}</span>
                    </div>
                  </div>

                  {/* Progress or Status */}
                  {phoneExportStage !== 'idle' && (
                    <div className="p-3.5 rounded-2xl bg-black/10 dark:bg-white/10 border border-subtle text-xs space-y-2 animate-in fade-in">
                      <div className="flex items-center justify-center gap-2">
                        {phoneExportStage === 'connecting' && (
                          <>
                            <RefreshCw className="w-4 h-4 animate-spin text-accent" />
                            <span className="font-medium text-main">Connecting to PC via WebRTC...</span>
                          </>
                        )}
                        {phoneExportStage === 'exporting' && (
                          <>
                            <RefreshCw className="w-4 h-4 animate-spin text-emerald-500" />
                            <span className="font-medium text-emerald-500">Transmitting {apps.length} apps and settings...</span>
                          </>
                        )}
                        {phoneExportStage === 'synced' && (
                          <>
                            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                            <span className="font-bold text-emerald-400">Export Complete! PC is synchronized.</span>
                          </>
                        )}
                        {phoneExportStage === 'error' && (
                          <>
                            <AlertCircle className="w-4 h-4 text-rose-500" />
                            <span className="font-medium text-rose-500">Connection timed out. Retrying...</span>
                          </>
                        )}
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden">
                        <div
                          className={`h-full transition-all duration-300 ${
                            phoneExportStage === 'synced'
                              ? 'w-full bg-emerald-500'
                              : phoneExportStage === 'exporting'
                              ? 'w-3/4 bg-accent animate-pulse'
                              : 'w-1/3 bg-amber-500'
                          }`}
                        />
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setScannedResult(null)}
                      disabled={isAuthorizingPC}
                      className="flex-1 py-2.5 rounded-xl glass-subtle border-subtle text-xs text-muted hover:text-main font-semibold transition-colors disabled:opacity-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleAuthorizePCLogin}
                      disabled={isAuthorizingPC}
                      className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-600/25 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                    >
                      {isAuthorizingPC ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>Exporting...</span>
                        </>
                      ) : (
                        <>
                          <Laptop className="w-4 h-4" />
                          <span>Export Data to PC</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ) : (
                /* --- Regular App / Setup Import --- */
                <>
                  {/* Success Banner */}
                  <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400">
                    <div className="p-2 rounded-xl bg-emerald-500 text-white">
                      <Check className="w-4 h-4" />
                    </div>
                    <div className="text-xs">
                      <div className="font-bold text-sm">
                        {scannedResult.type === 'single-app'
                          ? 'Single App Found'
                          : `${scannedResult.apps?.length || 0} Apps Found in QR`}
                      </div>
                      <div className="text-muted text-[11px] mt-0.5">
                        {scannedResult.settings
                          ? 'Includes custom theme and launcher layout'
                          : 'Ready to import into your launcher'}
                      </div>
                    </div>
                  </div>

              {/* Import Mode Selection */}
              {scannedResult.apps && scannedResult.apps.length > 1 && (
                <div className="p-4 rounded-2xl glass-subtle border-subtle space-y-2.5">
                  <span className="text-xs font-bold text-main block">
                    Choose Import Strategy
                  </span>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <button
                      type="button"
                      onClick={() => setImportMode('merge')}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        importMode === 'merge'
                          ? 'border-accent bg-accent-light text-main ring-1 ring-accent font-semibold'
                          : 'border-subtle glass-subtle text-muted hover:text-main'
                      }`}
                    >
                      <div className="font-bold text-main">Merge (Keep Existing)</div>
                      <div className="text-[11px] text-muted mt-1">
                        Adds new apps and skips duplicates
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setImportMode('replace')}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        importMode === 'replace'
                          ? 'border-rose-500 bg-rose-500/10 text-rose-500 ring-1 ring-rose-500 font-semibold'
                          : 'border-subtle glass-subtle text-muted hover:text-main'
                      }`}
                    >
                      <div className="font-bold">Replace Everything</div>
                      <div className="text-[11px] text-muted mt-1">
                        Overwrites current apps with this backup
                      </div>
                    </button>
                  </div>

                  {scannedResult.settings && (
                    <label className="flex items-center gap-2 pt-2 text-xs text-main cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={applySettings}
                        onChange={e => setApplySettings(e.target.checked)}
                        className="rounded border-subtle text-accent focus:ring-accent accent-accent"
                      />
                      <span>Also apply theme and visual settings</span>
                    </label>
                  )}
                </div>
              )}

              {/* App List Preview */}
              <div className="p-4 rounded-2xl glass-subtle border-subtle space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-main">Apps Preview</span>
                  <span className="text-muted font-medium">
                    {scannedResult.apps?.length || 0} application(s)
                  </span>
                </div>

                <div className="max-h-52 overflow-y-auto divide-y divide-subtle rounded-xl border border-subtle bg-black/[0.02] dark:bg-white/[0.02]">
                  {scannedResult.apps?.map((app, idx) => (
                    <div
                      key={app.id || idx}
                      className="flex items-center gap-3 p-2.5 hover-tile transition-colors text-xs"
                    >
                      <div className="flex-shrink-0">
                        <AppIcon app={app} size="compact" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold text-main truncate">
                          {app.name}
                        </div>
                        <div className="text-[10px] text-muted truncate">
                          {app.url}
                        </div>
                      </div>
                      {app.pinned && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-accent-light text-accent flex-shrink-0">
                          Pinned
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setScannedResult(null);
                    if (scanMode === 'camera') startCamera();
                  }}
                  className="px-4 py-2 rounded-xl glass-subtle hover-tile border-subtle text-xs text-muted hover:text-main font-semibold transition-colors"
                >
                  Scan Another
                </button>

                <button
                  type="button"
                  onClick={handleConfirmImport}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-accent text-white text-xs font-bold hover:bg-accent-hover transition-all shadow-md shadow-accent/20"
                >
                  <Check className="w-4 h-4" />
                  <span>
                    Confirm & Import {scannedResult.apps?.length || 1} App(s)
                  </span>
                </button>
              </div>
            </>
          )}
        </div>
      ) : activeTab === 'web-login' ? (
        /* ========================================================
           VIEW 0: LINK PC (WHATSAPP WEB LOGIN & DATA EXPORT)
           ======================================================== */
        <div className="space-y-4">
          {/* Sub-tab Switcher: Receive on PC vs Export from Phone */}
          <div className="flex items-center justify-center p-1 rounded-2xl glass-subtle border-subtle max-w-sm mx-auto text-xs font-semibold gap-1">
            <button
              type="button"
              onClick={() => setWebLoginSubTab('host-pc')}
              className={`flex-1 py-2 px-3 rounded-xl flex items-center justify-center gap-1.5 transition-all ${
                webLoginSubTab === 'host-pc'
                  ? 'bg-accent text-white shadow-sm'
                  : 'text-muted hover:text-main'
              }`}
            >
              <Laptop className="w-3.5 h-3.5" />
              <span>Link this PC</span>
            </button>
            <button
              type="button"
              onClick={() => setWebLoginSubTab('phone-export')}
              className={`flex-1 py-2 px-3 rounded-xl flex items-center justify-center gap-1.5 transition-all ${
                webLoginSubTab === 'phone-export'
                  ? 'bg-accent text-white shadow-sm'
                  : 'text-muted hover:text-main'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>Export to PC</span>
            </button>
          </div>

          {webLoginSubTab === 'host-pc' ? (
            /* --- SUB-TAB A: HOST ON THIS PC (WHATSAPP WEB STYLE) --- */
            pcSyncStage === 'syncing' || pcSyncStage === 'done' ? (
              <div className="p-8 rounded-3xl glass-subtle border border-emerald-500/30 bg-emerald-500/5 text-center space-y-4 animate-in zoom-in-95 my-4">
                <div className="w-16 h-16 rounded-2xl bg-emerald-500 text-white mx-auto flex items-center justify-center shadow-xl shadow-emerald-500/25">
                  {pcSyncStage === 'done' ? (
                    <CheckCircle2 className="w-8 h-8 animate-in zoom-in" />
                  ) : (
                    <RefreshCw className="w-8 h-8 animate-spin" />
                  )}
                </div>

                <div>
                  <h3 className="text-base font-bold text-main">
                    {pcSyncStage === 'done' ? 'Sync Complete!' : 'Syncing Data from Phone...'}
                  </h3>
                  <p className="text-xs text-muted mt-1">
                    {pcSyncStage === 'done'
                      ? `Welcome back, ${pcSyncPayload?.userName || settings.userName || 'Aditya Singh'}!`
                      : `Importing ${pcSyncPayload?.apps?.length || 0} applications, preferences, and wallpapers...`}
                  </p>
                </div>

                {/* Progress bar */}
                <div className="max-w-md mx-auto space-y-1.5">
                  <div className="w-full h-2 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 transition-all duration-300"
                      style={{ width: `${pcSyncProgress}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] text-muted font-mono">
                    <span>Organizing launcher...</span>
                    <span>{pcSyncProgress}%</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                {/* Left: Step-by-Step Instructions */}
                <div className="space-y-4 p-2">
                  <div>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 text-[10px] font-bold uppercase tracking-wider mb-2">
                      <Laptop className="w-3 h-3" /> HOME Web
                    </span>
                    <h3 className="text-base sm:text-lg font-bold text-main">
                      Use HOME on your computer
                    </h3>
                    <p className="text-xs text-muted mt-1 leading-relaxed">
                      Scan this QR code from HOME on your mobile device to export your apps, bookmarks, and visual configuration to this PC.
                    </p>
                  </div>

                  <div className="space-y-3 text-xs">
                    <div className="flex items-start gap-2.5">
                      <span className="w-5 h-5 rounded-full bg-accent/20 text-accent font-bold text-[11px] flex items-center justify-center flex-shrink-0 mt-0.5">
                        1
                      </span>
                      <p className="text-main leading-snug">
                        Open <strong>HOME</strong> on your mobile phone.
                      </p>
                    </div>

                    <div className="flex items-start gap-2.5">
                      <span className="w-5 h-5 rounded-full bg-accent/20 text-accent font-bold text-[11px] flex items-center justify-center flex-shrink-0 mt-0.5">
                        2
                      </span>
                      <p className="text-main leading-snug">
                        Tap <strong>Link PC</strong> in the header or open <strong>QR Scanner</strong>.
                      </p>
                    </div>

                    <div className="flex items-start gap-2.5">
                      <span className="w-5 h-5 rounded-full bg-accent/20 text-accent font-bold text-[11px] flex items-center justify-center flex-shrink-0 mt-0.5">
                        3
                      </span>
                      <p className="text-main leading-snug">
                        Point your camera at this QR code and tap <strong>Export Data to PC</strong>.
                      </p>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-subtle flex items-center justify-between">
                    <label className="flex items-center gap-2 text-xs text-main cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={staySignedIn}
                        onChange={e => setStaySignedIn(e.target.checked)}
                        className="rounded border-subtle text-accent focus:ring-accent accent-accent"
                      />
                      <span className="text-[11px] text-muted">Keep me signed in on this computer</span>
                    </label>
                  </div>
                </div>

                {/* Right: Crisp QR Code Display */}
                <div className="flex flex-col items-center justify-center p-5 rounded-3xl glass-subtle border-subtle bg-black/[0.02] dark:bg-white/[0.02]">
                  {pcQrDataUrl ? (
                    <div className="p-3 rounded-2xl bg-white shadow-2xl ring-2 ring-emerald-500/40 animate-in zoom-in-95 text-center">
                      <img
                        src={pcQrDataUrl}
                        alt="WhatsApp Web Login QR"
                        className="w-48 h-48 sm:w-52 sm:h-52 object-contain rounded-xl"
                      />
                      <div className="mt-2 text-[10px] font-semibold text-slate-800">
                        Scan with HOME on phone
                      </div>
                      {pcSessionId && (
                        <div className="text-[9px] font-mono text-slate-500">
                          Session: {pcSessionId.slice(0, 10)}...
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="w-48 h-48 sm:w-52 sm:h-52 rounded-2xl border border-subtle flex flex-col items-center justify-center gap-2 text-muted">
                      <RefreshCw className="w-6 h-6 animate-spin text-accent" />
                      <span className="text-xs">Generating Pairing Code...</span>
                    </div>
                  )}

                  <div className="mt-3 flex items-center gap-2">
                    <span className={`inline-block w-2 h-2 rounded-full ${isPcListening ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
                    <span className={`text-[11px] font-medium ${isPcListening ? 'text-emerald-500' : 'text-amber-500'}`}>
                      {isPcListening ? 'Waiting for phone connection' : 'Connecting to signaling network...'}
                    </span>
                  </div>
                </div>
              </div>
            )
          ) : (
            /* --- SUB-TAB B: EXPORT FROM PHONE TO PC (LINKED DEVICES) --- */
            <div className="space-y-4">
              {/* Summary of what is exported */}
              <div className="p-4 rounded-2xl glass-subtle border-subtle space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-bold text-main">Data Package for PC</div>
                  <span className="text-[10px] text-accent font-semibold">100% Client-to-Client</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
                  <div className="p-2 rounded-xl bg-black/[0.03] dark:bg-white/[0.03] border border-subtle">
                    <div className="text-[10px] text-muted">Applications</div>
                    <div className="font-bold text-main mt-0.5 font-mono">{apps.length}</div>
                  </div>
                  <div className="p-2 rounded-xl bg-black/[0.03] dark:bg-white/[0.03] border border-subtle">
                    <div className="text-[10px] text-muted">Theme Mode</div>
                    <div className="font-bold text-main mt-0.5 capitalize">{settings.theme}</div>
                  </div>
                  <div className="p-2 rounded-xl bg-black/[0.03] dark:bg-white/[0.03] border border-subtle">
                    <div className="text-[10px] text-muted">Accent Color</div>
                    <div className="font-bold text-main mt-0.5 capitalize">{settings.accentColor}</div>
                  </div>
                  <div className="p-2 rounded-xl bg-black/[0.03] dark:bg-white/[0.03] border border-subtle">
                    <div className="text-[10px] text-muted">Profile Name</div>
                    <div className="font-bold text-main mt-0.5 truncate">{settings.userName || 'Aditya'}</div>
                  </div>
                </div>
              </div>

              {/* Primary Action Button: Link a Device */}
              <button
                type="button"
                onClick={() => {
                  setActiveTab('scan');
                  setScanMode('camera');
                }}
                className="w-full py-3.5 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/25 transition-all active:scale-[0.99]"
              >
                <Camera className="w-4 h-4" />
                <span>Link a Device (Scan PC Screen)</span>
              </button>

              {/* Linked Devices History (WhatsApp Style) */}
              <div className="p-4 rounded-2xl glass-subtle border-subtle space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-bold text-main">Linked Computers & Sessions</div>
                  {linkedDevices.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        PeerAuthService.clearLinkedDevices();
                        setLinkedDevices([]);
                        showToast('Linked devices history cleared', 'info');
                      }}
                      className="text-[10px] text-muted hover:text-rose-500 transition-colors"
                    >
                      Clear All
                    </button>
                  )}
                </div>

                {linkedDevices.length > 0 ? (
                  <div className="divide-y divide-subtle rounded-xl border border-subtle overflow-hidden">
                    {linkedDevices.map((dev) => (
                      <div key={dev.id} className="flex items-center justify-between p-3 text-xs bg-black/[0.01] dark:bg-white/[0.01]">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500">
                            <Laptop className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="font-semibold text-main">{dev.name}</div>
                            <div className="text-[10px] text-muted mt-0.5">
                              Synced {new Date(dev.linkedAt).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })} • {dev.appsCount} apps
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            PeerAuthService.removeLinkedDevice(dev.sessionId);
                            setLinkedDevices(PeerAuthService.getLinkedDevices());
                            showToast('Device removed from list', 'info');
                          }}
                          className="p-1.5 rounded-lg text-muted hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
                          title="Remove device"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-6 text-center text-xs text-muted space-y-1">
                    <Laptop className="w-6 h-6 mx-auto text-muted/40 mb-2" />
                    <p className="font-medium text-main">No computers linked yet</p>
                    <p className="text-[11px] text-muted">Tap "Link a Device" above and point your camera at the PC screen to export your data.</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      ) : activeTab === 'export' ? (
            /* ========================================================
               VIEW 2: EXPORT QR CODE
               ======================================================== */
            <div className="space-y-4">
              {/* Scope Selector */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-main block">
                  Export Selection
                </label>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => setExportScope('all')}
                    className={`py-2 px-3 rounded-xl border text-center transition-all ${
                      exportScope === 'all'
                        ? 'border-accent bg-accent-light text-accent font-bold ring-1 ring-accent'
                        : 'border-subtle glass-subtle text-muted hover:text-main'
                    }`}
                  >
                    All Apps ({apps.length})
                  </button>

                  <button
                    type="button"
                    onClick={() => setExportScope('pinned')}
                    className={`py-2 px-3 rounded-xl border text-center transition-all ${
                      exportScope === 'pinned'
                        ? 'border-accent bg-accent-light text-accent font-bold ring-1 ring-accent'
                        : 'border-subtle glass-subtle text-muted hover:text-main'
                    }`}
                  >
                    Pinned ({apps.filter(a => a.pinned).length})
                  </button>

                  <button
                    type="button"
                    onClick={() => setExportScope('single')}
                    className={`py-2 px-3 rounded-xl border text-center transition-all ${
                      exportScope === 'single'
                        ? 'border-accent bg-accent-light text-accent font-bold ring-1 ring-accent'
                        : 'border-subtle glass-subtle text-muted hover:text-main'
                    }`}
                  >
                    Single App
                  </button>
                </div>
              </div>

              {/* Single App Dropdown Picker (when scope is single) */}
              {exportScope === 'single' && (
                <div className="space-y-1">
                  <label className="text-xs text-muted block">Select App to Share:</label>
                  <select
                    value={selectedSingleAppId}
                    onChange={e => setSelectedSingleAppId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl glass-subtle border-subtle text-xs text-main bg-transparent outline-none focus:ring-1 focus:ring-accent"
                  >
                    {apps.map(a => (
                      <option key={a.id} value={a.id} className="bg-slate-900 text-white">
                        {a.name} ({a.url})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* QR Options Toggle */}
              {exportScope !== 'single' && (
                <div className="flex items-center justify-between p-3 rounded-xl glass-subtle border-subtle text-xs">
                  <div>
                    <span className="font-semibold text-main block">Include Theme & Settings</span>
                    <span className="text-[11px] text-muted">Theme, accent color, and layout styles</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={includeSettings}
                    onChange={e => setIncludeSettings(e.target.checked)}
                    className="rounded border-subtle text-accent focus:ring-accent accent-accent w-4 h-4 cursor-pointer"
                  />
                </div>
              )}

              {/* QR Code Presentation Box */}
              <div className="flex flex-col items-center justify-center p-5 rounded-3xl glass-subtle border-subtle text-center space-y-3">
                {isGenerating ? (
                  <div className="w-56 h-56 flex flex-col items-center justify-center gap-2 text-muted">
                    <RefreshCw className="w-6 h-6 animate-spin text-accent" />
                    <span className="text-xs">Generating QR Code...</span>
                  </div>
                ) : qrDataUrl ? (
                  <div className="p-3 rounded-2xl bg-white shadow-xl shadow-black/10 ring-1 ring-black/5">
                    <img
                      src={qrDataUrl}
                      alt="HOME Setup QR Code"
                      className="w-48 h-48 sm:w-56 sm:h-56 object-contain rounded-lg"
                    />
                  </div>
                ) : (
                  <div className="w-56 h-56 flex items-center justify-center text-xs text-muted">
                    No apps selected.
                  </div>
                )}

                <div className="text-center">
                  <div className="text-xs font-bold text-main">
                    Point any phone camera or scanner at this code
                  </div>
                  <div className="text-[11px] text-muted mt-0.5">
                    {payloadSize > 0 && `${payloadSize} bytes • Instant sync`}
                  </div>
                </div>

                {/* Export Action Buttons */}
                <div className="flex flex-wrap items-center justify-center gap-2 pt-1 w-full">
                  <button
                    type="button"
                    onClick={handleDownloadQR}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl glass-subtle hover-tile border-subtle text-main text-xs font-semibold transition-colors"
                  >
                    <Download className="w-3.5 h-3.5 text-muted" />
                    <span>Download PNG</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleCopyLink}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl glass-subtle hover-tile border-subtle text-main text-xs font-semibold transition-colors"
                  >
                    {copiedLink ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-500" />
                        <span className="text-emerald-500">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-muted" />
                        <span>Copy Link</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={handleNativeShare}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-accent text-white text-xs font-semibold hover:bg-accent-hover transition-colors shadow-sm"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    <span>Share Setup</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* ========================================================
               VIEW 3: SCAN / IMPORT QR CODE
               ======================================================== */
            <div className="space-y-4">
              {/* Scan Mode Selector */}
              <div className="flex gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setScanMode('camera')}
                  className={`flex-1 py-1.5 rounded-xl border text-center transition-all ${
                    scanMode === 'camera'
                      ? 'border-accent bg-accent-light text-accent font-bold ring-1 ring-accent'
                      : 'border-subtle glass-subtle text-muted hover:text-main'
                  }`}
                >
                  Live Camera
                </button>

                <button
                  type="button"
                  onClick={() => setScanMode('upload')}
                  className={`flex-1 py-1.5 rounded-xl border text-center transition-all ${
                    scanMode === 'upload'
                      ? 'border-accent bg-accent-light text-accent font-bold ring-1 ring-accent'
                      : 'border-subtle glass-subtle text-muted hover:text-main'
                  }`}
                >
                  Upload Image
                </button>

                <button
                  type="button"
                  onClick={() => setScanMode('paste')}
                  className={`flex-1 py-1.5 rounded-xl border text-center transition-all ${
                    scanMode === 'paste'
                      ? 'border-accent bg-accent-light text-accent font-bold ring-1 ring-accent'
                      : 'border-subtle glass-subtle text-muted hover:text-main'
                  }`}
                >
                  Paste Code / URL
                </button>
              </div>

              {/* Mode A: Live Camera Viewfinder */}
              {scanMode === 'camera' && (
                <div className="relative rounded-2xl overflow-hidden bg-black/90 aspect-[4/3] flex flex-col items-center justify-center border border-subtle">
                  {cameraError ? (
                    <div className="p-5 text-center max-w-xs space-y-3">
                      <AlertCircle className="w-8 h-8 text-amber-500 mx-auto" />
                      <p className="text-xs text-rose-300 font-medium leading-relaxed">
                        {cameraError}
                      </p>
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="px-3.5 py-1.5 rounded-xl bg-accent text-white text-xs font-semibold hover:bg-accent-hover transition-colors"
                      >
                        Upload QR Screenshot Instead
                      </button>
                    </div>
                  ) : (
                    <>
                      {/* Hidden Video element playing live camera stream */}
                      <video
                        ref={videoRef}
                        playsInline
                        muted
                        autoPlay
                        className="w-full h-full object-cover"
                      />

                      {/* Optical Viewfinder Target Reticle */}
                      <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                        <div className="relative w-52 h-52 sm:w-60 sm:h-60 rounded-2xl border-2 border-white/40 shadow-2xl">
                          {/* Corner Target Accents */}
                          <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-accent rounded-tl-lg" />
                          <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-accent rounded-tr-lg" />
                          <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-accent rounded-bl-lg" />
                          <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-accent rounded-br-lg" />

                          {/* Animated Laser Scanning Line */}
                          <div className="absolute left-2 right-2 h-0.5 bg-gradient-to-r from-transparent via-accent to-transparent shadow-[0_0_12px_var(--accent-color)] animate-scan-laser" />
                        </div>
                      </div>

                      {/* Camera Control Badges */}
                      <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between pointer-events-auto">
                        <span className="px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md text-[11px] font-medium text-white/90">
                          Align QR code in frame
                        </span>

                        <div className="flex gap-2">
                          {hasTorch && (
                            <button
                              type="button"
                              onClick={toggleTorch}
                              className={`p-2 rounded-xl backdrop-blur-md transition-colors ${
                                torchOn
                                  ? 'bg-amber-400 text-black'
                                  : 'bg-black/60 text-white hover:bg-black/80'
                              }`}
                              title="Toggle flashlight"
                            >
                              <Flashlight className="w-4 h-4" />
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={flipCamera}
                            className="p-2 rounded-xl bg-black/60 text-white hover:bg-black/80 backdrop-blur-md transition-colors"
                            title="Flip camera (Front / Rear)"
                          >
                            <FlipHorizontal className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Mode B: Upload Image */}
              {scanMode === 'upload' && (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="p-8 rounded-2xl border-2 border-dashed border-subtle hover:border-accent glass-subtle text-center cursor-pointer transition-all space-y-3"
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                  <div className="w-12 h-12 rounded-2xl bg-accent-light text-accent mx-auto flex items-center justify-center">
                    <Upload className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-main block">
                      Choose an image or screenshot of a QR code
                    </span>
                    <span className="text-[11px] text-muted">
                      Supports PNG, JPG, WebP, and mobile camera screenshots
                    </span>
                  </div>
                  <button
                    type="button"
                    className="px-4 py-1.5 rounded-xl bg-accent text-white text-xs font-semibold hover:bg-accent-hover transition-colors shadow-sm"
                  >
                    Select Image File...
                  </button>
                </div>
              )}

              {/* Mode C: Manual Paste */}
              {scanMode === 'paste' && (
                <div className="space-y-3 p-4 rounded-2xl glass-subtle border-subtle">
                  <span className="text-xs font-bold text-main block">
                    Paste Shared Link or QR Code String
                  </span>
                  <textarea
                    rows={4}
                    value={manualText}
                    onChange={e => setManualText(e.target.value)}
                    placeholder="Paste link (https://...#import=...) or raw encoded setup string here..."
                    className="w-full p-3 rounded-xl glass-subtle border-subtle text-xs text-main bg-transparent outline-none focus:ring-1 focus:ring-accent resize-none font-mono"
                  />
                  <button
                    type="button"
                    onClick={handleManualDecode}
                    disabled={!manualText.trim() || isDecoding}
                    className="flex items-center justify-center gap-2 w-full py-2 rounded-xl bg-accent text-white text-xs font-bold hover:bg-accent-hover disabled:opacity-50 transition-colors shadow-sm"
                  >
                    {isDecoding ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Check className="w-4 h-4" />
                    )}
                    <span>Parse & Preview Setup</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
