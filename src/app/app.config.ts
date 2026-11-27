import { provideHttpClient, withInterceptors } from '@angular/common/http';
import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
  provideZonelessChangeDetection,
} from '@angular/core';
import {
  provideClientHydration,
  withHttpTransferCacheOptions,
} from '@angular/platform-browser';
import { provideRouter, withInMemoryScrolling } from '@angular/router';

import { mockTicketInterceptor } from './mock/mock-http';
import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    // Zoneless is the default in Angular v22 (verified in llms-full.txt);
    // stated explicitly for teaching. The zone.js polyfill is not in the build.
    provideZonelessChangeDetection(),
    provideRouter(routes, withInMemoryScrolling({ scrollPositionRestoration: 'enabled' })),
    // Task 05: HttpClient + the mock backend (no real server in this demo).
    provideHttpClient(withInterceptors([mockTicketInterceptor])),
    // Task 11 — hydration (all options verified in llms-full.txt):
    // - provideClientHydration(): re-uses the server-rendered DOM instead of
    //   destroying and re-rendering it (no UI flicker), and by default enables
    //   INCREMENTAL HYDRATION, which automatically enables EVENT REPLAY —
    //   native events (click/…) fired before hydration finishes are captured
    //   and replayed once the matching views are hydrated.
    // - withHttpTransferCacheOptions(): disables the HTTP transfer cache for
    //   the mock endpoints. The "server" is a client-side mock interceptor, so
    //   transferring its "server" responses to the client would only hide the
    //   real (observable) requests the search pipeline demo wants to show.
    provideClientHydration(
      withHttpTransferCacheOptions({
        filter: (request) => !request.url.startsWith('/api/tickets'),
      }),
    ),
  ],
};
