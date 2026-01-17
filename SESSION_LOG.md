# Session Log

Add newest entries at the top.

## 2026-01-17

- Added internationalization (i18n) support with next-intl
- Created `src/app/[locale]/` route structure for localized pages
- Added locale switcher component (`src/components/locale-switcher.tsx`)
- Set up i18n configuration in `src/i18n/`
- Migrated pages to locale-aware routing (auth, tasks, proposals, sprints, profile, leaderboard)
- Updated navigation component for i18n support
- Updated middleware for locale detection
- Modified next.config.js for i18n plugin
- Updated package.json with next-intl dependency

