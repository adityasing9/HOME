import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { CATEGORIES, type DefaultCategory } from '../../types';
import { AppRepository } from '../../services/appRepository';
import { PwaDetectionService, type PwaIconCandidate } from '../../services/pwaDetectionService';
import { AppIcon } from '../common/AppIcon';
import {
  X,
  Plus,
  Globe,
  Sparkles,
  Upload,
  Smile,
  AlertTriangle,
  Pin,
  ExternalLink,
  Loader2,
  QrCode,
} from 'lucide-react';

const COMMON_EMOJIS = ['🧠', '⚡', '💻', '🛠️', '🔬', '📊', '🌐', '🎮', '🎵', '📚', '🚀', '🔑', '📱', '🤖', '💡', '💰', '🛡️', '📦'];

export const AddAppModal: React.FC = () => {
  const { isAddAppOpen, setIsAddAppOpen, setIsGitHubImportOpen, openQRModal, addApp, launchApp, showToast } = useApp();

  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<DefaultCategory>('Productivity');
  const [tagsInput, setTagsInput] = useState('');
  const [pinToHome, setPinToHome] = useState(true);

  // Icon options
  const [iconMode, setIconMode] = useState<'detected' | 'emoji' | 'url' | 'upload' | 'letter'>('detected');
  const [detectedIconUrl, setDetectedIconUrl] = useState('');
  const [selectedEmoji, setSelectedEmoji] = useState('⚡');
  const [customIconUrl, setCustomIconUrl] = useState('');
  const [uploadedImageData, setUploadedImageData] = useState('');

  // PWA Auto-Detection states
  const [isDetecting, setIsDetecting] = useState(false);
  const [iconCandidates, setIconCandidates] = useState<PwaIconCandidate[]>([]);
  const [detectionMessage, setDetectionMessage] = useState('');
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Validation & Duplicate states
  const [urlError, setUrlError] = useState('');
  const [nameError, setNameError] = useState('');
  const [duplicateApp, setDuplicateApp] = useState<{ id: string; name: string } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reset form when modal opens
  useEffect(() => {
    if (isAddAppOpen) {
      setName('');
      setUrl('');
      setDescription('');
      setCategory('Productivity');
      setTagsInput('');
      setPinToHome(true);
      setIconMode('detected');
      setDetectedIconUrl('');
      setSelectedEmoji('⚡');
      setCustomIconUrl('');
      setUploadedImageData('');
      setIsDetecting(false);
      setIconCandidates([]);
      setDetectionMessage('');
      setUrlError('');
      setNameError('');
      setDuplicateApp(null);
    }
  }, [isAddAppOpen]);

  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, []);

  // Perform active client-side PWA detection
  const handleDetectPwa = async (targetUrl?: string) => {
    const rawTarget = (targetUrl !== undefined ? targetUrl : url).trim();
    if (rawTarget.length < 4) {
      showToast('Please enter a web URL first', 'warning');
      return;
    }

    setIsDetecting(true);
    setDetectionMessage('Probing PWA webmanifest & icons...');

    try {
      const res = await PwaDetectionService.detectPwa(rawTarget);

      // Auto-populate name if empty or generic
      if (res.name && (!name.trim() || name === 'App')) {
        setName(res.name);
      }

      // Auto-populate description if empty
      if (res.description && !description.trim()) {
        setDescription(res.description);
      }

      if (res.icons.length > 0) {
        setIconCandidates(res.icons);
        if (res.bestIcon) {
          setDetectedIconUrl(res.bestIcon);
          setIconMode('detected');
        }
        if (res.isActualInstallLogo) {
          setDetectionMessage('⚡ Official PWA install logo fetched');
          showToast('Fetched actual PWA install logo from manifest!', 'success');
        } else {
          setDetectionMessage(`Found ${res.icons.length} PWA icon(s)`);
          showToast(`Discovered ${res.icons.length} PWA logo option(s)!`, 'success');
        }
      } else {
        setDetectionMessage('No PWA icons reachable');
        showToast('No PWA manifest icons reachable. You can pick an emoji or upload an image.', 'info');
      }
    } catch {
      setDetectionMessage('Probe error');
      showToast('Failed to probe PWA endpoints', 'error');
    } finally {
      setIsDetecting(false);
    }
  };

  // Client-side metadata auto-detection when URL is typed
  const handleUrlChange = (newUrl: string) => {
    setUrl(newUrl);
    setUrlError('');
    setDuplicateApp(null);

    if (newUrl.trim().length > 3) {
      // Check duplicate
      const duplicate = AppRepository.checkDuplicateUrl(newUrl);
      if (duplicate) {
        setDuplicateApp({ id: duplicate.id, name: duplicate.name });
      }

      // Quick fallback metadata
      const meta = AppRepository.extractMetadataFromUrl(newUrl);
      if (meta.domain && !name.trim()) {
        setName(meta.name);
      }

      // Debounce PWA detection (650ms)
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      debounceTimerRef.current = setTimeout(() => {
        if (newUrl.trim().length > 7 && (newUrl.includes('.') || newUrl.includes('localhost'))) {
          handleDetectPwa(newUrl);
        }
      }, 650);
    }
  };

  // Image file upload handler
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showToast('Please select a valid image file (PNG, JPG, SVG, WebP)', 'error');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      showToast('Image file should be under 2MB for local storage', 'warning');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setUploadedImageData(reader.result);
        setIconMode('upload');
      }
    };
    reader.readAsDataURL(file);
  };

  // Resolve current preview icon and iconType
  const getIconData = (): { icon?: string; iconType: 'letter' | 'emoji' | 'url' | 'image' } => {
    if (iconMode === 'upload' && uploadedImageData) {
      return { icon: uploadedImageData, iconType: 'image' };
    }
    if (iconMode === 'url' && customIconUrl.trim()) {
      return { icon: customIconUrl.trim(), iconType: 'url' };
    }
    if (iconMode === 'emoji') {
      return { icon: selectedEmoji, iconType: 'emoji' };
    }
    if (iconMode === 'detected' && detectedIconUrl) {
      return { icon: detectedIconUrl, iconType: 'url' };
    }
    return { icon: undefined, iconType: 'letter' };
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    let valid = true;
    if (!name.trim()) {
      setNameError('App name is required');
      valid = false;
    }

    let formattedUrl = url.trim();
    if (!formattedUrl) {
      setUrlError('Web URL is required');
      valid = false;
    } else {
      if (!/^https?:\/\//i.test(formattedUrl)) {
        formattedUrl = 'https://' + formattedUrl;
      }
      try {
        new URL(formattedUrl);
      } catch {
        setUrlError('Please enter a valid web URL (e.g. https://example.com)');
        valid = false;
      }
    }

    if (!valid) return;

    // Duplicate check
    const existing = AppRepository.checkDuplicateUrl(formattedUrl);
    if (existing) {
      setDuplicateApp({ id: existing.id, name: existing.name });
      return;
    }

    const { icon, iconType } = getIconData();
    const tags = tagsInput
      .split(',')
      .map(t => t.trim().toLowerCase())
      .filter(t => t.length > 0);

    addApp({
      name: name.trim(),
      url: formattedUrl,
      description: description.trim(),
      category,
      tags,
      pinned: pinToHome,
      favorite: false,
      icon,
      iconType,
    });

    setIsAddAppOpen(false);
  };

  if (!isAddAppOpen) return null;

  const currentIconData = getIconData();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-150">
      <div
        className="w-full max-w-lg rounded-3xl home-panel-window border-subtle shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-subtle">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-accent/20 flex items-center justify-center">
              <Plus className="w-4 h-4 text-accent" />
            </div>
            <div>
              <h2 className="text-base font-bold text-main">Add Application</h2>
              <p className="text-xs text-muted">Register a PWA or web app to your HOME launcher</p>
            </div>
          </div>
          <button
            onClick={() => setIsAddAppOpen(false)}
            className="p-1.5 rounded-xl text-muted hover:text-main hover-tile transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Quick GitHub Import Callout */}
          <div className="p-3 rounded-2xl glass-subtle border-subtle flex items-center justify-between gap-3 bg-slate-100/60 dark:bg-slate-900/40">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-7 h-7 rounded-lg bg-slate-200 dark:bg-slate-900 border border-slate-300 dark:border-slate-700/80 flex items-center justify-center text-slate-800 dark:text-white flex-shrink-0">
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                  <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
                </svg>
              </div>
              <div className="truncate">
                <p className="text-xs font-semibold text-main truncate">Have GitHub repositories?</p>
                <p className="text-[11px] text-muted truncate">Extract live website links from repository About sections</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setIsAddAppOpen(false);
                setIsGitHubImportOpen(true);
              }}
              className="px-3 py-1.5 rounded-xl bg-accent/20 border border-accent/40 text-accent hover:bg-accent hover:text-white text-xs font-semibold transition-all flex-shrink-0"
            >
              Import from GitHub
            </button>
          </div>
          {/* Duplicate Warning */}
          {duplicateApp && (
            <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-amber-200">
                  This app is already registered in HOME
                </p>
                <p className="text-xs text-amber-300/80 mt-0.5">
                  An application named "{duplicateApp.name}" already uses this URL.
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <button
                    type="button"
                    onClick={() => {
                      const app = AppRepository.getApps().find(a => a.id === duplicateApp.id);
                      if (app) launchApp(app);
                      setIsAddAppOpen(false);
                    }}
                    className="flex items-center gap-1 px-3 py-1 rounded-lg bg-amber-500 text-slate-950 text-xs font-bold hover:bg-amber-400 transition-colors"
                  >
                    <ExternalLink className="w-3 h-3" />
                    Open Existing
                  </button>
                  <button
                    type="button"
                    onClick={() => setDuplicateApp(null)}
                    className="px-3 py-1 rounded-lg bg-white/10 text-slate-200 text-xs hover:bg-white/20 transition-colors"
                  >
                    Change URL
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* URL Input with Auto-detection */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-main">
                Application Web URL <span className="text-rose-400">*</span>
              </label>
              {detectionMessage && (
                <span className="text-[11px] text-accent font-medium truncate max-w-[210px]">
                  {detectionMessage}
                </span>
              )}
            </div>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Globe className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                <input
                  type="text"
                  value={url}
                  onChange={e => handleUrlChange(e.target.value)}
                  placeholder="https://yourapp.com or app.vercel.app"
                  className={`w-full pl-9 pr-3 py-2 rounded-xl home-input text-xs sm:text-sm ${
                    urlError ? 'border-rose-500 focus:ring-rose-500' : ''
                  }`}
                />
              </div>
              <button
                type="button"
                onClick={() => handleDetectPwa()}
                disabled={isDetecting || !url.trim()}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-accent text-white hover:bg-accent-hover font-semibold text-xs transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap flex-shrink-0"
                title="Fetch PWA manifest & logo"
              >
                {isDetecting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span className="hidden sm:inline">Detecting...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Fetch Logo</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsAddAppOpen(false);
                  openQRModal('scan');
                }}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl glass-subtle border-subtle text-muted hover:text-main hover-tile font-semibold text-xs transition-colors flex-shrink-0"
                title="Scan app URL from a QR code"
              >
                <QrCode className="w-3.5 h-3.5 text-accent" />
                <span className="hidden sm:inline">Scan QR</span>
              </button>
            </div>
            {urlError && <p className="text-[11px] text-rose-400 mt-1">{urlError}</p>}
          </div>

          {/* App Name */}
          <div>
            <label className="block text-xs font-semibold text-main mb-1.5">
              App Name <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={e => {
                setName(e.target.value);
                setNameError('');
              }}
              placeholder="e.g. StudyAI, Jira, Notion"
              className={`w-full px-3.5 py-2 rounded-xl home-input text-xs sm:text-sm ${
                nameError ? 'border-rose-500 focus:ring-rose-500' : ''
              }`}
            />
            {nameError && <p className="text-[11px] text-rose-400 mt-1">{nameError}</p>}
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-main mb-1.5">
              Description <span className="text-muted font-normal">(Optional)</span>
            </label>
            <input
              type="text"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Brief summary of what this app does"
              className="w-full px-3.5 py-2 rounded-xl home-input text-xs sm:text-sm"
            />
          </div>

          {/* Category & Tags Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-main mb-1.5">
                Category
              </label>
              <select
                value={category}
                onChange={e => setCategory(e.target.value as DefaultCategory)}
                className="w-full px-3 py-2 rounded-xl home-input text-xs sm:text-sm cursor-pointer"
              >
                {CATEGORIES.map(cat => (
                  <option key={cat} value={cat} className="bg-white text-slate-900 dark:bg-slate-900 dark:text-slate-100">
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-main mb-1.5">
                Tags <span className="text-muted font-normal">(comma-separated)</span>
              </label>
              <input
                type="text"
                value={tagsInput}
                onChange={e => setTagsInput(e.target.value)}
                placeholder="ai, dev, finance"
                className="w-full px-3.5 py-2 rounded-xl home-input text-xs sm:text-sm"
              />
            </div>
          </div>

          {/* Icon Selection Tabs */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-main">
                App Icon
              </label>
              {iconMode === 'detected' && detectedIconUrl && (
                <span className="text-[11px] text-emerald-400 font-medium flex items-center gap-1">
                  ✓ High-res PWA icon selected
                </span>
              )}
            </div>

            {/* Candidate Icons Picker */}
            {iconCandidates.length > 0 && (
              <div className="p-3 rounded-2xl glass-subtle border-subtle mb-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-semibold text-accent flex items-center gap-1.5">
                    <Sparkles className="w-3 h-3" />
                    {iconCandidates.length} Detected PWA Icon{iconCandidates.length > 1 ? 's' : ''}
                  </span>
                  <span className="text-[10px] text-muted">Click to select</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {iconCandidates.map((cand, idx) => {
                    const isSelected = iconMode === 'detected' && detectedIconUrl === cand.url;
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setDetectedIconUrl(cand.url);
                          setIconMode('detected');
                        }}
                        className={`flex items-center gap-2 p-1.5 pr-2.5 rounded-xl border text-xs transition-all ${
                          isSelected
                            ? 'bg-accent/20 border-accent text-main font-semibold shadow-sm ring-1 ring-accent'
                            : 'glass-subtle border-subtle text-muted hover:text-main'
                        }`}
                      >
                        <div className="w-7 h-7 rounded-lg bg-transparent overflow-hidden flex items-center justify-center flex-shrink-0">
                          <img
                            src={cand.url}
                            alt={cand.label}
                            className="w-full h-full object-cover rounded-lg"
                            loading="lazy"
                          />
                        </div>
                        <div className="text-left">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[11px] leading-tight truncate max-w-[130px] font-medium">{cand.label}</span>
                            {cand.isInstallLogo && (
                              <span className="px-1 py-0.2 rounded text-[8px] bg-emerald-500/20 text-emerald-400 font-bold uppercase tracking-wider">
                                Install Logo
                              </span>
                            )}
                          </div>
                          {cand.sizes && <div className="text-[9px] text-muted">{cand.sizes}</div>}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="flex items-center gap-1 p-1 rounded-xl glass-subtle border-subtle text-xs mb-3 overflow-x-auto">
              {detectedIconUrl && (
                <button
                  type="button"
                  onClick={() => setIconMode('detected')}
                  className={`px-2.5 py-1 rounded-lg transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                    iconMode === 'detected' ? 'bg-accent text-white font-semibold' : 'text-muted hover:text-main'
                  }`}
                >
                  <Sparkles className="w-3 h-3" />
                  Auto-detected
                </button>
              )}
              <button
                type="button"
                onClick={() => setIconMode('emoji')}
                className={`px-2.5 py-1 rounded-lg transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                  iconMode === 'emoji' ? 'bg-accent text-white font-semibold' : 'text-muted hover:text-main'
                }`}
              >
                <Smile className="w-3 h-3" />
                Emoji
              </button>
              <button
                type="button"
                onClick={() => setIconMode('url')}
                className={`px-2.5 py-1 rounded-lg transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                  iconMode === 'url' ? 'bg-accent text-white font-semibold' : 'text-muted hover:text-main'
                }`}
              >
                <Globe className="w-3 h-3" />
                Icon URL
              </button>
              <button
                type="button"
                onClick={() => setIconMode('upload')}
                className={`px-2.5 py-1 rounded-lg transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                  iconMode === 'upload' ? 'bg-accent text-white font-semibold' : 'text-muted hover:text-main'
                }`}
              >
                <Upload className="w-3.5 h-3.5" />
                Upload
              </button>
              <button
                type="button"
                onClick={() => setIconMode('letter')}
                className={`px-2.5 py-1 rounded-lg transition-colors whitespace-nowrap ${
                  iconMode === 'letter' ? 'bg-accent text-white font-semibold' : 'text-muted hover:text-main'
                }`}
              >
                Letter Tile
              </button>
            </div>

            {/* Mode-specific Icon Controls */}
            {iconMode === 'emoji' && (
              <div className="flex flex-wrap gap-2 p-2.5 rounded-xl glass-subtle border-subtle">
                {COMMON_EMOJIS.map(em => (
                  <button
                    key={em}
                    type="button"
                    onClick={() => setSelectedEmoji(em)}
                    className={`w-9 h-9 rounded-xl flex items-center justify-center text-lg transition-transform ${
                      selectedEmoji === em
                        ? 'bg-accent text-white scale-110 shadow-md ring-2 ring-accent'
                        : 'bg-black/5 dark:bg-white/5 hover-tile'
                    }`}
                  >
                    {em}
                  </button>
                ))}
                <input
                  type="text"
                  maxLength={4}
                  value={selectedEmoji}
                  onChange={e => setSelectedEmoji(e.target.value)}
                  placeholder="Custom"
                  className="w-16 px-2 py-1 rounded-xl home-input text-center text-base font-medium"
                />
              </div>
            )}

            {iconMode === 'url' && (
              <input
                type="text"
                value={customIconUrl}
                onChange={e => setCustomIconUrl(e.target.value)}
                placeholder="https://example.com/logo.png"
                className="w-full px-3.5 py-2 rounded-xl home-input text-xs sm:text-sm"
              />
            )}

            {iconMode === 'upload' && (
              <div className="flex items-center gap-3">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-2 px-3.5 py-2 rounded-xl glass-subtle hover-tile text-main text-xs font-semibold border-subtle transition-colors"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Choose Image File...</span>
                </button>
                {uploadedImageData && (
                  <span className="text-xs text-emerald-500 font-medium">Image loaded</span>
                )}
              </div>
            )}
          </div>

          {/* Live Launcher Preview */}
          <div className="p-3.5 rounded-2xl glass-subtle border-subtle">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted block mb-2">
              Launcher Preview
            </span>
            <div className="flex items-center gap-3">
              <AppIcon
                app={{
                  name: name || 'App Name',
                  category,
                  icon: currentIconData.icon,
                  iconType: currentIconData.iconType,
                }}
                size="md"
              />
              <div className="flex flex-col min-w-0">
                <span className="text-sm font-bold text-main truncate">
                  {name || 'App Name'}
                </span>
                <span className="text-xs text-muted truncate">
                  {description || 'Your description will show here'}
                </span>
              </div>
            </div>
          </div>

          {/* Pin to HOME toggle */}
          <div className="flex items-center justify-between p-3 rounded-2xl glass-subtle border-subtle">
            <div className="flex items-center gap-2.5">
              <Pin className="w-4 h-4 text-accent" />
              <div>
                <span className="text-xs font-semibold text-main block">
                  Pin to HOME Screen?
                </span>
                <span className="text-[11px] text-muted">
                  Shows in your primary centered start panel
                </span>
              </div>
            </div>
            <input
              type="checkbox"
              checked={pinToHome}
              onChange={e => setPinToHome(e.target.checked)}
              className="w-4 h-4 text-accent rounded border-subtle focus:ring-accent cursor-pointer"
            />
          </div>
        </form>

        {/* Modal Actions */}
        <div className="flex items-center justify-end gap-2.5 px-6 py-4 home-bottom-shelf">
          <button
            type="button"
            onClick={() => setIsAddAppOpen(false)}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-muted hover:text-main hover-tile transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-accent text-white text-xs font-bold hover:bg-accent-hover transition-colors shadow-lg shadow-accent/20"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add to HOME</span>
          </button>
        </div>
      </div>
    </div>
  );
};
