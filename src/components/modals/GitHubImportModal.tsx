import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { GitHubService, type GitHubDiscoveredApp, type GitHubUserProfile } from '../../services/githubService';
import { PwaDetectionService } from '../../services/pwaDetectionService';
import {
  X,
  Search,
  RefreshCw,
  Loader2,
  Trash2,
  ExternalLink,
  Plus,
  CheckSquare,
  Square,
  Pin,
  Globe,
  Star,
  AlertTriangle,
  FolderGit2,
} from 'lucide-react';

export const GitHubImportModal: React.FC = () => {
  const {
    isGitHubImportOpen,
    setIsGitHubImportOpen,
    apps,
    addMultipleApps,
    deleteApp,
    deleteApps,
    refreshApps,
    showToast,
  } = useApp();

  const [username, setUsername] = useState(() => GitHubService.getLastUsername());
  const [isLoading, setIsLoading] = useState(false);
  const [profile, setProfile] = useState<GitHubUserProfile | null>(null);
  const [discoveredApps, setDiscoveredApps] = useState<GitHubDiscoveredApp[]>([]);
  const [searchFilter, setSearchFilter] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'new' | 'in-home'>('all');
  const [pinToHome, setPinToHome] = useState(true);
  const [isImporting, setIsImporting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const hasFetchedInitialRef = useRef(false);

  // Sync existing in-home status whenever apps change
  useEffect(() => {
    if (!discoveredApps.length) return;
    setDiscoveredApps(prev =>
      prev.map(item => {
        const normalizedItemUrl = item.url.trim().toLowerCase().replace(/\/+$/, '');
        const existing = apps.find(
          a => a.url.trim().toLowerCase().replace(/\/+$/, '') === normalizedItemUrl
        );
        return {
          ...item,
          isAlreadyInHome: Boolean(existing),
          existingAppId: existing?.id,
        };
      })
    );
  }, [apps]);

  // Initial fetch on open if username exists and no apps loaded yet
  useEffect(() => {
    if (isGitHubImportOpen && !hasFetchedInitialRef.current) {
      hasFetchedInitialRef.current = true;
      handleFetchRepos(false);
    }
  }, [isGitHubImportOpen]);

  // Fetch repositories from GitHub
  const handleFetchRepos = async (forceRefresh = true) => {
    if (!username.trim()) {
      setErrorMessage('Please enter a GitHub username.');
      return;
    }

    setIsLoading(true);
    setErrorMessage('');

    try {
      const res = await GitHubService.fetchUserRepositories(username.trim(), forceRefresh);
      setProfile(res.user);
      setDiscoveredApps(res.apps);

      // Default select all new apps
      const newSelected = new Set<string>();
      res.apps.forEach(app => {
        if (!app.isAlreadyInHome) {
          newSelected.add(app.id);
        }
      });
      setSelectedIds(newSelected);

      if (res.apps.length === 0) {
        showToast(
          `Found ${res.totalReposScanned} repositories for @${username}, but none had a website link in their About section.`,
          'info'
        );
      } else {
        showToast(
          `Found ${res.apps.length} repositories with website links from About section!`,
          'success'
        );
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to fetch GitHub repositories.');
      showToast(err.message || 'Failed to fetch GitHub repositories', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Toggle selection for an app
  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Select all or deselect all for the currently visible list
  const toggleSelectAllVisible = () => {
    const visibleIds = filteredApps.map(a => a.id);
    const allVisibleSelected = visibleIds.every(id => selectedIds.has(id));

    setSelectedIds(prev => {
      const next = new Set(prev);
      if (allVisibleSelected) {
        visibleIds.forEach(id => next.delete(id));
      } else {
        visibleIds.forEach(id => next.add(id));
      }
      return next;
    });
  };

  // Remove single repo from discovered import list
  const handleRemoveFromList = (id: string, name: string) => {
    setDiscoveredApps(prev => prev.filter(a => a.id !== id));
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    showToast(`Removed "${name}" from import list`, 'info');
  };

  // Delete selected items from the discovered list
  const handleDeleteSelectedFromList = () => {
    const count = selectedIds.size;
    if (count === 0) return;
    setDiscoveredApps(prev => prev.filter(a => !selectedIds.has(a.id)));
    setSelectedIds(new Set());
    showToast(`Removed ${count} repositories from import list`, 'info');
  };

  // Delete single app from HOME launcher
  const handleDeleteFromHome = (existingAppId: string, name: string) => {
    deleteApp(existingAppId);
    showToast(`Deleted "${name}" from HOME`, 'info');
  };

  // Delete all selected apps that are currently in HOME
  const handleDeleteSelectedFromHome = () => {
    const inHomeAppsToDelete = discoveredApps.filter(
      a => selectedIds.has(a.id) && a.isAlreadyInHome && a.existingAppId
    );

    if (inHomeAppsToDelete.length === 0) {
      showToast('None of the selected repositories are currently in HOME.', 'info');
      return;
    }

    const idsToDelete = inHomeAppsToDelete.map(a => a.existingAppId!);
    deleteApps(idsToDelete);
    showToast(`Deleted ${idsToDelete.length} app(s) from HOME`, 'info');
  };

  // Import selected apps into HOME
  const handleImportSelected = async () => {
    const appsToImport = discoveredApps.filter(
      a => selectedIds.has(a.id) && !a.isAlreadyInHome
    );

    if (appsToImport.length === 0) {
      showToast('Please select at least one new repository link to import.', 'warning');
      return;
    }

    setIsImporting(true);

    try {
      const newAppsData = appsToImport.map(item => ({
        name: item.name,
        url: item.url,
        description: item.description,
        category: item.category,
        tags: [...item.topics, 'github'],
        pinned: pinToHome,
        favorite: false,
        icon: item.icon,
        iconType: item.icon ? ('url' as const) : ('letter' as const),
      }));

      const created = addMultipleApps(newAppsData);
      showToast(`Successfully imported ${created.length} app(s) from GitHub!`, 'success');

      // Asynchronously resolve real high-res PWA install logos for newly imported apps
      setTimeout(async () => {
        for (const app of created) {
          try {
            await PwaDetectionService.updateAppWithPwaLogo(app);
          } catch {}
        }
        refreshApps();
      }, 500);

      setIsGitHubImportOpen(false);
    } catch (err: any) {
      showToast(err.message || 'Failed to import applications', 'error');
    } finally {
      setIsImporting(false);
    }
  };

  // Filter apps
  const filteredApps = useMemo(() => {
    return discoveredApps.filter(app => {
      // Tab filter
      if (activeTab === 'new' && app.isAlreadyInHome) return false;
      if (activeTab === 'in-home' && !app.isAlreadyInHome) return false;

      // Search filter
      if (searchFilter.trim()) {
        const query = searchFilter.trim().toLowerCase();
        const matchName = app.name.toLowerCase().includes(query);
        const matchRepo = app.repoName.toLowerCase().includes(query);
        const matchUrl = app.url.toLowerCase().includes(query);
        const matchDesc = app.description.toLowerCase().includes(query);
        const matchCat = app.category.toLowerCase().includes(query);
        const matchTags = app.topics.some(t => t.toLowerCase().includes(query));
        return matchName || matchRepo || matchUrl || matchDesc || matchCat || matchTags;
      }
      return true;
    });
  }, [discoveredApps, activeTab, searchFilter]);

  const newAppsCount = discoveredApps.filter(a => !a.isAlreadyInHome).length;
  const inHomeCount = discoveredApps.filter(a => a.isAlreadyInHome).length;
  const selectedCount = selectedIds.size;
  const selectedInHomeCount = discoveredApps.filter(
    a => selectedIds.has(a.id) && a.isAlreadyInHome
  ).length;

  if (!isGitHubImportOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-150">
      <div
        className="w-full max-w-3xl rounded-3xl home-panel-window border-subtle shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-subtle">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-300/80 dark:border-slate-700/80 flex items-center justify-center text-slate-800 dark:text-white shadow-sm">
              <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-main">Import from GitHub</h2>
                <span className="px-2 py-0.5 rounded-full bg-accent/15 border border-accent/30 text-[10px] font-semibold text-accent">
                  About Links
                </span>
              </div>
              <p className="text-xs text-muted">
                Extract website URLs from the About section of all public repositories
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsGitHubImportOpen(false)}
            className="p-1.5 rounded-xl text-muted hover:text-main hover-tile transition-colors"
            title="Close (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Username Input Bar */}
        <div className="p-4 sm:p-5 border-b border-subtle bg-slate-100/50 dark:bg-slate-950/20">
          <form
            onSubmit={e => {
              e.preventDefault();
              handleFetchRepos(true);
            }}
            className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5"
          >
            <div className="relative flex-1">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted font-mono text-xs font-semibold select-none pointer-events-none">
                github.com/
              </span>
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="username (e.g. adityasing9)"
                className="home-input w-full pl-28 pr-4 py-2.5 rounded-xl text-main text-xs sm:text-sm font-medium placeholder:text-muted/60 focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all"
              />
            </div>
            <button
              type="submit"
              disabled={isLoading || !username.trim()}
              className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-accent text-white text-xs sm:text-sm font-semibold hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-accent/20 transition-all"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Scanning Repos...</span>
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4" />
                  <span>Fetch Repositories</span>
                </>
              )}
            </button>
          </form>

          {errorMessage && (
            <div className="mt-3 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-600 dark:text-red-400 flex items-center gap-2 font-medium">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Profile snippet & stats */}
          {profile && (
            <div className="mt-3 flex items-center justify-between text-xs text-muted pt-2 border-t border-subtle">
              <div className="flex items-center gap-2.5">
                <img
                  src={profile.avatar_url}
                  alt={profile.login}
                  className="w-5 h-5 rounded-full border border-subtle object-cover"
                />
                <span className="font-semibold text-main">@{profile.login}</span>
                {profile.name && <span>({profile.name})</span>}
                <span className="opacity-50">•</span>
                <span>{profile.public_repos} total repos</span>
              </div>
              <div className="flex items-center gap-1.5 text-accent font-semibold">
                <Globe className="w-3.5 h-3.5" />
                <span>{discoveredApps.length} with live About links</span>
              </div>
            </div>
          )}
        </div>

        {/* Filter & Selection Toolbar */}
        {discoveredApps.length > 0 && (
          <div className="px-5 py-3 border-b border-subtle bg-slate-100/40 dark:bg-slate-950/20 flex flex-wrap items-center justify-between gap-3">
            {/* Tabs */}
            <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-200/70 dark:bg-slate-900/60 border border-subtle text-xs">
              <button
                type="button"
                onClick={() => setActiveTab('all')}
                className={`px-3 py-1 rounded-lg font-semibold transition-all ${
                  activeTab === 'all'
                    ? 'bg-accent text-white shadow-sm'
                    : 'text-muted hover:text-main hover:bg-white/50 dark:hover:bg-white/5'
                }`}
              >
                All ({discoveredApps.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('new')}
                className={`px-3 py-1 rounded-lg font-semibold transition-all ${
                  activeTab === 'new'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-muted hover:text-main hover:bg-white/50 dark:hover:bg-white/5'
                }`}
              >
                New ({newAppsCount})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('in-home')}
                className={`px-3 py-1 rounded-lg font-semibold transition-all ${
                  activeTab === 'in-home'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-muted hover:text-main hover:bg-white/50 dark:hover:bg-white/5'
                }`}
              >
                Already in HOME ({inHomeCount})
              </button>
            </div>

            {/* Search within results */}
            <div className="relative flex-1 min-w-[180px] max-w-xs">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
              <input
                type="text"
                value={searchFilter}
                onChange={e => setSearchFilter(e.target.value)}
                placeholder="Filter apps, categories..."
                className="home-search-field home-search-input w-full pl-8 pr-3 py-1.5 rounded-lg text-xs focus:outline-none"
              />
            </div>

            {/* Quick Bulk Delete / Manage Options */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={toggleSelectAllVisible}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-subtle text-xs text-muted hover:text-main hover-tile transition-all bg-white/40 dark:bg-transparent font-medium"
                title="Select or deselect all visible apps"
              >
                {filteredApps.length > 0 && filteredApps.every(a => selectedIds.has(a.id)) ? (
                  <CheckSquare className="w-3.5 h-3.5 text-accent" />
                ) : (
                  <Square className="w-3.5 h-3.5" />
                )}
                <span>Select All</span>
              </button>

              {selectedCount > 0 && (
                <>
                  {/* Delete Selected from list */}
                  <button
                    type="button"
                    onClick={handleDeleteSelectedFromList}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-500/10 border border-rose-500/30 text-xs text-rose-400 hover:bg-rose-500/20 transition-all"
                    title="Remove selected repositories from import list"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete from List ({selectedCount})</span>
                  </button>

                  {/* Delete Selected from HOME if any are in HOME */}
                  {selectedInHomeCount > 0 && (
                    <button
                      type="button"
                      onClick={handleDeleteSelectedFromHome}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-red-600 text-white text-xs font-semibold hover:bg-red-500 transition-all shadow-sm"
                      title="Permanently remove selected apps from HOME launcher"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete from HOME ({selectedInHomeCount})</span>
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        )}

        {/* Repositories List */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-2.5">
          {isLoading ? (
            <div className="py-16 flex flex-col items-center justify-center gap-3 text-muted">
              <Loader2 className="w-8 h-8 animate-spin text-accent" />
              <p className="text-sm font-medium text-main">Fetching repositories for @{username}...</p>
              <p className="text-xs">Inspecting About sections and extracting live website links</p>
            </div>
          ) : discoveredApps.length === 0 ? (
            <div className="py-16 text-center text-muted space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-subtle mx-auto flex items-center justify-center shadow-sm">
                <FolderGit2 className="w-6 h-6 text-muted" />
              </div>
              <p className="text-sm font-semibold text-main">No repository links found</p>
              <p className="text-xs max-w-sm mx-auto">
                Enter any public GitHub username above to discover all repositories that have a website URL in their About section.
              </p>
            </div>
          ) : filteredApps.length === 0 ? (
            <div className="py-12 text-center text-muted text-xs">
              No repositories match your current filter.
            </div>
          ) : (
            filteredApps.map(app => {
              const isSelected = selectedIds.has(app.id);

              return (
                <div
                  key={app.id}
                  className={`group p-3.5 rounded-2xl border transition-all flex items-start gap-3.5 ${
                    isSelected
                      ? 'bg-accent/5 border-accent/40 shadow-sm'
                      : 'glass-subtle border-subtle hover:border-accent/40'
                  }`}
                >
                  {/* Selection Checkbox */}
                  <button
                    type="button"
                    onClick={() => toggleSelect(app.id)}
                    className="mt-1 text-muted hover:text-accent transition-colors flex-shrink-0"
                    title={isSelected ? 'Deselect' : 'Select'}
                  >
                    {isSelected ? (
                      <CheckSquare className="w-4 h-4 text-accent" />
                    ) : (
                      <Square className="w-4 h-4 text-slate-400 dark:text-muted/60" />
                    )}
                  </button>

                  {/* App Icon or Initials */}
                  <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-subtle/80 flex items-center justify-center flex-shrink-0 overflow-hidden shadow-sm">
                    {app.icon ? (
                      <img
                        src={app.icon}
                        alt={app.name}
                        className="w-full h-full object-cover"
                        onError={e => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <span className="text-sm font-bold text-accent">
                        {app.name.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>

                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-sm font-bold text-main tracking-tight truncate">
                        {app.name}
                      </h4>

                      {/* Status Badge */}
                      {app.isAlreadyInHome ? (
                        <span className="px-2 py-0.5 rounded-md bg-blue-500/15 border border-blue-500/30 text-[10px] font-semibold text-blue-600 dark:text-blue-400">
                          In HOME
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-md bg-emerald-500/15 border border-emerald-500/30 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                          New
                        </span>
                      )}

                      {/* Category Badge */}
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-subtle text-[10px] font-medium text-slate-700 dark:text-slate-300">
                        {app.category}
                      </span>

                      {/* Stars */}
                      {app.stars > 0 && (
                        <span className="flex items-center gap-1 text-[11px] text-amber-500 dark:text-amber-400 font-semibold">
                          <Star className="w-3 h-3 fill-amber-400 text-amber-500" />
                          <span>{app.stars}</span>
                        </span>
                      )}
                    </div>

                    {/* About Section Website URL */}
                    <div className="flex items-center gap-2 mt-1">
                      <a
                        href={app.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-accent hover:underline flex items-center gap-1 truncate max-w-md font-mono font-medium"
                        title="Open website link"
                      >
                        <Globe className="w-3 h-3 flex-shrink-0" />
                        <span className="truncate">{app.url}</span>
                        <ExternalLink className="w-2.5 h-2.5 flex-shrink-0 opacity-70" />
                      </a>

                      <span className="text-muted/40">•</span>

                      {/* GitHub Repo Link */}
                      <a
                        href={app.repoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[11px] text-muted hover:text-main truncate"
                        title="View repository on GitHub"
                      >
                        github.com/{app.repoName}
                      </a>
                    </div>

                    {/* Description */}
                    {app.description && (
                      <p className="text-xs text-muted mt-1 line-clamp-2 leading-relaxed font-normal">
                        {app.description}
                      </p>
                    )}

                    {/* Topics */}
                    {app.topics.length > 0 && (
                      <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                        {app.topics.slice(0, 5).map(topic => (
                          <span
                            key={topic}
                            className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800/60 border border-slate-200/80 dark:border-transparent text-[10px] text-slate-600 dark:text-slate-400 font-mono"
                          >
                            #{topic}
                          </span>
                        ))}
                        {app.topics.length > 5 && (
                          <span className="text-[10px] text-muted">
                            +{app.topics.length - 5}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Actions / Delete Buttons */}
                  <div className="flex items-center gap-1.5 flex-shrink-0 self-center">
                    {/* Delete from HOME (if already exists) */}
                    {app.isAlreadyInHome && app.existingAppId && (
                      <button
                        type="button"
                        onClick={() => handleDeleteFromHome(app.existingAppId!, app.name)}
                        className="px-2.5 py-1.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 hover:bg-rose-500/20 text-xs font-semibold transition-all flex items-center gap-1"
                        title="Delete this app from HOME launcher"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Delete from HOME</span>
                      </button>
                    )}

                    {/* Delete / Exclude from import list */}
                    <button
                      type="button"
                      onClick={() => handleRemoveFromList(app.id, app.name)}
                      className="p-1.5 rounded-xl text-slate-400 dark:text-muted hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
                      title="Remove from import list"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer Actions */}
        {discoveredApps.length > 0 && (
          <div className="px-6 py-4 border-t border-subtle bg-slate-100/50 dark:bg-slate-950/20 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-xs text-main cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={pinToHome}
                  onChange={e => setPinToHome(e.target.checked)}
                  className="rounded border-subtle text-accent focus:ring-accent"
                />
                <Pin className="w-3.5 h-3.5 text-accent" />
                <span>Pin newly imported apps to HOME</span>
              </label>

              <span className="text-xs text-muted">
                {selectedCount} of {discoveredApps.length} selected
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsGitHubImportOpen(false)}
                className="px-4 py-2 rounded-xl border border-subtle text-xs font-semibold text-muted hover:text-main hover-tile transition-colors"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={isImporting || selectedCount === 0}
                onClick={handleImportSelected}
                className="flex items-center justify-center gap-2 px-5 py-2 rounded-xl bg-accent text-white text-xs sm:text-sm font-semibold hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-accent/20 transition-all"
              >
                {isImporting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Importing...</span>
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    <span>Import Selected ({selectedCount})</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
