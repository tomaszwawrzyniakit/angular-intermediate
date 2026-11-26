import { TestBed } from '@angular/core/testing';
import { TicketStatus, type TicketStatusValue } from './ticket-status';

describe('TicketStatus', () => {
  async function render(status: TicketStatusValue): Promise<HTMLElement> {
    await TestBed.configureTestingModule({ imports: [TicketStatus] }).compileComponents();
    const fixture = TestBed.createComponent(TicketStatus);
    fixture.componentRef.setInput('status', status);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  it('should render the "new" status with an info icon', async () => {
    const host = await render('new');
    expect(host.querySelector('mat-chip')?.textContent).toContain('New');
    expect(host.querySelector('mat-icon')?.textContent).toContain('info');
  });

  it('should render the "progress" status with a sync icon', async () => {
    const host = await render('progress');
    expect(host.querySelector('mat-chip')?.textContent).toContain('In progress');
    expect(host.querySelector('mat-icon')?.textContent).toContain('sync');
  });

  it('should render the "done" status with a check icon', async () => {
    const host = await render('done');
    expect(host.querySelector('mat-chip')?.textContent).toContain('Done');
    expect(host.querySelector('mat-icon')?.textContent).toContain('check');
  });
});
