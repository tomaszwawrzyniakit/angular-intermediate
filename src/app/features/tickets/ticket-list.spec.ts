import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import TicketList from './ticket-list';
import { TEST_TICKETS } from './testing';

describe('TicketList (signals + httpResource)', () => {
  async function setup() {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
    const fixture = TestBed.createComponent(TicketList);
    const http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
    http.expectOne('/api/tickets').flush(TEST_TICKETS);
    await fixture.whenStable();

    const el: HTMLElement = fixture.nativeElement;
    const rows = () => el.querySelectorAll('app-ticket-row').length;
    const activePage = () => el.querySelector('.page-item.active')?.textContent?.trim();
    const click = async (label: string) => {
      [...el.querySelectorAll('button')].find((b) => b.textContent?.trim() === label)!.click();
      await fixture.whenStable();
    };
    return { http, rows, activePage, click };
  }

  it('filters by status (computed) and paginates', async () => {
    const { rows, click } = await setup();
    expect(rows()).toBe(5);
    await click('Done');
    expect(rows()).toBe(3);
  });

  it('goes back to page 1 when the filter changes (linkedSignal)', async () => {
    const { activePage, click } = await setup();
    await click('2');
    expect(activePage()).toBe('2');
    await click('New');
    await click('All');
    expect(activePage()).toBe('1');
  });

  it('updates optimistically and sends a PATCH', async () => {
    const { http, rows, click } = await setup();
    await click('Done');
    await click('All');
    await click('Start'); // first "new" ticket on page 1 is #4
    const req = http.expectOne('/api/tickets/4');
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ status: 'progress' });
    expect(rows()).toBe(5);
  });
});
