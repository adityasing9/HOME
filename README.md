# HOME

> **"Everything starts here."**  
> *One home for all your apps.*

[![Live Demo](https://img.shields.io/badge/Live%20Demo-home--rose--xi.vercel.app-blue?style=for-the-badge&logo=vercel)](https://home-rose-xi.vercel.app)
[![GitHub Repository](https://img.shields.io/badge/GitHub-adityasing9%2FHOME-black?style=for-the-badge&logo=github)](https://github.com/adityasing9/HOME)

A personal Progressive Web App (PWA), web app launcher, and lightweight personal web operating system.

---

## 🌟 Overview

**HOME** transforms your browser into a focused, personal home screen for accessing multiple PWAs and web applications from one place. Inspired by the clean structural patterns of modern operating system launchers (such as centered start panels, instant search, pinned apps grid, and local activity tracking), HOME has its own unique visual identity and operates on a strict **local-first** principle.

### Key Philosophy
- 🔒 **Zero Backend / No Database**: 100% client-side. No remote accounts, no cloud database, no tracking cookies, and no telemetry.
- ⚡ **Instantaneous**: Built with React, Vite, and Tailwind CSS.
- 📴 **Offline Shell**: Fully installable as a standalone PWA on desktop and mobile devices.
- 📦 **Vercel & Static Host Compatible**: Deploys as a pure static web app.

---

## ✨ Features

### 1. Centered OS Launcher
- Refined Start-panel architecture with glassmorphism, acrylic backdrops, and subtle ambient shadows.
- Dynamic OS Clock & Calendar widget displaying real-time local date and time.
- Status indicators for network status (Online / Offline Shell) and PWA installability.

### 2. Instant Live Search (`Ctrl + K` / `⌘K`)
- Blazing-fast keyboard-first search across:
  - App titles
  - Descriptions
  - Categories
  - Custom tags
  - Settings & system commands (e.g., typing *"theme"*, *"backup"*, *"dark"*, or *"add"*)
- Arrow keys (`↑`/`↓`) and `Enter` keyboard navigation to execute or launch immediately.

### 3. Pinned Apps & Reordering
- Large, high-resolution application icons with letter badges, emojis, custom URLs, or image uploads.
- Smooth drag-and-drop reordering with touch/keyboard accessibility fallbacks.
- Comprehensive right-click and three-dot context menus:
  - Open app
  - Pin / Unpin
  - Add / Remove Favorite
  - Edit details
  - Move to category
  - Remove from HOME

### 4. All Apps Library
- Dedicated full application directory accessible via `"All apps →"`.
- Alphabetical grouping (A–Z) with divider badges.
- Category filtering: *AI, Education, Development, Productivity, Utilities, Finance, Entertainment, Games, Projects, Other*.
- Sorting by: *Name (A–Z), Name (Z–A), Most Used, Recently Opened, Recently Added*.
- Grid view and List view toggles.

### 5. Genuine Local Activity (Recommended Section)
- **No fake recommendations**: Real local activity tracking (`lastOpenedAt` and `launchCount`).
- Filter by:
  - *All Activity* (balanced mix)
  - *Recent* (relative time display like "5m ago", "Yesterday")
  - *Top Used* (launch frequency counters)
- User control: One-click "Clear Activity" in privacy settings.

### 6. App Registration & PWA Detection
- Add application dialog with automatic client-side metadata and high-res favicon extraction.
- Duplicate URL detection and conflict resolution.
- Live interactive launcher card preview.
- Customizable icons: Auto-detected, emojis, image URLs, or file uploads.

### 7. Customization & Theming
- **Themes**: Dark, Light, and System (auto-matches operating system preference).
- **Accent Colors**: Sky Blue, Violet, Emerald, Amber, Crimson, Rose Pink.
- **Wallpapers**: Ambient Radial, Midnight Blue, Nordic Aurora, Sunset Glow, Solid Minimal, and custom image uploads.
- **Icon Sizing**: Compact, Standard, and Spacious modes.
- **Reduced Motion**: Respects accessibility preferences.

### 8. Backup & Restore
- Export your complete HOME setup to `HOME-backup.json`.
- Schema-validated import with confirmation before applying changes.
- Safe reset option with confirmation safeguard.

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
| --- | --- |
| `Ctrl + K` / `⌘ + K` | Focus search and command bar |
| `Esc` | Clear search, dismiss modals, return to Home |
| `Ctrl + ,` / `⌘ + ,` | Open HOME Settings |
| `↓` / `↑` | Navigate live search results |
| `Enter ↵` | Launch selected search result or execute command |

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ (tested on Node v22)
- npm 9+

### Installation

```bash
# Clone the repository
git clone https://github.com/adityasing9/SettleHub.git
cd HOME

# Install dependencies
npm install

# Start local development server
npm run dev
```

### Production Build

```bash
# Build production bundle with PWA assets and Service Worker
npm run build

# Preview production build locally
npm run preview
```

---

## 🏗️ Architecture

```
src/
├── assets/             # Static logos and visuals
├── components/
│   ├── allApps/        # Full application library & A-Z grouping
│   ├── common/         # AppIcon, ContextMenu, ToastContainer
│   ├── favorites/      # Favorite applications manager
│   ├── home/           # SearchBar, PinnedApps, RecommendedApps, HomeBottomBar, HomePanel
│   ├── layout/         # Header, MobileNavBar
│   └── modals/         # AddAppModal, EditAppModal, SettingsModal, FirstRunModal
├── context/
│   └── AppContext.tsx  # Centralized local state, PWA prompt, and shortcuts
├── data/
│   └── defaultApps.ts  # Curated initial apps & settings
├── services/
│   ├── appRepository.ts      # Local-first app persistence & metadata detection
│   ├── backupService.ts      # JSON export / import schema validator
│   └── settingsRepository.ts # Settings persistence & storage calculation
├── types/
│   └── index.ts        # TypeScript definitions
├── App.tsx             # Root layout and shell
├── index.css           # Design tokens, theme variables, and Tailwind imports
└── main.tsx            # Entry point & PWA service worker registration
```

---

## 📄 License
MIT License.
