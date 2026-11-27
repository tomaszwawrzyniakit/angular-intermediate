import { Component, inject, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import {
  catchError,
  debounceTime,
  distinctUntilChanged,
  map,
  of,
  startWith,
  switchMap,
} from 'rxjs';

import { Ticket } from './ticket';
import { TicketApi } from './ticket-api';

type SearchState =
  { kind: 'idle' } | { kind: 'loading' } | { kind: 'done'; tickets: Ticket[] } | { kind: 'error' };

/**
 * "Jump to ticket" search in the navbar.
 * Signals hold the STATE (the typed text); RxJS handles TIME (debounce) and CANCELLATION (switchMap).
 */
@Component({
  selector: 'app-quick-search',
  imports: [RouterLink],
  host: { class: 'position-relative' },
  template: `
    <input
      #box
      type="search"
      class="form-control form-control-sm"
      placeholder="Jump to ticket…"
      aria-label="Search tickets on the server"
      [value]="query()"
      (input)="query.set(box.value)"
      (keydown.escape)="query.set('')"
    />

    @let s = state();
    @if (s.kind !== 'idle') {
      <div class="dropdown-menu show w-100 mt-1" role="status">
        @switch (s.kind) {
          @case ('loading') {
            <span class="dropdown-item-text"
              ><span class="spinner-border spinner-border-sm"></span> Searching…</span
            >
          }
          @case ('error') {
            <span class="dropdown-item-text text-danger">Search is unavailable, try again.</span>
          }
          @case ('done') {
            @for (t of s.tickets; track t.id) {
              <a
                class="dropdown-item text-truncate"
                [routerLink]="['/tickets', t.id]"
                (click)="query.set('')"
              >
                #{{ t.id }} {{ t.title }}
              </a>
            } @empty {
              <span class="dropdown-item-text text-body-secondary">No results</span>
            }
          }
        }
      </div>
    }
  `,
})
export class QuickSearch {
  private readonly api = inject(TicketApi);

  protected readonly query = signal('');

  protected readonly state = toSignal(
    toObservable(this.query).pipe(
      map((q) => q.trim()),
      debounceTime(300), // wait until the user stops typing
      distinctUntilChanged(), // "pay" → "pay " → "pay" sends nothing new
      // switchMap UNSUBSCRIBES from the previous request = HttpClient aborts it
      // (DevTools → Network shows it as "(canceled)"). Only the newest answer wins.
      switchMap((q) =>
        q.length < 2
          ? of<SearchState>({ kind: 'idle' })
          : this.api.search(q).pipe(
              map((tickets): SearchState => ({ kind: 'done', tickets })),
              // catchError INSIDE switchMap: one failed request must not kill the whole stream.
              // (Outside switchMap the outer stream would complete and the search would stop forever.)
              catchError(() => of<SearchState>({ kind: 'error' })),
              startWith<SearchState>({ kind: 'loading' }),
            ),
      ),
    ),
    { initialValue: { kind: 'idle' } },
  );
}

// RxJS interop GOTCHAS:
//  - toSignal() subscribes IMMEDIATELY and unsubscribes when the component is destroyed.
//    Without initialValue the type is T | undefined; { requireSync: true } for sync sources
//    (BehaviorSubject); errors are rethrown when the signal is read – catch them in the pipe.
//  - toSignal()/toObservable() need an injection context (field initializer or constructor),
//    otherwise pass { injector }.
//  - toObservable() emits asynchronously and only the LAST value of a synchronous burst
//    (set('a'); set('ab') → one emission 'ab'): it is not an event stream.
//  - A manual subscribe() in a component should be cleaned up:
//      this.api.search(q).pipe(takeUntilDestroyed(this.destroyRef)).subscribe(...)
//    (HttpClient completes after one response, so short PATCH calls like in TicketStore are fine.)
//  - switchMap = newest wins (search); concatMap = keep order (queue of saves);
//    exhaustMap = ignore while busy (double-clicked "Save"); mergeMap = all in parallel.
