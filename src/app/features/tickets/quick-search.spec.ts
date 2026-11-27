import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { vi } from 'vitest';

import { QuickSearch } from './quick-search';
import { TEST_TICKETS } from './testing';

describe('QuickSearch (signal → RxJS → signal)', () => {
  afterEach(() => vi.useRealTimers());

  it('debounces, cancels the stale request and survives a server error', async () => {
    vi.useFakeTimers();
    TestBed.configureTestingModule({
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
    const fixture = TestBed.createComponent(QuickSearch);
    const http = TestBed.inject(HttpTestingController);
    const el: HTMLElement = fixture.nativeElement;
    const input = el.querySelector('input')!;
    const type = async (text: string) => {
      input.value = text;
      input.dispatchEvent(new Event('input'));
      fixture.detectChanges();
      await vi.advanceTimersByTimeAsync(300);
      fixture.detectChanges();
    };

    await type('Tick');
    const stale = http.expectOne('/api/tickets?q=Tick');
    await type('Ticket 7');
    expect(stale.cancelled).toBe(true); // switchMap aborted it
    http.expectOne('/api/tickets?q=Ticket%207').flush([TEST_TICKETS[6]]);
    fixture.detectChanges();
    expect(el.querySelectorAll('a.dropdown-item').length).toBe(1);

    await type('boom');
    http
      .expectOne('/api/tickets?q=boom')
      .flush({ message: 'down' }, { status: 500, statusText: 'Server Error' });
    fixture.detectChanges();
    expect(el.textContent).toContain('Search is unavailable');

    await type('Ticket 7'); // the stream is still alive after the error
    http.expectOne('/api/tickets?q=Ticket%207').flush([TEST_TICKETS[6]]);
    fixture.detectChanges();
    expect(el.querySelectorAll('a.dropdown-item').length).toBe(1);
  });
});
