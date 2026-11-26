# OpsBoard Implementation Plan

## Goal

Create a small, visually attractive Angular 22 application for a
four-day intermediate Angular training.

Application:

**OpsBoard**

Routes:

- `/dashboard`
- `/tickets`
- `/tickets/:id`
- `/tickets/new`

Primary domain:

```ts
interface Ticket {
  id: number;
  title: string;
  description: string;
  status: 'new' | 'progress' | 'done';
  priority: 'low' | 'medium' | 'high';
  assignee?: string;
}
```

The application should remain deliberately small.

---

# DAY 1 - Modern Angular

## Task 01 - Bootstrap

Create the Angular 22 application in the current repository.

Add:

- routing
- SCSS
- Angular Material
- zoneless configuration

Initialize Git if necessary.

Create simple local/mock ticket data.

Create:

- Dashboard route
- Tickets route

Verify Angular APIs using local documentation where necessary.

Commit:

`chore: initialize OpsBoard training application`

---

## Task 02 - Material Application Shell

Create an attractive Material application shell.

Use:

- toolbar
- sidenav
- Material icons
- navigation
- responsive content

Navigation:

- Dashboard
- Tickets
- New Ticket

Use minimal custom SCSS.

Commit:

`feat: add OpsBoard Material application shell`

---

## Task 03 - Modern Ticket List

Create an attractive ticket list.

Use Material components.

Demonstrate naturally:

- `@if`
- `@else`
- `@for`
- `@empty`
- `@switch`
- `@case`
- `@let`
- `track`

Show:

- title
- priority
- status
- assignee

Create a small reusable status component.

Commit:

`feat: add modern ticket list`

---

## Task 04 - Modern Signal APIs

Enhance the ticket list using:

- `signal()`
- `computed()`
- `input()`
- `output()`
- `model()`
- `linkedSignal()`
- `effect()`

Use meaningful examples.

Examples:

`computed()`:
filtered tickets.

`input()`:
status component input.

`output()`:
ticket selected event.

`model()`:
two-way filter component.

`linkedSignal()`:
selected ticket or assignee that depends on available data but can
still be changed by the user.

`effect()`:
persist the search/filter value in Local Storage.

Do NOT use `effect()` for derived state.

Commit:

`feat: demonstrate modern signal APIs`

---

# DAY 2 - Reactive Data

## Task 05 - Reactive HTTP Search

Add simple HTTP/mock API behavior.

Implement live ticket search using:

```text
signal
→ toObservable()
→ debounceTime()
→ distinctUntilChanged()
→ switchMap()
→ HTTP
→ toSignal()
```

Make request cancellation observable in browser DevTools.

The important teaching point is:

Signals for state.
RxJS for asynchronous streams, time and cancellation.

Do not add unnecessary data-access layers.

Commit:

`feat: add cancellable reactive ticket search`

---

## Task 06 - Resource APIs and Ticket Details

Create:

`/tickets/:id`

Use a small `resource()` example.

Use `httpResource()` for the actual ticket detail use case if this is
the correct API according to `llms-full.txt`.

Demonstrate:

- reactive parameters
- value
- loading
- error
- reload
- request cancellation

Verify exact API using `llms-full.txt`.

Keep the implementation short.

Commit:

`feat: demonstrate Angular resource APIs`

---

# DAY 3 - Advanced Signal Forms

## Task 07 - Nested Signal Form

Create:

`/tickets/new`

Use Signal Forms.

Verify exact API in `llms-full.txt` before implementation.

Use a nested model similar to:

```ts
interface TicketFormModel {
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high';

  assignee: {
    name: string;
    email: string;
  };

  contact: {
    name: string;
    email: string;
    phone: string;
    preferredChannel: 'email' | 'phone';
  };

  incident: {
    affectedUsers: number;
    startedAt: string;
    serviceUnavailable: boolean;
  };

  resolution: {
    workaroundAvailable: boolean;
    workaround: string;
  };
}
```

Demonstrate:

- `signal()`
- `form()`
- FieldTree
- `[formField]`
- nested fields
- programmatic value updates

Use Angular Material form controls.

Visually group the form into Material cards:

- Ticket
- Contact
- Incident
- Resolution

Commit:

`feat: add nested ticket Signal Form`

---

## Task 08 - Advanced Validation

Extend the Signal Form.

Basic validation:

```text
title
- required
- minLength 5
- maxLength 100

description
- required
- minLength 20

contact.email
- required
- valid email
```

Conditional validation:

```text
priority == high
→ description >= 50 characters
```

Cross-field validation:

```text
preferredChannel == phone
→ phone required
```

Business validation:

```text
serviceUnavailable == true
AND
affectedUsers > 100
→ priority must be high
```

Conditional nested section:

```text
workaroundAvailable == true
→ show workaround field
→ workaround required
→ minimum 20 characters
```

Use `@if` for the conditional UI.

Add ONE small async validation example:

```text
ticket title
→ async duplicate check
→ similar incident warning
```

Add ONE server-side validation example.

Do NOT create a generic validation framework.

Commit:

`feat: demonstrate advanced Signal Form validation`

---

## Task 09 - Angular Aria

Add exactly ONE useful Angular Aria example.

Choose a control where headless accessible behavior makes sense.

Demonstrate:

- keyboard navigation
- accessibility behavior
- difference between Angular Material and Angular Aria

Verify the exact API against `llms-full.txt`.

Do not redesign the application.

Commit:

`feat: demonstrate Angular Aria`

---

# DAY 4 - Modern Runtime

## Task 10 - Dashboard and @defer

Create an attractive dashboard.

Material KPI cards:

- Open
- High Priority
- Done
- Unassigned

Add ONE visually attractive activity chart.

Keep chart code minimal.

Use `@defer` so the chart is not in the initial execution path.

Demonstrate:

- `@defer`
- placeholder
- loading state
- lazy chunk

Make the effect observable in DevTools/Network.

Commit:

`feat: add deferred OpsBoard dashboard`

---

## Task 11 - SSR, Hydration and Zoneless

Ensure the application is zoneless.

Enable modern Angular SSR and hydration.

Verify exact Angular 22 APIs using `llms-full.txt`.

Demonstrate:

- SSR
- hydration
- event replay where appropriate
- incremental hydration for the deferred chart

Create ONE small controlled hydration mismatch teaching example using
a non-deterministic value such as time.

The incorrect example must be easy to demonstrate and easy to fix.

Final application must have no hydration errors.

Commit:

`feat: demonstrate SSR and hydration`

---

## Task 12 - Focused Tests and Training Checkpoints

Use Vitest.

Create only a few high-value tests.

Test 1:

```text
query changes
→ computed ticket list changes
```

Test 2:

```text
multiple rapid searches
→ newest result wins
```

Test 3:

```text
advanced nested form business rule
→ appropriate validation state
```

Create:

`TRAINING.md`

Document the four training days and the relevant commits.

Create local Git tags:

```text
day-1
day-2
day-3
day-4
```

Do not push.

Perform final:

- format
- tests
- Angular build
- SSR build
- git diff check
- git status

Commit:

`test: add focused Angular training examples`

The final working tree must be clean.