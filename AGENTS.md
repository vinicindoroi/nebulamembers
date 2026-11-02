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
