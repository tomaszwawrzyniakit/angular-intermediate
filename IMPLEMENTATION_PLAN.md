# OpsBoard – implementation plan

Domain: an IT operations ticket board (tickets with status, priority, assignee).
The mock backend is a small in-memory REST API inside the SSR Express server
(`src/server/ticket-api.ts`), so every request is visible in DevTools → Network.

| Course module | Step (commit) |
|---|---|
| 0. Setup | Angular 22 + SSR + Bootstrap + lint/format |
| 1. Modern project | Shell, lazy feature routes, feature-based folders, route input binding |
| 2. Signals | Ticket list: `signal`, `computed`, `effect`, `inject`, `input`, `output`, `model`, `linkedSignal`, `viewChild` |
| 3. Data & backend | REST API, `httpResource` (list + detail), optimistic update, RxJS quick search (`toObservable` → `switchMap` → `toSignal`), error handling |
| 4. Signal Forms | New ticket wizard: validation, custom validator, cross-field rules, async `validateHttp`, dynamic list (`applyEach`), multi-step, server errors |
| 5. Templates & UX | Dashboard with `@defer` (placeholder/loading/error), empty/error states, Angular Aria listbox |
| 6. Scaling | Signal store + ViewModel `computed`, SSR render modes, incremental hydration, transfer cache, diagnostics |
| Tests | Focused Vitest specs for each module |

Checkpoints: see `TRAINING.md`.
