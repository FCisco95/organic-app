# Security Infrastructure Checklist

Items that require manual configuration in external dashboards.
Complete these after deploying the code-level security hardening.

---

## 1. Vercel WAF Rules (Dashboard)

**Path:** Vercel Dashboard > Project > Firewall > Custom Rules

### Rule 1: Block middleware bypass attempts
- **Condition:** Header `x-middleware-subrequest` exists
- **Action:** Block (403)
- **Priority:** High
- **Note:** Defense-in-depth — code also strips this header

### Rule 2: Rate limit auth endpoints
- **Condition:** Path starts with `/api/auth/`
- **Action:** Rate limit (10 req/min per IP)
- **Priority:** Medium

### Rule 3: Block common scanner user agents
- **Condition:** User-Agent contains `sqlmap` OR `nikto` OR `nuclei` OR `masscan`
- **Action:** Challenge
- **Priority:** Low

### Rule 4: Enable Attack Challenge Mode
- **Path:** Vercel Dashboard > Project > Firewall > Attack Challenge Mode
- **Action:** Toggle ON during active attacks, keep off normally
- **Note:** Shows CAPTCHA to suspicious traffic

---

## 2. Vercel Spend Management (Dashboard)

**Path:** Vercel Dashboard > Team Settings > Billing > Spend Management

- [ ] Set spend alert at 80% of monthly budget
- [ ] Set hard limit to auto-pause project at budget cap
- [ ] Configure webhook to notify Slack/Discord on alert

---

## 3. Vercel Deployment Protection (Dashboard)

**Path:** Vercel Dashboard > Project > Settings > Deployment Protection

- [ ] Enable "Vercel Authentication" for preview deployments
- [ ] Enable "Protection Bypass for Automation" only if needed for CI
- [ ] Disable "Git Fork Protection" bypass (prevent env var leaks to fork PRs)

---

## 4. DNS / Email Security

### SPF Record
```dns
organic-dao.dev  TXT  "v=spf1 include:_spf.google.com ~all"
```
Adjust `include:` for your actual email provider (Resend, SendGrid, etc.).
For subdomains that don't send email:
```dns
subdomain.organic-dao.dev  TXT  "v=spf1 -all"
```

### DKIM
Configure through your email provider. Minimum 2048-bit RSA key.
Rotate every 6-12 months.

### DMARC (Progressive deployment)
```dns
# Phase 1: Monitor (start here)
_dmarc.organic-dao.dev  TXT  "v=DMARC1; p=none; rua=mailto:dmarc@organic-dao.dev; fo=1"

# Phase 2: Quarantine (after 2 weeks of clean reports)
_dmarc.organic-dao.dev  TXT  "v=DMARC1; p=quarantine; pct=25; rua=mailto:dmarc@organic-dao.dev"

# Phase 3: Reject (after 4 weeks)
_dmarc.organic-dao.dev  TXT  "v=DMARC1; p=reject; rua=mailto:dmarc@organic-dao.dev; adkim=s; aspf=s"
```

### Subdomain Audit
- [ ] List all DNS records pointing to external services
- [ ] Remove dangling CNAMEs (subdomain takeover risk)
- [ ] Verify each subdomain resolves correctly

---

## 5. Supabase Dashboard Settings

### Already applied via CLI:
- [x] Statement timeouts: `authenticated=10s`, `anon=5s`
- [x] Max rows: `authenticated=1000`, `anon=100`
- [x] All public tables have RLS enabled (0 gaps)
- [x] Security Advisor: 0 ERRORs (leaderboard_view fixed, search_path fixed on 34 functions, RLS initplan fixed on 4 policies)
- [x] `leaderboard_view` changed from SECURITY DEFINER to SECURITY INVOKER

### Requires Supabase Dashboard:

**Path:** Supabase Dashboard > Authentication > Settings

- [ ] Enable "Leaked Password Protection" (HaveIBeenPwned check)
- [ ] Confirm email enabled (prevents ghost auth)
- [ ] Sign-up rate limit: 5/hour per IP
- [ ] Sign-in rate limit: 10/min per IP
- [ ] Token refresh: 30/min per user
- [ ] Password reset: 3/hour per email

---

## 6. Post-Deploy Verification

After deploying the security hardening code:

```bash
# Verify security headers
curl -sI https://organic-app-rust.vercel.app/pt-PT | grep -iE \
  "x-frame|content-security|strict-transport|x-content-type|referrer-policy|permissions-policy|x-powered"

# Expected:
# x-frame-options: DENY
# content-security-policy: ... 'nonce-...' 'strict-dynamic' ... (no unsafe-inline for scripts)
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

# Verify SSRF blocked
curl -s -o /dev/null -w "%{http_code}" \
  "https://organic-app-rust.vercel.app/_next/image?url=http://169.254.169.254/latest/meta-data/&w=256&q=75"
# Expected: 400
```
