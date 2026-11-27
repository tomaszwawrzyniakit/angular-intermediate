# OpsBoard — Four-Day Intermediate Angular 22 Training

OpsBoard is a deliberately small, single-purpose application (a dark "ops
console / NOC" ticket board built with **Bootstrap 5.3.3** — no Angular
Material) that teaches modern Angular 22 across four hands-on days. Every
task is its own commit, so the trainer can `git checkout` any checkpoint and
explain the example live.

Run it:

```bash
npm install
npm start          # dev server + zoneless
npm test           # Vitest (focused, high-value tests)
npm run build      # client + SSR build
```

The Git history **is** the curriculum: each `feat:` commit below lands on a
checkpoint branch (`task-NN`) and the day boundaries land on `day-1..day-4`.

---

## Day 1 — Modern Angular  (`day-1` → task 04)

The fundamentals of the modern Angular surface: standalone components, the
Bootstrap shell, native control flow, and the signal API family.

### Task 01 — Bootstrap  ·  `469c854 chore: initialize OpsBoard training application`
- The `ng new`-style scaffold: routing (lazy `/dashboard`, `/tickets`), SCSS,
  **zoneless** change detection, and the mock ticket data
  (`src/app/domain/tickets.ts`).
- **Demo point:** open `app.config.ts` — `provideZoneChangeDetection` is the
  zoneless entry; point out that we no longer need `provideExperimentalZonelessChangeDetection`.

### Task 02 — Bootstrap Application Shell  ·  `ca1672b feat: add OpsBoard Bootstrap application shell`
- The responsive shell in `src/app/app.ts`: a dark `navbar`, a collapsible
  sidebar (`list-group` + Bootstrap `collapse`, toggled by a `signal`), and
  `routerLinkActive` highlighting.
- **Demo point:** collapse/expand the sidebar below the `md` breakpoint;
  icons come from `bootstrap-icons` (`<i class="bi bi-...">`), not a Material
  icon font.

### Task 03 — Modern Ticket List  ·  `7d43c76 feat: add modern ticket list`
- `src/app/features/tickets/tickets.ts` + `ticket-status.ts`: a reusable
  status badge and the list body.
- **Demo point:** the list uses **native control flow** in one place —
  `@for (…; track ticket.id)`, `@empty`, `@switch`/`@case` for the priority
  badge, and `@let` for the assignee flag. No `*ngFor`/`*ngIf` anywhere.

### Task 04 — Modern Signal APIs  ·  `8921b27 feat: demonstrate modern signal APIs`
- The full signal family, each with a meaningful job (all in `tickets.ts`):
  - `signal()` — raw search text + status filter.
  - `computed()` — the filtered ticket list (derived state, **never** `effect()`).
  - `input()` — the `status` the badge renders (`ticket-status.ts`).
  - `output()` — `ticketSelected` emitted when a row is clicked.
  - `model()` — the two-way `[(filter)]` button group (`ticket-filter.ts`).
  - `linkedSignal()` — the assignee filter that resets to "Anyone" when the
    live search narrows the available names.
  - `effect()` — **side effect only**: mirror search/filter into `localStorage`.
- **Demo point:** type in the search box, then reload — the filter is
  restored from `localStorage` (the `effect`). Emphasise: `computed` for
  derived state, `effect` only for side effects.

---

## Day 2 — Reactive Data  (`day-2` → task 06)

Signals own state; RxJS owns time, sequences and **cancellation**.

### Task 05 — Cancellable Reactive Ticket Search  ·  `e6d1954 feat: add cancellable reactive ticket search`
- `tickets.ts`: the pipeline
  `signal → toObservable() → debounceTime(300) → distinctUntilChanged() → switchMap(HTTP) → toSignal()`.
- The mock interceptor (`mock/mock-http.ts`) adds a real 700 ms round-trip,
  so an in-flight request is genuinely cancellable.
- **Demo point:** type fast in the search box and watch the browser console —
  the `tap` logs `GET /api/tickets?q=…` for each query and
  `cancelled stale search GET …` for the ones `switchMap` abandons. Same story
  in DevTools → Network (the stale requests get cancelled).

### Task 06 — Resource APIs & Ticket Details  ·  `b4df00c feat: demonstrate Angular resource APIs`
- `/tickets/:id` (`ticket-detail.ts`): **`httpResource()`** for the real
  detail GET (reactive params from the route, `value()`, `isLoading()`,
  `error()`, `reload()`), plus a small plain **`resource()`** for the
  related-tickets side panel.
- **Demo point:** visit `/tickets/999` to see the 404 error state and the
  **Retry** button wired to `httpResource().reload()`; change the id in the URL
  to watch the reactive params re-fetch (and cancel the old request).

---

## Day 3 — Advanced Signal Forms  (`day-3` → task 09)

Signal Forms (`@angular/forms/signals`) for the nested `/tickets/new` form,
then the validation catalogue and one Angular Aria control.

### Task 07 — Nested Ticket Signal Form  ·  `0725ea6 feat: add nested ticket Signal Form`
- `new-ticket.ts`: a nested `FieldTree` built with **`form()`** over a plain
  `signal()` that *owns* the data; `[formField]` binds each control, including
  deeply nested paths like `form.contact.name` and `form.incident.affectedUsers`.
