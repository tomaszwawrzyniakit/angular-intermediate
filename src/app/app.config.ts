import { provideHttpClient } from '@angular/common/http';
import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
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
    provideClientHydration(),
  ],
};
