import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideClientHydration } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';

import { routes } from './app.routes';

// Zoneless change detection is the default since Angular v21:
// no zone.js polyfill and no provider needed. (Before v21 you needed
// `provideZonelessChangeDetection()`, and earlier `provideExperimentalZoneless…`.)
export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideClientHydration(),
  ],
};
