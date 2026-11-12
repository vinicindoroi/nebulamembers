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

- Scope funnel-editor visual rules under `.funnel-studio`, but inherit the platform's semantic colors and Plus Jakarta Sans typography so the workspace stays visually consistent.
- Route funnel connections between perpendicular anchors with corner-aware cubic curves so branches bend concavely toward their destination.
- Keep existing funnel connection anchors fixed when nodes move; users reposition anchors manually.
- Store member classification tags and assignments in separate admin-only RLS tables; tags must never grant access or become editable through student profiles.
- Use the shared member-groups hook and grouping helpers in administrative screens; one persisted group catalog and membership mapping prevents divergent assignments between Members and Scheduling.
- Enforce group weekly booking limits through a database trigger shared by reservations and admin rescheduling; expose only occupied week dates to students so group classification and peer details remain admin-only.
- Persist course banner order and timing in app_settings, store images in the private course-banners bucket with signed URLs, and share the query between admin and catalog so changes remain synchronized.
- Derive per-member and per-group lesson counts from lesson_progress through one shared hook and pure helper, so every admin screen reports identical numbers and duplicate progress rows never double-count.
- Funnel Tracker (ported from TRACKLY) uses tracker_* tables scoped by workspace_id = owner user id; public ingestion via /api/public/tracker-event/$userId and /funnel-tracker.js, kept separate from the funnel-builder 'funnels' tables.
- Send mentor-flow notifications (waitlist openings, call notes, lesson-question answers, call ratings) from database triggers into `notifications`, so every write path notifies consistently without client code.
- Gurufucker (ported from project "gm") keeps per-user config, jobs and logs in gurufucker_* tables; Utmify sends run server-side (fireGuruNow and the per-minute /api/public/jobs/gurufucker cron) so automatic sends continue with the page closed, and funnel/currency/payload rules live in the pure src/lib/gurufucker/core.ts covered by tests/gurufucker.mjs.
- Gate every member route in `_app.tsx` on approval (`isAwaitingApproval` in src/lib/approval.ts, covered by tests/approval.mjs): non-admin accounts with a pending plan see only the waiting screen, so new signups never reach platform content before an admin assigns a level.
- Enforce that same gate in the database through `public.is_member_approved()` (SECURITY DEFINER, reads only `auth.uid()`, never a passed-in user id): catalog, community, forum, notification, lesson-interaction and mentor-slot policies plus the `lesson_content`, `lessons_public` and `public_profiles` views all require it, so a pending account reads nothing even when it skips the UI and calls the API directly. Keep the predicate self-scoped, and cover it with tests/approval-db.mjs.
- Per-plan tab access lives in `plans_config` features.tabs (legacy *_access keys kept in sync) and is resolved only by src/lib/plan-access.ts (tests/plan-access.mjs); schedule access stays in mentor_schedule_settings.allowed_plans, and duplicating a plan calls `admin_copy_plan_access` so content plan lists include the copy.
