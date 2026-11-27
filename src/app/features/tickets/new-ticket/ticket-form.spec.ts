import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { Injector, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { form } from '@angular/forms/signals';

import { EMPTY_DRAFT, TicketDraft, ticketDraftSchema } from './ticket-form';

describe('ticketDraftSchema (Signal Forms rules)', () => {
  function createForm() {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    const model = signal<TicketDraft>(structuredClone(EMPTY_DRAFT));
    return form(model, ticketDraftSchema, { injector: TestBed.inject(Injector) });
  }
  const kinds = (field: () => { errors: () => { kind: string }[] }) =>
    field()
      .errors()
      .map((e) => e.kind);

  it('cross-field: phone becomes required for phone contact, and must look like a phone', () => {
    const f = createForm();
    expect(kinds(f.reporter.phone)).toEqual([]);
    f.reporter.preferredChannel().value.set('phone');
    expect(kinds(f.reporter.phone)).toEqual(['required']);
    f.reporter.phone().value.set('call me');
    expect(kinds(f.reporter.phone)).toEqual(['phoneNumber']);
  });

  it('business rule: an outage for >100 users must be high priority', () => {
    const f = createForm();
    f.impact.serviceDown().value.set(true);
    f.impact.affectedUsers().value.set(150);
    expect(kinds(f.impact.affectedUsers)).toContain('priority');
    f.basics.priority().value.set('high');
    expect(kinds(f.impact.affectedUsers)).not.toContain('priority');
  });

  it('dynamic list + hidden section', () => {
    const f = createForm();
    expect(f.impact.services[0].name().invalid()).toBe(true); // applyEach → required
    f.impact.services[0].name().value.set('checkout-api');
    expect(f.impact.services[0].name().valid()).toBe(true);

    expect(f.impact.workaround().hidden()).toBe(true); // no rules while hidden
    f.impact.workaroundAvailable().value.set(true);
    expect(kinds(f.impact.workaround)).toEqual(['required']);
  });

  it('array items: field state follows object items, not the index', () => {
    const f = createForm();
    f.impact.services().value.set([{ name: 'a' }, { name: 'b' }]);
    const b = f.impact.services[1];
    b.name().markAsTouched();
    f.impact.services().value.update((list) => list.slice(1)); // remove "a"
    expect(f.impact.services[0]).toBe(b); // the same field moved up together with its item
    expect(f.impact.services[0].name().touched()).toBe(true);
  });
});
