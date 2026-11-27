import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ApplicationRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { TEST_TICKETS } from './testing';
import { TicketStore } from './ticket-store';

describe('TicketStore', () => {
  const settle = () => TestBed.inject(ApplicationRef).whenStable();

  async function setup() {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    const store = TestBed.inject(TicketStore);
    const http = TestBed.inject(HttpTestingController);
    TestBed.tick(); // let the resource start its request
    http.expectOne('/api/tickets').flush(TEST_TICKETS);
    await settle();
    return { store, http };
  }

  it('derives selectors from the collection', async () => {
    const { store } = await setup();
    expect(store.tickets().length).toBe(7);
    expect(store.openCount()).toBe(4);
  });

  it('updates optimistically and re-fetches the truth on error', async () => {
    const { store, http } = await setup();
    store.update(4, { status: 'done' });
    expect(store.openCount()).toBe(3); // the UI changed before the server answered

    http.expectOne('/api/tickets/4').flush(null, { status: 500, statusText: 'Error' });
    TestBed.tick();
    http.expectOne('/api/tickets').flush(TEST_TICKETS);
    await settle();
    expect(store.openCount()).toBe(4);
  });
});