- Grouped visually into Bootstrap cards (Ticket / Contact / Incident /
  Resolution). `hidden()` removes the workaround field from validation while
  its switch is off.
- **Demo point:** click **Pre-fill from template** — one write to the root
  field's writable `value` signal (`form().value.set(…)`) fills every nested
  control at once.

### Task 08 — Advanced Signal Form Validation  ·  `d9bdb68 feat: demonstrate advanced Signal Form validation`
- The full catalogue, all verified against the local API reference:
  - Basic: `required`, `minLength`, `maxLength`, `email` (per-field rules).
  - Conditional: `priority == high → description ≥ 50` (a standard validator
    gated by `when:`, not a new framework).
  - Cross-field: `preferredChannel == phone → phone required`.
  - **Business rule:** `serviceUnavailable && affectedUsers > 100 → priority
    must be high` (a `validateTree` reading sibling fields via `valueOf`).
  - Conditional nested section: `workaroundAvailable → show + require the
    workaround` (min 20 chars), hidden otherwise.
  - One async rule: the title **duplicate/similar check** (`validateAsync`).
  - One server-side rule: the mock backend rejects titles containing `TEST`.
- **Demo point:** trigger the business rule (outage on, affected users > 100,
  priority not high) and submit — the alert lists the failing rule with its
  field label; then flip priority to `high` and watch it clear.

### Task 09 — Angular Aria  ·  `af86609 feat: demonstrate Angular Aria`
- `assignee-picker.ts`: a **headless, accessible listbox** using
  `@angular/aria` (`ngListbox`/`ngOption`) over plain Bootstrap `<ul>/<li>`.
- **Demo point:** keyboard-only flow — Tab focuses the active option (roving
  tabindex), Arrow/Home/End move it, Enter/Space select, typing does typeahead.
  Contrast with Material: `@angular/aria` adds only ARIA behaviour to **our**
  markup; the look stays ours.

---

## Day 4 — Modern Runtime  (`day-4` → task 12)

`@defer`, SSR + hydration, and the focused test suite that proves the day's
claims.

### Task 10 — Deferred Dashboard & `@defer`  ·  `f16bfad feat: add deferred OpsBoard dashboard`
- `dashboard.ts` + `activity-chart.ts`: KPI cards (Open / High priority / Done
  / Unassigned) derived with `computed()`, and a single activity chart wrapped
  in **`@defer (on idle(1200))`** with `@placeholder` / `@loading` / `@error`.
- **Demo point:** open DevTools → Network on `/dashboard` — the chart is a
  **separate lazy chunk** fetched after first paint; the KPI cards render
  first.

### Task 11 — SSR, Hydration & Zoneless  ·  `93f886e feat: demonstrate SSR and hydration`
- Server rendering is on (`RenderMode.Server`); `provideClientHydration()`
  enables hydration, **incremental hydration** and **event replay** (with the
  HTTP transfer cache filtered off for the mock endpoints).
- The deferred chart carries a `hydrate on idle(1200)` trigger: the server
  renders the chart's **main** template, the client keeps it dehydrated until
  the idle trigger, then loads the chunk and hydrates it in place.
- `rendered-at.ts` is the **controlled hydration-mismatch teaching example**:
  the wrong `isPlatformBrowser` + `@if` version (non-deterministic `new Date()`
  → mismatched DOM structure) next to the correct `afterNextRender` fix.
- **Demo point:** show the SSR HTML (the server-rendered chart markup is in
  the initial HTML), then the "rendered at" badge that appears only after
  hydration — and how the wrong version throws a mismatch error.

### Task 12 — Focused Tests & Training Checkpoints  ·  see commit below
- Vitest suite, three focused high-value tests (`task12.spec.ts`):
  1. **Query → computed list:** changing the status-filter signal re-derives
     the `computed` ticket list (no new HTTP call).
  2. **Rapid searches → newest wins:** the debounce fires a 700 ms request for
     `"log"`, then the query becomes `"login"`; `switchMap` cancels the stale
     `"log"` request (the log asserts the cancellation) and only the newest
     result is rendered — a count the stale query would not produce.
  3. **Business rule:** driving the nested Signal Form programmatically
     (`serviceUnavailable && affectedUsers > 100 && priority !== 'high'`)
     leaves the form **invalid** with the exact message, and clearing it once
     priority is `high`.
- **Demo point:** `npm test` and map each spec back to the day's teaching
  point; note the faked timers that make the async pipeline deterministic.

---

## Checkpoints

| Branch / tag | Points at | Commit |
|--------------|-----------|--------|
| `task-01` / `day-1` | end of Day 1 | `8921b27` Task 04 |
| `task-05` | Day 2 start | `e6d1954` Task 05 |
| `task-06` / `day-2` | end of Day 2 | `b4df00c` Task 06 |
| `task-07` | Day 3 start | `0725ea6` Task 07 |
| `task-09` / `day-3` | end of Day 3 | `af86609` Task 09 |
| `task-10` | Day 4 start | `f16bfad` Task 10 |
| `task-11` | pre-final | `93f886e` Task 11 |
| `task-12` / `day-4` | end of Day 4 | this commit (Task 12) |

Each `feat:` commit is followed by a small `docs:` commit that updates
`IMPLEMENTATION_STATUS.md` (last completed task, next task, last commit,
blockers). Nothing is pushed; the repository is local-only.
