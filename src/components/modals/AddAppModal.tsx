import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { CATEGORIES, type DefaultCategory } from '../../types';
import { AppRepository } from '../../services/appRepository';
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
} from 'lucide-react';

const COMMON_EMOJIS = ['🧠', '⚡', '💻', '🛠️', '🔬', '📊', '🌐', '🎮', '🎵', '📚', '🚀', '🔑', '📱', '🤖', '💡', '💰', '🛡️', '📦'];

export const AddAppModal: React.FC = () => {
  const { isAddAppOpen, setIsAddAppOpen, addApp, launchApp, showToast } = useApp();

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
      setUrlError('');
      setNameError('');
      setDuplicateApp(null);
    }
  }, [isAddAppOpen]);

  // Attempt client-side metadata auto-detection when URL is typed
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

      // Metadata extraction
      const meta = AppRepository.extractMetadataFromUrl(newUrl);
      if (meta.domain) {
        if (!name.trim()) {
          setName(meta.name);
        }
        setDetectedIconUrl(meta.iconUrl);
      }
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
        className="w-full max-w-lg rounded-3xl glass-panel shadow-2xl border border-white/15 overflow-hidden flex flex-col max-h-[92vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-accent/20 flex items-center justify-center">
              <Plus className="w-4 h-4 text-accent" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100">Add Application</h2>
              <p className="text-xs text-slate-400">Register a PWA or web app to your HOME launcher</p>
            </div>
          </div>
          <button
            onClick={() => setIsAddAppOpen(false)}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-100 hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
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
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Application Web URL <span className="text-rose-400">*</span>
            </label>
            <div className="relative">
              <Globe className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={url}
                onChange={e => handleUrlChange(e.target.value)}
                placeholder="https://yourapp.com"
                className={`w-full pl-9 pr-3 py-2 rounded-xl glass-subtle text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 border ${
                  urlError ? 'border-rose-500 focus:ring-rose-500' : 'border-white/10 focus:ring-accent'
                }`}
              />
            </div>
            {urlError && <p className="text-[11px] text-rose-400 mt-1">{urlError}</p>}
          </div>

          {/* App Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
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
              className={`w-full px-3.5 py-2 rounded-xl glass-subtle text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 border ${
                nameError ? 'border-rose-500 focus:ring-rose-500' : 'border-white/10 focus:ring-accent'
              }`}
            />
            {nameError && <p className="text-[11px] text-rose-400 mt-1">{nameError}</p>}
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Description <span className="text-slate-500 font-normal">(Optional)</span>
            </label>
            <input
              type="text"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Brief summary of what this app does"
              className="w-full px-3.5 py-2 rounded-xl glass-subtle text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-accent border border-white/10"
            />
          </div>

          {/* Category & Tags Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Category
              </label>
              <select
                value={category}
                onChange={e => setCategory(e.target.value as DefaultCategory)}
                className="w-full px-3 py-2 rounded-xl glass-subtle text-xs sm:text-sm text-slate-100 border border-white/10 bg-slate-900 focus:outline-none focus:ring-1 focus:ring-accent cursor-pointer"
              >
                {CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Tags <span className="text-slate-500 font-normal">(comma-separated)</span>
              </label>
              <input
                type="text"
                value={tagsInput}
                onChange={e => setTagsInput(e.target.value)}
                placeholder="ai, dev, finance"
                className="w-full px-3.5 py-2 rounded-xl glass-subtle text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-accent border border-white/10"
              />
            </div>
          </div>

          {/* Icon Selection Tabs */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              App Icon
            </label>
            <div className="flex items-center gap-1 p-1 rounded-xl bg-white/5 border border-white/5 text-xs mb-3 overflow-x-auto">
              {detectedIconUrl && (
                <button
                  type="button"
                  onClick={() => setIconMode('detected')}
                  className={`px-2.5 py-1 rounded-lg transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                    iconMode === 'detected' ? 'bg-accent text-white font-semibold' : 'text-slate-400 hover:text-white'
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
                  iconMode === 'emoji' ? 'bg-accent text-white font-semibold' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Smile className="w-3 h-3" />
                Emoji
              </button>
              <button
                type="button"
                onClick={() => setIconMode('url')}
                className={`px-2.5 py-1 rounded-lg transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                  iconMode === 'url' ? 'bg-accent text-white font-semibold' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Globe className="w-3 h-3" />
                Icon URL
              </button>
              <button
                type="button"
                onClick={() => setIconMode('upload')}
                className={`px-2.5 py-1 rounded-lg transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                  iconMode === 'upload' ? 'bg-accent text-white font-semibold' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Upload className="w-3 h-3" />
                Upload
              </button>
              <button
                type="button"
                onClick={() => setIconMode('letter')}
                className={`px-2.5 py-1 rounded-lg transition-colors whitespace-nowrap ${
                  iconMode === 'letter' ? 'bg-accent text-white font-semibold' : 'text-slate-400 hover:text-white'
                }`}
              >
                Letter Tile
              </button>
            </div>

            {/* Mode-specific Icon Controls */}
            {iconMode === 'emoji' && (
              <div className="flex flex-wrap gap-2 p-2.5 rounded-xl glass-subtle border border-white/5">
                {COMMON_EMOJIS.map(em => (
                  <button
                    key={em}
                    type="button"
                    onClick={() => setSelectedEmoji(em)}
                    className={`w-9 h-9 rounded-xl flex items-center justify-center text-lg transition-transform ${
                      selectedEmoji === em
                        ? 'bg-accent text-white scale-110 shadow-md ring-2 ring-accent'
                        : 'bg-white/5 hover:bg-white/10'
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
                  className="w-16 px-2 py-1 rounded-xl glass-subtle text-center text-base text-slate-100 focus:outline-none focus:ring-1 focus:ring-accent border border-white/10"
                />
              </div>
            )}

            {iconMode === 'url' && (
              <input
                type="text"
                value={customIconUrl}
                onChange={e => setCustomIconUrl(e.target.value)}
                placeholder="https://example.com/logo.png"
                className="w-full px-3.5 py-2 rounded-xl glass-subtle text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-accent border border-white/10"
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
                  className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-slate-200 text-xs font-semibold border border-white/10 transition-colors"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Choose Image File...</span>
                </button>
                {uploadedImageData && (
                  <span className="text-xs text-emerald-400 font-medium">Image loaded</span>
                )}
              </div>
            )}
          </div>

          {/* Live Launcher Preview */}
          <div className="p-3.5 rounded-2xl glass-subtle border border-white/10">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-2">
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
                <span className="text-sm font-bold text-slate-100 truncate">
                  {name || 'App Name'}
                </span>
                <span className="text-xs text-slate-400 truncate">
                  {description || 'Your description will show here'}
                </span>
              </div>
            </div>
          </div>

          {/* Pin to HOME toggle */}
          <div className="flex items-center justify-between p-3 rounded-2xl glass-subtle border border-white/5">
            <div className="flex items-center gap-2.5">
              <Pin className="w-4 h-4 text-sky-400" />
              <div>
                <span className="text-xs font-semibold text-slate-200 block">
                  Pin to HOME Screen?
                </span>
                <span className="text-[11px] text-slate-400">
                  Shows in your primary centered start panel
                </span>
              </div>
            </div>
            <input
              type="checkbox"
              checked={pinToHome}
              onChange={e => setPinToHome(e.target.checked)}
              className="w-4 h-4 text-accent rounded bg-slate-900 border-white/20 focus:ring-accent cursor-pointer"
            />
          </div>
        </form>

        {/* Modal Actions */}
        <div className="flex items-center justify-end gap-2.5 px-6 py-4 border-t border-white/5 bg-slate-950/40">
          <button
            type="button"
            onClick={() => setIsAddAppOpen(false)}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-slate-200 hover:bg-white/5 transition-colors"
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
