# Security Infrastructure Checklist

Items that require manual configuration in external dashboards.
Tailored for **Vercel Hobby (free)** and **Supabase Free** plans.

---

## 1. Vercel (Hobby/Free Plan)

### What's included on Hobby:
- [x] Basic WAF + DDoS mitigation (automatic, no config needed)
- [x] Automatic HTTPS/SSL
- [x] Global CDN

### NOT available on Hobby (requires Pro at $20/mo):
- Custom Firewall Rules (header blocking, path-based rules)
- IP Blocking
- Vercel-level Rate Limiting
- Spend Management (budget alerts, auto-pause)
- Deployment Protection (Vercel Auth for previews)

**Mitigation:** All of these are covered at the code level:
- Middleware strips `x-middleware-subrequest` header (CVE-2025-29927)
- Rate limiting via Upstash Redis in middleware
- Auth checks on all sensitive endpoints
- The free plan auto-pauses when limits are hit (no bill surprise)

### When to upgrade to Pro:
If you go to production with real users, Pro ($20/mo) gives you Custom Firewall Rules, Spend Management, and Deployment Protection — all worth having.

---

## 2. Supabase (Free Plan)

### Already applied via CLI:
- [x] Statement timeouts: `authenticated=10s`, `anon=5s`
- [x] Max rows: `authenticated=1000`, `anon=100`
- [x] All public tables have RLS enabled (0 gaps)
- [x] Security Advisor: 0 ERRORs
- [x] `leaderboard_view` changed from SECURITY DEFINER to SECURITY INVOKER
- [x] 34 functions search_path pinned to `public`
- [x] 4 RLS initplan policies optimized

### Requires Supabase Dashboard (all available on Free):

**Path:** Supabase Dashboard > Authentication > Settings

- [ ] Enable **"Confirm email"** (prevents ghost auth — attackers creating unlimited accounts with fake emails)

**Path:** Supabase Dashboard > Authentication > Rate Limits

- [ ] Customize auth rate limits (Free plan has built-in defaults via token bucket — 30 req burst, then rate-limited. You can adjust these in the dashboard)

### NOT available on Free (requires Pro at $25/mo):
- Leaked Password Protection (HaveIBeenPwned check)
- Daily backups
- SLA guarantees
- Email support

**Mitigation:** For password security on Free, ensure:
- Minimum password length ≥ 8 characters (set in Dashboard > Auth > Settings)
- Require uppercase, lowercase, digits, and symbols

---

## 3. DNS / Email Security

These are configured at your domain registrar (free to do).

### SPF Record
```dns
organic-dao.dev  TXT  "v=spf1 include:_spf.google.com ~all"
```
Adjust `include:` for your actual email provider (Resend, SendGrid, etc.).

### DMARC (start with monitor mode)
```dns
_dmarc.organic-dao.dev  TXT  "v=DMARC1; p=none; rua=mailto:dmarc@organic-dao.dev; fo=1"
```

### DKIM
Configure through your email provider. Minimum 2048-bit RSA key.

---

## 4. Post-Deploy Verification

After merging the PR and Vercel auto-deploys:

```bash
# Verify security headers
curl -sI https://organic-app-rust.vercel.app/pt-PT | grep -iE \
  "x-frame|content-security|strict-transport|x-content-type|referrer-policy|permissions-policy|x-powered"

# Expected:
# x-frame-options: DENY
# content-security-policy: ... 'nonce-...' 'strict-dynamic' ...
# strict-transport-security: max-age=63072000; includeSubDomains; preload
# x-content-type-options: nosniff
# referrer-policy: strict-origin-when-cross-origin
# permissions-policy: camera=(), microphone=(), geolocation=()
# (NO x-powered-by header)

# Verify CVE-2025-29927 is blocked
curl -s -o /dev/null -w "%{http_code}" \
  -H "x-middleware-subrequest: middleware:middleware:middleware:middleware:middleware" \
  https://organic-app-rust.vercel.app/api/settings
# Expected: 401 (not 200)

# Verify source maps not exposed
curl -s -o /dev/null -w "%{http_code}" \
  "https://organic-app-rust.vercel.app/_next/static/chunks/main.js.map"
# Expected: 404
```
