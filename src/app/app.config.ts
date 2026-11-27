import { provideHttpClient } from '@angular/common/http';
import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideSignalFormsConfig } from '@angular/forms/signals';
import { provideClientHydration } from '@angular/platform-browser';
import { provideRouter, withComponentInputBinding } from '@angular/router';

import { routes } from './app.routes';

// Zoneless change detection is the default since Angular v21:
// no zone.js polyfill and no provider needed. (Before v21 you needed
// `provideZonelessChangeDetection()`, and earlier `provideExperimentalZoneless…`.)
export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    // Route params, query params and route data are bound to component inputs.
    provideRouter(routes, withComponentInputBinding()),
    provideHttpClient(), // fetch-based by default
    // Hydration: the browser REUSES the server HTML instead of re-rendering it. In v22 it also
    // enables incremental hydration (@defer ... hydrate on …) and event replay (clicks made before
    // the JS is ready are recorded and replayed). GET responses made during SSR are put into the
    // page (HTTP transfer cache), so the browser does not request them again – check Network.
    provideClientHydration(),
    // Signal Forms add these CSS classes to every [formField] control → Bootstrap validation styles
    // with no per-input [class.is-invalid] bindings.
    provideSignalFormsConfig({
      classes: {
        'is-invalid': ({ state }) => state().invalid() && state().touched(),
        'is-valid': ({ state }) => state().valid() && state().touched(),
      },
    }),
  ],
};
