import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { App } from './app';

describe('App', () => {
  it('renders the navigation', async () => {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const links = [...fixture.nativeElement.querySelectorAll('.nav-link')].map((a: Element) =>
      a.textContent?.trim(),
    );
    expect(links).toEqual(['Dashboard', 'Tickets', 'New ticket']);
  });
});
