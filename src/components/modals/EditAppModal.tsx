import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { CATEGORIES, type DefaultCategory } from '../../types';
import { PwaDetectionService, type PwaIconCandidate } from '../../services/pwaDetectionService';
import { AppIcon } from '../common/AppIcon';
import {
  X,
  Globe,
  Upload,
  Smile,
  Pencil,
  Trash2,
  Pin,
  Star,
  Sparkles,
  Loader2,
} from 'lucide-react';

const COMMON_EMOJIS = ['🧠', '⚡', '💻', '🛠️', '🔬', '📊', '🌐', '🎮', '🎵', '📚', '🚀', '🔑', '📱', '🤖', '💡', '💰', '🛡️', '📦'];

export const EditAppModal: React.FC = () => {
  const { editingApp, setEditingApp, updateApp, deleteApp, showToast } = useApp();

  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<DefaultCategory>('Productivity');
  const [tagsInput, setTagsInput] = useState('');
  const [pinned, setPinned] = useState(false);
  const [favorite, setFavorite] = useState(false);

  // Icon options
  const [iconMode, setIconMode] = useState<'emoji' | 'url' | 'upload' | 'letter'>('letter');
  const [selectedEmoji, setSelectedEmoji] = useState('⚡');
  const [customIconUrl, setCustomIconUrl] = useState('');
  const [uploadedImageData, setUploadedImageData] = useState('');

  // PWA detection states
  const [isDetecting, setIsDetecting] = useState(false);
  const [iconCandidates, setIconCandidates] = useState<PwaIconCandidate[]>([]);
  const [detectionMessage, setDetectionMessage] = useState('');

  const [urlError, setUrlError] = useState('');
  const [nameError, setNameError] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingApp) {
      setName(editingApp.name);
      setUrl(editingApp.url);
      setDescription(editingApp.description || '');
      setCategory((editingApp.category as DefaultCategory) || 'Productivity');
      setTagsInput(editingApp.tags ? editingApp.tags.join(', ') : '');
      setPinned(editingApp.pinned);
      setFavorite(editingApp.favorite);
      setIsDetecting(false);
      setIconCandidates([]);
      setDetectionMessage('');

      if (editingApp.iconType === 'emoji') {
        setIconMode('emoji');
        setSelectedEmoji(editingApp.icon || '⚡');
      } else if (editingApp.iconType === 'image' && editingApp.icon?.startsWith('data:')) {
        setIconMode('upload');
        setUploadedImageData(editingApp.icon);
      } else if (editingApp.icon?.startsWith('http')) {
        setIconMode('url');
        setCustomIconUrl(editingApp.icon);
      } else {
        setIconMode('letter');
      }

      setUrlError('');
      setNameError('');
    }
  }, [editingApp]);

  const handleDetectPwa = async (targetUrl?: string) => {
    const rawTarget = (targetUrl !== undefined ? targetUrl : url).trim();
    if (rawTarget.length < 4) {
      showToast('Please enter a web URL first', 'warning');
      return;
    }

    setIsDetecting(true);
    setDetectionMessage('Probing PWA webmanifest & logos...');

    try {
      const res = await PwaDetectionService.detectPwa(rawTarget);
      if (res.icons.length > 0) {
        setIconCandidates(res.icons);
        if (res.bestIcon) {
          setCustomIconUrl(res.bestIcon);
          setIconMode('url');
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
        showToast('No PWA manifest icons reachable for this URL', 'info');
      }
    } catch {
      setDetectionMessage('Probe error');
      showToast('Failed to probe PWA endpoints', 'error');
    } finally {
      setIsDetecting(false);
    }
  };

  if (!editingApp) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showToast('Please select a valid image file', 'error');
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
    return { icon: undefined, iconType: 'letter' };
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

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
        setUrlError('Please enter a valid web URL');
        valid = false;
      }
    }

    if (!valid) return;

    const { icon, iconType } = getIconData();
    const tags = tagsInput
      .split(',')
      .map(t => t.trim().toLowerCase())
      .filter(t => t.length > 0);

    updateApp(editingApp.id, {
      name: name.trim(),
      url: formattedUrl,
      description: description.trim(),
      category,
      tags,
      pinned,
      favorite,
      icon,
      iconType,
    });

    setEditingApp(null);
  };

  const currentIconData = getIconData();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-150">
      <div
        className="w-full h-full sm:h-auto sm:max-h-[92vh] sm:max-w-lg rounded-none sm:rounded-3xl home-panel-window border-0 sm:border border-subtle shadow-2xl overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-subtle">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-accent/20 flex items-center justify-center">
              <Pencil className="w-4 h-4 text-accent" />
            </div>
            <div>
              <h2 className="text-base font-bold text-main">Edit Application</h2>
              <p className="text-xs text-muted">Modify properties for {editingApp.name}</p>
            </div>
          </div>
          <button
            onClick={() => setEditingApp(null)}
            className="p-1.5 rounded-xl text-muted hover:text-main hover-tile transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
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
              className={`w-full px-3.5 py-2 rounded-xl home-input text-xs sm:text-sm ${
                nameError ? 'border-rose-500 focus:ring-rose-500' : ''
              }`}
            />
            {nameError && <p className="text-[11px] text-rose-400 mt-1">{nameError}</p>}
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-main">
                Web URL <span className="text-rose-400">*</span>
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
                  onChange={e => {
                    setUrl(e.target.value);
                    setUrlError('');
                  }}
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
            </div>
            {urlError && <p className="text-[11px] text-rose-400 mt-1">{urlError}</p>}
          </div>

          <div>
            <label className="block text-xs font-semibold text-main mb-1.5">
              Description <span className="text-muted font-normal">(Optional)</span>
            </label>
            <input
              type="text"
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl home-input text-xs sm:text-sm"
            />
          </div>

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
                className="w-full px-3.5 py-2 rounded-xl home-input text-xs sm:text-sm"
              />
            </div>
          </div>

          {/* Icon Selection */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-main">
                App Icon
              </label>
              {iconMode === 'url' && customIconUrl && (
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
                    const isSelected = iconMode === 'url' && customIconUrl === cand.url;
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setCustomIconUrl(cand.url);
                          setIconMode('url');
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
                  <span className="text-xs text-emerald-500 font-medium">New image loaded</span>
                )}
              </div>
            )}
          </div>

          {/* Preview */}
          <div className="p-3.5 rounded-2xl glass-subtle border-subtle flex items-center gap-3">
            <AppIcon
              app={{
                name: name || 'App',
                category,
                icon: currentIconData.icon,
                iconType: currentIconData.iconType,
              }}
              size="md"
            />
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-bold text-main truncate">{name}</span>
              <span className="text-xs text-muted truncate">{category}</span>
            </div>
          </div>

          {/* Pinned & Favorite switches */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex items-center justify-between p-3 rounded-2xl glass-subtle border-subtle">
              <div className="flex items-center gap-2">
                <Pin className="w-4 h-4 text-accent" />
                <span className="text-xs font-semibold text-main">Pinned to HOME</span>
              </div>
              <input
                type="checkbox"
                checked={pinned}
                onChange={e => setPinned(e.target.checked)}
                className="w-4 h-4 text-accent rounded border-subtle focus:ring-accent cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-between p-3 rounded-2xl glass-subtle border-subtle">
              <div className="flex items-center gap-2">
                <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                <span className="text-xs font-semibold text-main">Favorite</span>
              </div>
              <input
                type="checkbox"
                checked={favorite}
                onChange={e => setFavorite(e.target.checked)}
                className="w-4 h-4 text-accent rounded border-subtle focus:ring-accent cursor-pointer"
              />
            </div>
          </div>
        </form>

        {/* Modal Actions */}
        <div className="flex items-center justify-between px-6 py-4 home-bottom-shelf">
          <button
            type="button"
            onClick={() => {
              if (window.confirm(`Are you sure you want to remove "${editingApp.name}" from HOME?`)) {
                deleteApp(editingApp.id);
                setEditingApp(null);
              }
            }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-rose-500 hover:bg-rose-500/10 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Remove App</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setEditingApp(null)}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-muted hover:text-main hover-tile transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              className="px-5 py-2 rounded-xl bg-accent text-white text-xs font-bold hover:bg-accent-hover transition-colors shadow-lg shadow-accent/20"
            >
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
