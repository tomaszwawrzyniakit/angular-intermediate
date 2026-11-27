import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import TicketList from './ticket-list';

describe('TicketList (signals)', () => {
  async function setup() {
    localStorage.clear();
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    const fixture = TestBed.createComponent(TicketList);
    await fixture.whenStable();
    const el: HTMLElement = fixture.nativeElement;
    const rows = () => el.querySelectorAll('app-ticket-row').length;
    const click = async (label: string) => {
      [...el.querySelectorAll('button')].find((b) => b.textContent?.trim() === label)!.click();
      await fixture.whenStable();
    };
    return { el, rows, click };
  }

  it('filters by status (computed) and paginates (5 per page)', async () => {
    const { rows, click } = await setup();
    expect(rows()).toBe(5);
    await click('Done');
    expect(rows()).toBe(3);
  });

  it('resets to page 1 when the filter changes (linkedSignal)', async () => {
    const { el, click } = await setup();
    await click('2');
    expect(el.querySelector('.page-item.active')?.textContent?.trim()).toBe('2');
    await click('In progress');
    await click('All');
    expect(el.querySelector('.page-item.active')?.textContent?.trim()).toBe('1');
  });
});
