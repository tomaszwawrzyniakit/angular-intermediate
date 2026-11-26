# OpsBoard — Four-Day Angular 22 Training

A small, deliberately minimal Angular 22 app (Signals, Signals → RxJS →
Signals, Resource APIs, Signal Forms, Angular Aria, zoneless + SSR/hydration).
Run it with `npm start` (browser) or `npm run serve:ssr:opsboard` after
`npm run build` (SSR). One task = one commit, so you can `git checkout` each
checkpoint or jump between days with the `day-1` … `day-4` tags.

## Day 1 — Modern Angular

Commits:
- `755772e` chore: initialize OpsBoard training application (+ `3ca4c51` fix)
- `c59aac6` feat: add OpsBoard Material application shell
- `a03ea22` feat: add modern ticket list
- `e1c7d32` feat: demonstrate modern signal APIs
- Checkpoint tag: `day-1`

Demo points:
1. **Native control flow** on the Tickets page (`/tickets`): `@if`/`@else`,
   `@for` … `track ticket.id`, `@empty` (type gibberish in the search box and
   watch the "No tickets found" state appear), `@switch`/`@case` and `@let`
   inside the list rows.
2. **Signal APIs, each with a job**:
   - `signal()` — the search text, the status filter.
   - `computed()` — the visible ticket list (search results × status filter).
   - `input()`/`output()` — the reusable status chip and the
     "ticket selected" event from the list.
   - `model()` — `[(filter)]` on the filter button group.
   - `linkedSignal()` — the highlighted ticket: follows the filtered list but
     a click overrides it until the filter removes it.
   - `effect()` — persists search + filter to `localStorage` (a side effect,
     not derived state — emphasize that distinction).
3. Reload the page: the previous search/filter come back via the
   `effect()` → `localStorage` round-trip.

## Day 2 — Reactive Data

Commits:
- `857fc3b` feat: add cancellable reactive ticket search
- `60fb618` feat: demonstrate Angular resource APIs
- Checkpoint tag: `day-2`

Demo points:
1. **The search pipeline** on `/tickets`:
   `signal → toObservable() → debounceTime(300) → distinctUntilChanged() →
   switchMap() → HTTP (mock) → toSignal()`. Type `payment`, then quickly
   `backup`: DevTools shows the first request **cancelled** and only the
   newest result wins. The message: *Signals hold state; RxJS owns the
   asynchronous parts — timers and cancellation.*
2. **Resource APIs** on `/tickets/:id` (`/tickets/3`):
   - `httpResource()` — the real ticket lookup; the request URL is a reactive
     function of the route param, so navigating `#3 → #4` aborts the in-flight
     request (visible in DevTools Network).
   - `resource()` — the "related tickets" section chains off the detail load.
   - Show `.value()`, `.isLoading()`, `.error()`, `.reload()`; open
     `/tickets/999` to demo the error state and the Retry button.

## Day 3 — Advanced Signal Forms

Commits:
- `496098b` feat: add nested ticket Signal Form
- `a92b157` feat: demonstrate advanced Signal Form validation
- `0babce7` feat: demonstrate Angular Aria
- Checkpoint tag: `day-3`

Demo points:
1. **The nested Signal Form** on `/tickets/new`: a `signal()` model,
   `form()` building a `FieldTree` over it, `[formField]` bindings, nested
   access (`form.incident.affectedUsers`), and programmatic updates
   ("Pre-fill from template" fills nested fields from code — the UI follows).
2. **Validation, one category at a time** (same page):
   - basic: title required/5–100, description required/≥20, contact e-mail;
   - conditional: high priority ⇒ description ≥ 50 chars;
   - cross-field: preferred channel "Phone" ⇒ phone required;
   - **business**: *service unavailable AND >100 affected users ⇒ priority
     must be high* (flip "Service unavailable", type 200 users, pick Medium —
     the error appears; pick High — it clears);
   - conditional section: "Workaround available" reveals + requires the
     workaround field (`hidden` keeps it out of validation while off);
   - async: a duplicate-title check (`validateAsync` + `resource`) — an exact
     duplicate blocks, a similar title is only a non-blocking hint;
   - server-side: the mock API rejects titles containing "TEST".
3. **Angular Aria** on `/tickets`: the assignee listbox is plain markup with
   `@angular/aria` headless behavior (ARIA roles, roving tabindex,
   Arrow/Home/End + Enter). Contrast with Material: Material ships styled
   widgets, Aria ships behavior and leaves styling to you.

## Day 4 — Modern Runtime

Commits:
- `ec9b15b` feat: add deferred OpsBoard dashboard
- `754b65a` feat: demonstrate SSR and hydration
- `test: add focused Angular training examples` (this task)
- Checkpoint tag: `day-4`

Demo points:
1. **`@defer`** on `/dashboard`: the activity chart is in its own lazy chunk —
   DevTools Network shows the chunk arriving after the page is idle
   (`on idle(500)`), with placeholder/loading states.
2. **SSR + hydration + zoneless**: run the server build
   (`npm run build` then `npm run serve:ssr:opsboard`) — `curl` the page and
   see the server-rendered HTML; the app runs zoneless. The dashboard has ONE
   controlled hydration-mismatch teaching example: the "Demo hydration
   mismatch" switch shows the anti-pattern (a non-deterministic `new Date()`
   in the first render — the value *shifts* after hydration) vs. the fix
   (deterministic first pass + live time in `afterNextRender`).
3. **The tests that prove the day's claims** (`npm test`):
   - computed filtering: query/filter change → the computed list changes;
   - rapid searches: `switchMap` cancels the stale request, newest wins;
   - the business rule: `serviceUnavailable && affectedUsers > 100 &&
     priority !== 'high'` → invalid with the right message.

## Checkpoints

| Tag     | Points at                                   |
| ------- | ------------------------------------------- |
| `day-1` | Task 04 — modern signal APIs                |
| `day-2` | Task 06 — resource APIs                     |
| `day-3` | Task 09 — Angular Aria                      |
| `day-4` | Task 12 — this commit (tests + training)    |
