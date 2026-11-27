# OpsBoard – Modern Angular training app

Small teaching application for the course
**"Angular Developer (Intermediate): Modern Angular"** (Angular 22).
The course plan has 6 modules; `IMPLEMENTATION_PLAN.md` maps them to commits.

The goal is TEACHING. The trainer must be able to explain every example
and rebuild the important ones live, from memory.

## Rules

- Angular 22, standalone, zoneless (default), SSR + hydration.
- UI: **Bootstrap 5.3** classes + `bootstrap-icons`. No Angular Material.
  Prefer Bootstrap utilities over custom CSS; `styles.scss` stays almost empty.
  No Bootstrap JS: interactive state lives in signals.
- Every example needs a real use case in the app (no "demo-only" APIs
  that nobody uses). If an API is worth mentioning but has no natural place,
  leave a short commented snippet next to the closest example.
- Keep it small: no repositories, facades, mappers, adapters, generic layers.
- `llms-full.txt` is the local Angular reference; installed type definitions
  in `node_modules/@angular/*` win over model memory. Do not invent APIs.
- Follow `best-practices.md`.

## Workflow

1 logical step = 1 commit. Before every commit: `npm run format`,
`npm run lint`, `npm test -- --watch=false`, `npm run build`.
Never commit broken code.
