<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->
- Mount the shared edge shader only after hydration in the member shell; read its palette from semantic CSS tokens, cap rendering at 30fps, and pause hidden/reduced-motion animation to keep every tab consistent and lightweight.

- Scope funnel-editor visual rules under `.funnel-studio`, but inherit the platform's semantic colors and Plus Jakarta Sans typography so the workspace stays visually consistent.
- Route funnel connections between perpendicular anchors with corner-aware cubic curves so branches bend concavely toward their destination.
- Keep existing funnel connection anchors fixed when nodes move; users reposition anchors manually.
- Store member classification tags and assignments in separate admin-only RLS tables; tags must never grant access or become editable through student profiles.
- Use the shared member-groups hook and grouping helpers in administrative screens; one persisted group catalog and membership mapping prevents divergent assignments between Members and Scheduling.
- Enforce group weekly booking limits through a database trigger shared by reservations and admin rescheduling; group peers see each other's upcoming calls and Meet link only via SECURITY DEFINER `my_group_bookings`/`my_call_link` (first name only), while group catalog and membership tables stay admin-only.
- Persist course banner order and timing in app_settings, store images in the private course-banners bucket with signed URLs, and share the query between admin and catalog so changes remain synchronized.
- Derive per-member and per-group lesson counts from lesson_progress through one shared hook and pure helper, so every admin screen reports identical numbers and duplicate progress rows never double-count.
- Funnel Tracker (ported from TRACKLY) uses tracker_* tables scoped by workspace_id = owner user id; public ingestion via /api/public/tracker-event/$userId and /funnel-tracker.js, kept separate from the funnel-builder 'funnels' tables.
- Send mentor-flow notifications (waitlist openings, call notes, lesson-question answers, call ratings) from database triggers into `notifications`, so every write path notifies consistently without client code.
- Gurufucker (ported from project "gm") keeps per-user config, jobs and logs in gurufucker_* tables; Utmify sends run server-side (fireGuruNow and the per-minute /api/public/jobs/gurufucker cron) so automatic sends continue with the page closed, and funnel/currency/payload rules live in the pure src/lib/gurufucker/core.ts covered by tests/gurufucker.mjs.
- Gate every member route in `_app.tsx` on approval (`isAwaitingApproval` in src/lib/approval.ts, covered by tests/approval.mjs): non-admin accounts with a pending plan see only the waiting screen, so new signups never reach platform content before an admin assigns a level.
- Enforce that same gate in the database through `public.is_member_approved()` (SECURITY DEFINER, reads only `auth.uid()`, never a passed-in user id): catalog, community, forum, notification, lesson-interaction and mentor-slot policies plus the `lesson_content`, `lessons_public` and `public_profiles` views all require it, so a pending account reads nothing even when it skips the UI and calls the API directly. Keep the predicate self-scoped, and cover it with tests/approval-db.mjs.
- Per-plan tab access lives in `plans_config` features.tabs (legacy *_access keys kept in sync) and is resolved only by src/lib/plan-access.ts (tests/plan-access.mjs); schedule access stays in mentor_schedule_settings.allowed_plans, and duplicating a plan calls `admin_copy_plan_access` so content plan lists include the copy.
- Installment payment reminders live in admin-managed `payment_reminders` rows (members only read their own, gated by `is_member_approved()`); status, monthly schedule and visibility windows come only from src/lib/payment-reminders.ts (tests/payment-reminders.mjs) so admin and student screens agree.
- Students connect their own Stripe with a restricted read-only key (`rk_*`) stored AES-GCM-encrypted (STRIPE_KEYS_SECRET) in `student_stripe_connections`, readable only by server functions after `is_member_approved()`; sales totals, top countries/campaigns, the history date-range validation and daily series come only from src/lib/stripe-sales.ts (tests/stripe-sales.mjs), and the WebGL globe is lazy-loaded behind ClientOnly so SSR never imports it.

- Instantiate Stripe request queues inside each server-function invocation, sharing only within that invocation; Worker requests cannot safely await another request’s queued I/O.
- Keep login constellation motion in a decorative client-mounted canvas using semantic palette tokens, capped at 24fps and paused offscreen/hidden, with a static reduced-motion state, so visual effects never interfere with signing in.
- Keep Dashboard motion as abstract decorative contours separate from sales data, with semantic colors, a 24fps cap, offscreen/hidden pause and static reduced-motion rendering, so decoration never implies fabricated metrics.
- Render funnel folders through FunnelGlassFolder using existing folder assignments and real node previews; keep all items available in an expandable list so decorative fan previews never limit access.
- Enhance canvas toolbars through the shared CanvasDock wrapper without duplicating action handlers; fixed control slots and pointer-only transforms keep magnification lightweight and avoid layout shifts.
- Meta uses custom per-user Facebook Login for Business with caller-bound, single-use OAuth states and AES-GCM tokens bound to the user ID in server-only tables; approved-member checks precede access, and caches are keyed by user/account/dates/version to prevent cross-user data exposure.
