# OpsBoard Angular Training

You are building a SMALL training application for a four-day
intermediate Angular 22 course.

The primary goal is TEACHING, not enterprise architecture.

The trainer must be able to understand, explain and reproduce the
important examples live from memory.

## Sources of truth

Read:

1. `IMPLEMENTATION_PLAN.md`
2. `best-practices.md`

Use `llms-full.txt` as the local Angular API reference.

Before using a modern Angular API, search only the relevant section
of `llms-full.txt`.

If model memory conflicts with local documentation, local documentation wins.

Do not invent Angular APIs.

This applies especially to:

- Signal Forms
- resource()
- httpResource()
- Angular Aria
- zoneless
- SSR
- hydration
- incremental hydration
- event replay

## Keep it small

Target:

- approximately 10-15 application TypeScript files
- approximately 1500-2500 application LOC
- minimal custom SCSS

Use Angular Material for visual design.

Do NOT introduce unnecessary:

- repositories
- facades
- DTO/domain duplication
- mappers
- global stores
- use-case classes
- adapters
- infrastructure layers
- generic abstractions
- custom design systems

If a teaching example requires many abstractions, simplify it.

## Git

Initialize a new Git repository.

Use:

1 logical task = 1 commit

Do not configure a remote.
Do not push.

Before every commit:

- format
- test
- build
- inspect diff

Never commit broken code.

## Implementation

Execute `IMPLEMENTATION_PLAN.md` sequentially.

For every task:

IMPLEMENT
→ VERIFY
→ COMMIT
→ NEXT TASK

Do not ask for confirmation between tasks.

Do not expand the scope.

## UI

The application should look polished and impressive during a live demo.

Prefer Angular Material for:

- toolbar
- sidenav
- cards
- form fields
- buttons
- icons
- chips
- progress indicators
- dialogs
- snackbars

Use Angular Aria only where it demonstrates a useful Angular 22 concept.

Avoid custom CSS where Material can solve the problem.

## Context management

Keep implementation focused.

Read only the relevant sections of `llms-full.txt`.

If context becomes almost exhausted:

1. finish the current task,
2. verify it,
3. commit it,
4. update `IMPLEMENTATION_STATUS.md`,
5. leave Git clean,
6. stop.

A new session must be able to resume using:

- CLAUDE.md
- IMPLEMENTATION_PLAN.md
- IMPLEMENTATION_STATUS.md
- Git history