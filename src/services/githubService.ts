import type { DefaultCategory } from '../types';
import { AppRepository } from './appRepository';

export interface GitHubDiscoveredApp {
  id: string; // generated id for tracking
  repoId: number;
  name: string;
  repoName: string;
  url: string; // Homepage link from repository's About section
  description: string;
  category: DefaultCategory | string;
  topics: string[];
  repoUrl: string; // Direct link to github.com repo
  stars: number;
  language: string | null;
  updatedAt: string;
  isFork: boolean;
  isArchived: boolean;
  selected: boolean;
  isAlreadyInHome: boolean;
  existingAppId?: string;
  icon?: string;
}

export interface GitHubUserProfile {
  login: string;
  name: string | null;
  avatar_url: string;
  html_url: string;
  public_repos: number;
  bio: string | null;
}

export interface GitHubFetchResult {
  user: GitHubUserProfile | null;
  apps: GitHubDiscoveredApp[];
  totalReposScanned: number;
  reposWithLinksCount: number;
}

export class GitHubService {
  private static CACHE_PREFIX = 'HOME_GITHUB_REPOS_V1_';
  private static LAST_USER_KEY = 'HOME_GITHUB_LAST_USERNAME_V1';

  /**
   * Normalize and sanitize a GitHub username from input (handles @username or full profile url)
   */
  static sanitizeUsername(input: string): string {
    let clean = input.trim();
    if (!clean) return '';
    // Strip URL prefixes like https://github.com/adityasing9
    clean = clean.replace(/^(?:https?:\/\/)?(?:www\.)?github\.com\//i, '');
    // Strip leading @ or trailing slash
    clean = clean.replace(/^@+/, '').replace(/\/+$/, '').split('/')[0].trim();
    return clean;
  }

  static getLastUsername(): string {
    try {
      return localStorage.getItem(this.LAST_USER_KEY) || 'adityasing9';
    } catch {
      return 'adityasing9';
    }
  }

  static setLastUsername(username: string): void {
    try {
      localStorage.setItem(this.LAST_USER_KEY, username.trim());
    } catch {}
  }

  /**
   * Intelligently auto-categorize an application based on repository metadata
   */
  static categorizeApp(name: string, description: string, topics: string[] = []): DefaultCategory {
    const combined = `${name} ${description} ${topics.join(' ')}`.toLowerCase();

    // AI & Machine Learning
    if (
      /\b(ai|llm|rag|gpt|openai|gemini|claude|agent|neural|vision|biolens|nlp|diffusion|deep learning|machine learning|langchain|prompt)\b/i.test(
        combined
      )
    ) {
      return 'AI';
    }

    // Education & Learning
    if (
      /\b(study|learn|flashcard|quiz|exam|student|school|course|education|tutorial|notes|revision|assistant|academy)\b/i.test(
        combined
      )
    ) {
      return 'Education';
    }

    // Finance & Money
    if (
      /\b(finance|expense|splitwise|debt|money|crypto|wallet|budget|payment|settlehub|settle|bill|cost|bank|invoice)\b/i.test(
        combined
      )
    ) {
      return 'Finance';
    }

    // Games & Puzzles
    if (
      /\b(game|puzzle|arcade|chess|queen|8queen|play|cyberpunk|godot|unity|canvas|gamble|board)\b/i.test(
        combined
      )
    ) {
      return 'Games';
    }

    // Entertainment & Media
    if (
      /\b(video|music|audio|media|movie|stream|chat|social|youtube|spotify|player|gallery|meme)\b/i.test(
        combined
      )
    ) {
      return 'Entertainment';
    }

    // Utilities & Security
    if (
      /\b(tool|util|utility|qr|qr-saas|pass|hack-pass|password|auth|security|converter|calc|timer|reminder|smart-reminder|scanner|generator|cleaner|pwa)\b/i.test(
        combined
      )
    ) {
      return 'Utilities';
    }

    // Productivity & Project Management
    if (
      /\b(task|todo|kanban|flow|manager|linkmanager|organizer|track|tracker|workspace|calendar|dashboard|plan)\b/i.test(
        combined
      )
    ) {
      return 'Productivity';
    }

    return 'Development';
  }

  /**
   * Clean repository name into a polished app display title
   * e.g. "QR-SaaS-Dynamic" -> "QR SaaS Dynamic"
   * e.g. "Smart-AI-Study-Assistant" -> "Smart AI Study Assistant"
   */
  static formatAppName(repoName: string): string {
    if (!repoName) return 'App';
    // Replace dashes and underscores with spaces
    const spaced = repoName.replace(/[-_]+/g, ' ').trim();
    // Words to keep uppercase
    const UPPERCASE_WORDS = new Set(['ai', 'qr', 'pwa', 'ui', 'api', 'saas', 'pro', 'os', 'id']);

    return spaced
      .split(' ')
      .map(word => {
        const lower = word.toLowerCase();
        if (UPPERCASE_WORDS.has(lower)) {
          return lower.toUpperCase();
        }
        return word.charAt(0).toUpperCase() + word.slice(1);
      })
      .join(' ');
  }

  /**
   * Fetch all repositories for a user, extracting website links from the "About" section
   */
  static async fetchUserRepositories(
    rawUsername: string,
    forceRefresh = false
  ): Promise<GitHubFetchResult> {
    const username = this.sanitizeUsername(rawUsername);
    if (!username) {
      throw new Error('Please enter a valid GitHub username.');
    }

    this.setLastUsername(username);

    // Check localStorage cache if not forced
    const cacheKey = `${this.CACHE_PREFIX}${username.toLowerCase()}`;
    if (!forceRefresh) {
      try {
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
          const parsed = JSON.parse(cached);
          // Valid for 10 minutes
          if (Date.now() - parsed.timestamp < 10 * 60 * 1000) {
            // Re-check existing apps status in HOME
            const appsWithUpdatedHomeStatus = parsed.result.apps.map(
              (app: GitHubDiscoveredApp) => {
                const existing = AppRepository.checkDuplicateUrl(app.url);
                return {
                  ...app,
                  isAlreadyInHome: Boolean(existing),
                  existingAppId: existing?.id,
                };
              }
            );
            return {
              ...parsed.result,
              apps: appsWithUpdatedHomeStatus,
            };
          }
        }
      } catch {}
    }

    // 1. Fetch User Profile
    let userProfile: GitHubUserProfile | null = null;
    try {
      const userRes = await fetch(`https://api.github.com/users/${encodeURIComponent(username)}`, {
        headers: { Accept: 'application/vnd.github.v3+json' },
      });
      if (userRes.ok) {
        userProfile = await userRes.json();
      } else if (userRes.status === 404) {
        throw new Error(`GitHub user "${username}" was not found.`);
      } else if (userRes.status === 403) {
        throw new Error('GitHub API rate limit reached. Please wait a few minutes or try again later.');
      }
    } catch (e: any) {
      if (e.message && e.message.includes('not found')) throw e;
      if (e.message && e.message.includes('rate limit')) throw e;
      console.warn('Failed to fetch user profile:', e);
    }

    // 2. Fetch Public Repositories (support up to 3 pages = 300 repos)
    const allRepos: any[] = [];
    let page = 1;
    const maxPages = 3;

    while (page <= maxPages) {
      const reposUrl = `https://api.github.com/users/${encodeURIComponent(username)}/repos?per_page=100&page=${page}&sort=updated`;
      const reposRes = await fetch(reposUrl, {
        headers: { Accept: 'application/vnd.github.v3+json' },
      });

      if (!reposRes.ok) {
        if (reposRes.status === 403) {
          throw new Error('GitHub API rate limit reached. Please wait a few minutes and try again.');
        }
        if (reposRes.status === 404) {
          throw new Error(`GitHub user "${username}" not found.`);
        }
        break;
      }

      const pageRepos = await reposRes.json();
      if (!Array.isArray(pageRepos) || pageRepos.length === 0) {
        break;
      }

      allRepos.push(...pageRepos);
      if (pageRepos.length < 100) {
        break;
      }
      page++;
    }

    // 3. Filter repositories that have a website link in their About section (repo.homepage)
    const discoveredApps: GitHubDiscoveredApp[] = [];

    for (const repo of allRepos) {
      let rawHomepage = (repo.homepage || '').trim();
      if (!rawHomepage || rawHomepage.length < 4) {
        continue;
      }

      // Ensure proper protocol
      if (!/^https?:\/\//i.test(rawHomepage)) {
        rawHomepage = 'https://' + rawHomepage;
      }

      // Clean trailing slash
      const cleanUrl = rawHomepage.replace(/\/+$/, '');

      // Check if already in HOME
      const existing = AppRepository.checkDuplicateUrl(cleanUrl);

      const titleName = this.formatAppName(repo.name);
      const category = this.categorizeApp(repo.name, repo.description || '', repo.topics || []);

      // Standard Google favicon fallback
      const { iconUrl } = AppRepository.extractMetadataFromUrl(cleanUrl);

      discoveredApps.push({
        id: `gh-${repo.id}`,
        repoId: repo.id,
        name: titleName,
        repoName: repo.name,
        url: cleanUrl,
        description: repo.description || `Repository ${repo.name} by ${username}`,
        category,
        topics: Array.isArray(repo.topics) ? repo.topics : [],
        repoUrl: repo.html_url,
        stars: repo.stargazers_count || 0,
        language: repo.language || null,
        updatedAt: repo.updated_at,
        isFork: Boolean(repo.fork),
        isArchived: Boolean(repo.archived),
        selected: !existing, // Pre-select only new apps by default
        isAlreadyInHome: Boolean(existing),
        existingAppId: existing?.id,
        icon: iconUrl || undefined,
      });
    }

    const result: GitHubFetchResult = {
      user: userProfile,
      apps: discoveredApps,
      totalReposScanned: allRepos.length,
      reposWithLinksCount: discoveredApps.length,
    };

    // Cache to localStorage
    try {
      localStorage.setItem(
        cacheKey,
        JSON.stringify({
          timestamp: Date.now(),
          result,
        })
      );
    } catch {}

    return result;
  }
}
