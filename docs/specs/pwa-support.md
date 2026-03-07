# Spec: PWA Support (Progressive Web App)

> Track 2.1 | Priority: Pre-Launch (High)
> Last updated: 2026-03-07

---

## Goal

Make Organic Protocol installable on mobile devices with offline browsing capability. Members can add the app to their home screen, use it without the browser bar, and browse cached content offline.

---

## Phase A: Installability + Offline (Pre-Launch)

### Implementation Sequence

```
Step 1: PWA Manifest + Icons                    (30 min)
Step 2: Meta tags in root layout                 (15 min)
Step 3: Service worker with Workbox              (1-2 hrs)
Step 4: Offline fallback page                    (30 min)
Step 5: Test install flow on iOS + Android       (30 min)
```

### Step 1: PWA Manifest + Icons

**Create:** `public/manifest.json`

```json
{
  "name": "Organic Protocol",
  "short_name": "Organic",
  "description": "Community coordination & merit-based rewards platform",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#0a0a0a",
  "theme_color": "#22c55e",
  "orientation": "portrait-primary",
  "icons": [
    {
      "src": "/icons/icon-192x192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-512x512.png",
      "sizes": "512x512",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-maskable-512x512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "maskable"
    }
  ],
  "screenshots": [],
  "categories": ["productivity", "finance"]
}
```

**Create icon files:**
- `public/icons/icon-192x192.png` — generated from Organic logo
- `public/icons/icon-512x512.png` — generated from Organic logo
- `public/icons/icon-maskable-512x512.png` — with safe zone padding for adaptive icons
- `public/icons/apple-touch-icon.png` — 180x180 for iOS

### Step 2: Meta Tags in Root Layout

**Edit:** `src/app/[locale]/layout.tsx`

Add to `metadata` export:

```typescript
export const metadata: Metadata = {
  title: 'Organic Protocol',
  description: 'Community coordination & merit-based rewards platform',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Organic',
  },
  other: {
    'mobile-web-app-capable': 'yes',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#22c55e',
};
```

Also add to `<head>` via layout:
```html
<link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
```

### Step 3: Service Worker with Workbox

**Install:** `npm install next-pwa` (or use `workbox-webpack-plugin` directly)

**Option A — next-pwa (simpler):**

**Edit:** `next.config.ts`

```typescript
import withPWA from 'next-pwa';

const nextConfig = withPWA({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
  runtimeCaching: [
    {
      urlPattern: /^https:\/\/.*\.supabase\.co\/rest\/v1\/.*/i,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'supabase-api',
        expiration: { maxEntries: 64, maxAgeSeconds: 60 * 5 }, // 5 min
      },
    },
    {
      urlPattern: /\/_next\/static\/.*/i,
      handler: 'CacheFirst',
      options: {
        cacheName: 'next-static',
        expiration: { maxEntries: 128, maxAgeSeconds: 60 * 60 * 24 * 30 }, // 30 days
      },
    },
    {
      urlPattern: /\/_next\/image\?.*/i,
      handler: 'StaleWhileRevalidate',
      options: {
        cacheName: 'next-images',
        expiration: { maxEntries: 64, maxAgeSeconds: 60 * 60 * 24 }, // 1 day
      },
    },
  ],
})({
  // ... existing next config
});
```

**Option B — Manual service worker (more control):**

**Create:** `public/sw.js`

```javascript
import { precacheAndRoute } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { NetworkFirst, CacheFirst, StaleWhileRevalidate } from 'workbox-strategies';

// Precache static assets
precacheAndRoute(self.__WB_MANIFEST);

// API calls: network first, fall back to cache
registerRoute(
  ({ url }) => url.pathname.startsWith('/api/'),
  new NetworkFirst({ cacheName: 'api-cache', networkTimeoutSeconds: 5 })
);

// Static assets: cache first
registerRoute(
  ({ url }) => url.pathname.startsWith('/_next/static/'),
  new CacheFirst({ cacheName: 'static-cache' })
);

// Offline fallback
registerRoute(
  ({ request }) => request.mode === 'navigate',
  async ({ event }) => {
    try {
      return await new NetworkFirst({ cacheName: 'pages' }).handle({ event });
    } catch {
      return caches.match('/offline');
    }
  }
);
```

**Create:** `src/lib/register-sw.ts` (client-side registration)

```typescript
export function registerServiceWorker() {
  if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js');
    });
  }
}
```

**Edit:** `src/components/layout-client.tsx` — call `registerServiceWorker()` in a `useEffect`.

### Step 4: Offline Fallback Page

**Create:** `src/app/[locale]/offline/page.tsx`

```
┌─────────────────────────────────────────┐
│                                         │
│          🌿 Organic Protocol            │
│                                         │
│     ┌─────────────────────────────┐     │
│     │                             │     │
│     │   You're currently offline  │     │
│     │                             │     │
│     │   Check your connection     │     │
│     │   and try again.            │     │
│     │                             │     │
│     │   [ Retry ]                 │     │
│     │                             │     │
│     └─────────────────────────────┘     │
│                                         │
└─────────────────────────────────────────┘
```

