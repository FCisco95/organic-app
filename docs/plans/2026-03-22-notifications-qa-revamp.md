# Notifications QA + Revamp Plan

**Section:** 4.12 Notifications
**Tested:** 2026-03-22
**Severity:** S1
**Cases:** 6/6 passed (1 FAIL, 1 PARTIAL, 4 PASS)

---

## Functional Fixes (for qa-fixer)

### Fix 1: Bell dropdown overflows on mobile — S1

**File:** `src/components/notifications/notification-bell.tsx:108`
**Problem:** The notification panel uses `absolute right-0 w-80 sm:w-96` positioning. On 375px mobile, the 320px panel extends beyond the left viewport edge, clipping content ("ifications yet" instead of "No notifications yet").
**Fix:** On mobile viewports, make the panel full-width or use a fixed/bottom-sheet pattern. Options:
- Use `fixed inset-x-4 top-14` on mobile for centered overlay
- Or use `w-[calc(100vw-2rem)] right-0` to constrain within viewport
- Or convert to bottom sheet on mobile (better UX pattern per Linear Mobile)
**Verify:** Open at 375x812, bell dropdown should not clip.

### Fix 2: Missing dispute href mapping — S2

**File:** `src/components/notifications/notification-item.tsx:24-32`
**Problem:** `getNotificationHref()` only handles `subject_type === 'task'` and `subject_type === 'proposal'`. Dispute notifications (`subject_type === 'dispute'`) fall through to the `/` fallback, navigating users to home instead of the dispute detail.
**Fix:** Add dispute mapping:
```typescript
if (subject_type === 'dispute') return `/disputes/${subject_id}`;
```
**Verify:** Click a dispute notification — should navigate to `/disputes/{id}`.

### Fix 3: "Mark all read" button persists after click — S2

**File:** `src/app/[locale]/notifications/page.tsx:39`
**Problem:** `unreadCount` comes from `data?.pages[0]?.unread_count` which is from the infinite query cache. `useMarkAllRead.onSuccess` updates queries matching `notificationKeys.all` but the infinite query uses a different key structure (`['notifications', 'infinite', ...]`). The unread count in the infinite query response isn't updated optimistically.
**Fix:** In `useMarkAllRead.onSuccess` (hooks.ts:227-244), also update infinite query data, or invalidate the infinite query. Simplest fix:
```typescript
queryClient.invalidateQueries({ queryKey: notificationKeys.infinite() });
```
**Verify:** Click "Mark all read" — button should disappear immediately without page reload.

---

## Visual/UX Improvements (for prototype-executor)

### Benchmark References

- **Linear Notifications:** Grouped by time period (Today, Yesterday, Last week). Rich action text with actor avatars. Category-colored icons. Hover reveals "mark read" action. Keyboard navigation.
- **GitHub Notifications:** Filter by reason (review requested, assigned, mentioned). Group by repository. "Done" action to archive. Unread/read visual distinction is strong.
- **Notion Updates:** Activity feed with inline previews. Page mentions show content snippet. Grouped by workspace/page.

### UX Direction

1. **Notification item richness** — Current items show "Someone Untitled" with identical ⬆️ emoji for every entry. Even with proper data, the layout is monotone. Improve:
   - Category-colored left border or icon background (tasks=blue, proposals=purple, disputes=red, etc.)
   - Rich action text: "**Alice** escalated dispute on **Task: Build Dashboard**" not "Someone Untitled"
   - Content snippet/preview line under the action text
   - Relative time with tooltip showing absolute time

2. **Time-based grouping** — Group notifications by "Today", "Yesterday", "This week", "Earlier" like Linear. Currently a flat list with no visual separation.

3. **Bell dropdown improvements:**
   - Show category icon per notification type
   - "Mark as read" action on hover/swipe per item (not just bulk)
   - Unread count badge per category tab
   - On mobile: use bottom sheet instead of dropdown

4. **Notification page layout:**
   - Add search/filter beyond just category tabs
   - Unread-only toggle filter
   - Bulk actions: select multiple, mark read, delete
   - Keyboard shortcuts: `j/k` to navigate, `e` to mark read (Linear pattern)

5. **Preferences panel polish:**
   - Move preferences to a dedicated settings sub-page or modal instead of inline collapsible
   - Add category descriptions ("Get notified when tasks are created, updated, or completed")
   - Add "Mute all" / "Enable all" quick actions

6. **Follow button visibility:**
   - FollowButton returns `null` during loading — add skeleton placeholder to prevent layout shift
   - Consider adding follow state indicator in notification items ("You're following this task")

---

## Files to Modify

| File | Fix/Revamp | Description |
|------|-----------|-------------|
| `src/components/notifications/notification-bell.tsx` | Fix 1 | Mobile overflow fix |
| `src/components/notifications/notification-item.tsx` | Fix 2 | Add dispute href mapping |
| `src/features/notifications/hooks.ts` | Fix 3 | Fix mark-all-read optimistic update |
| `src/app/[locale]/notifications/page.tsx` | Revamp | Page layout, grouping, filters |
| `src/components/notifications/notification-preferences.tsx` | Revamp | Panel redesign |
| `src/components/notifications/follow-button.tsx` | Revamp | Loading skeleton |

---

## Verification Checklist

- [ ] Bell dropdown usable on 375px mobile
- [ ] Dispute notifications navigate to `/disputes/{id}`
- [ ] "Mark all read" button disappears immediately after click
- [ ] No console errors on notifications page
- [ ] Preferences persist after reload
- [ ] Follow/unfollow toggles correctly on task and proposal detail pages
