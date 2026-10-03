import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { CATEGORIES, type DefaultCategory } from '../../types';
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-150">
      <div
        className="w-full max-w-lg rounded-3xl glass-panel shadow-2xl border border-white/15 overflow-hidden flex flex-col max-h-[92vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-accent/20 flex items-center justify-center">
              <Pencil className="w-4 h-4 text-accent" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100">Edit Application</h2>
              <p className="text-xs text-slate-400">Modify properties for {editingApp.name}</p>
            </div>
          </div>
          <button
            onClick={() => setEditingApp(null)}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-100 hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
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
              className={`w-full px-3.5 py-2 rounded-xl glass-subtle text-xs sm:text-sm text-slate-100 focus:outline-none focus:ring-1 border ${
                nameError ? 'border-rose-500 focus:ring-rose-500' : 'border-white/10 focus:ring-accent'
              }`}
            />
            {nameError && <p className="text-[11px] text-rose-400 mt-1">{nameError}</p>}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Web URL <span className="text-rose-400">*</span>
            </label>
            <div className="relative">
              <Globe className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={url}
                onChange={e => {
                  setUrl(e.target.value);
                  setUrlError('');
                }}
                className={`w-full pl-9 pr-3 py-2 rounded-xl glass-subtle text-xs sm:text-sm text-slate-100 focus:outline-none focus:ring-1 border ${
                  urlError ? 'border-rose-500 focus:ring-rose-500' : 'border-white/10 focus:ring-accent'
                }`}
              />
            </div>
            {urlError && <p className="text-[11px] text-rose-400 mt-1">{urlError}</p>}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Description
            </label>
            <input
              type="text"
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl glass-subtle text-xs sm:text-sm text-slate-100 focus:outline-none focus:ring-1 focus:ring-accent border border-white/10"
            />
          </div>

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
                Tags (comma-separated)
              </label>
              <input
                type="text"
                value={tagsInput}
                onChange={e => setTagsInput(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl glass-subtle text-xs sm:text-sm text-slate-100 focus:outline-none focus:ring-1 focus:ring-accent border border-white/10"
              />
            </div>
          </div>

          {/* Icon Selection */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              App Icon
            </label>
            <div className="flex items-center gap-1 p-1 rounded-xl bg-white/5 border border-white/5 text-xs mb-3 overflow-x-auto">
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
                  <span className="text-xs text-emerald-400 font-medium">New image loaded</span>
                )}
              </div>
            )}
          </div>

          {/* Preview */}
          <div className="p-3.5 rounded-2xl glass-subtle border border-white/10 flex items-center gap-3">
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
              <span className="text-sm font-bold text-slate-100 truncate">{name}</span>
              <span className="text-xs text-slate-400 truncate">{category}</span>
            </div>
          </div>

          {/* Pinned & Favorite switches */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex items-center justify-between p-3 rounded-2xl glass-subtle border border-white/5">
              <div className="flex items-center gap-2">
                <Pin className="w-4 h-4 text-sky-400" />
                <span className="text-xs font-semibold text-slate-200">Pinned to HOME</span>
              </div>
              <input
                type="checkbox"
                checked={pinned}
                onChange={e => setPinned(e.target.checked)}
                className="w-4 h-4 text-accent rounded bg-slate-900 border-white/20 focus:ring-accent cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-between p-3 rounded-2xl glass-subtle border border-white/5">
              <div className="flex items-center gap-2">
                <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                <span className="text-xs font-semibold text-slate-200">Favorite</span>
              </div>
              <input
                type="checkbox"
                checked={favorite}
                onChange={e => setFavorite(e.target.checked)}
                className="w-4 h-4 text-accent rounded bg-slate-900 border-white/20 focus:ring-accent cursor-pointer"
              />
            </div>
          </div>
        </form>

        {/* Modal Actions */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-white/5 bg-slate-950/40">
          <button
            type="button"
            onClick={() => {
              if (window.confirm(`Are you sure you want to remove "${editingApp.name}" from HOME?`)) {
                deleteApp(editingApp.id);
                setEditingApp(null);
              }
            }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-rose-400 hover:bg-rose-500/10 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Remove App</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setEditingApp(null)}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-slate-200 hover:bg-white/5 transition-colors"
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