### Step 5: Testing Checklist

- [ ] Chrome DevTools → Application → Manifest shows valid manifest
- [ ] "Install app" prompt appears on Android Chrome
- [ ] "Add to Home Screen" works on iOS Safari
- [ ] App opens in standalone mode (no browser bar)
- [ ] Offline fallback shows when disconnected
- [ ] Cached pages load when offline
- [ ] Lighthouse PWA audit passes

---

## Phase B: Push Notifications (Post-Launch Fast Follow)

### Implementation Sequence

```
Step 1: Push subscription DB table + API         (1 hr)
Step 2: Web Push service setup                    (1 hr)
Step 3: Push sender utility                       (1 hr)
Step 4: Integrate with notification system        (2 hrs)
Step 5: User preferences UI                       (1 hr)
Step 6: Test on real devices                      (30 min)
```

### Step 1: Push Subscription Storage

**Create migration:** `supabase/migrations/YYYYMMDDHHMMSS_push_subscriptions.sql`

```sql
CREATE TABLE push_subscriptions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  endpoint    TEXT NOT NULL,
  p256dh_key  TEXT NOT NULL,
  auth_key    TEXT NOT NULL,
  user_agent  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, endpoint)
);

CREATE INDEX idx_push_subs_user ON push_subscriptions(user_id);

ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own subscriptions"
  ON push_subscriptions
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Service role can read all for sending
CREATE POLICY "Service role reads all"
  ON push_subscriptions
  FOR SELECT
  USING (auth.role() = 'service_role');
```

### Step 2: Push API Routes

**Create:** `src/app/api/push/subscribe/route.ts`
- POST: Save push subscription for current user
- DELETE: Remove subscription by endpoint

**Create:** `src/app/api/push/send/route.ts` (internal only)
- POST: Send push to user_id(s), body includes title, body, url, icon

### Step 3: Push Sender Utility

**Create:** `src/lib/push.ts`

```typescript
import webpush from 'web-push';

// Set VAPID keys from env
webpush.setVapidDetails(
  'mailto:organic_community@proton.me',
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

export async function sendPushToUser(userId: string, payload: {
  title: string;
  body: string;
  url?: string;
  icon?: string;
}) {
  // Fetch subscriptions for user from DB
  // Send to each subscription
  // Handle expired subscriptions (410 → delete)
}
```

**New env vars:**
- `NEXT_PUBLIC_VAPID_PUBLIC_KEY` — generated with `web-push generate-vapid-keys`
- `VAPID_PRIVATE_KEY` — keep server-side only

### Step 4: Notification Triggers

Integrate into existing notification creation flow. When a notification is created, also send a push if the user has:
1. An active push subscription
2. Push enabled for that notification category in their preferences

**Priority triggers:**
1. Voting reminders (proposal deadline approaching)
2. @mentions in comments
3. Dispute window closing
4. Sprint ending
5. Task assigned to you

### Step 5: Preferences UI

**Edit:** `src/app/[locale]/profile/page.tsx` or notification settings area

Add toggle section:
```
┌─────────────────────────────────────┐
│ Push Notifications                  │
│                                     │
│ [Toggle] Enable push notifications  │
│                                     │
│ When enabled:                       │
│ [✓] Voting reminders                │
│ [✓] Mentions & replies              │
│ [✓] Deadline warnings               │
│ [ ] Task assignments                │
│ [ ] Sprint events                   │
└─────────────────────────────────────┘
```

---

## File Map Summary

| Action | Path |
|---|---|
| Create | `public/manifest.json` |
| Create | `public/icons/icon-192x192.png` |
| Create | `public/icons/icon-512x512.png` |
| Create | `public/icons/icon-maskable-512x512.png` |
| Create | `public/icons/apple-touch-icon.png` |
| Edit | `src/app/[locale]/layout.tsx` (metadata + viewport) |
| Create or Edit | `next.config.ts` (PWA plugin) |
| Create | `public/sw.js` or auto-generated by next-pwa |
| Create | `src/lib/register-sw.ts` |
| Edit | `src/components/layout-client.tsx` (register SW) |
| Create | `src/app/[locale]/offline/page.tsx` |
| Create | `supabase/migrations/YYYYMMDDHHMMSS_push_subscriptions.sql` |
| Create | `src/app/api/push/subscribe/route.ts` |
| Create | `src/lib/push.ts` |
| Edit | notification creation flow (add push trigger) |
| Edit | profile/notification settings (push preferences UI) |

---

## Dependencies

- `next-pwa` or `workbox-webpack-plugin` (Phase A)
- `web-push` npm package (Phase B)
- VAPID key pair generation (Phase B)
