import { ApplicationConfig, APP_INITIALIZER, provideAppInitializer, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter, withComponentInputBinding, withRouterConfig, withInMemoryScrolling } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { catchError, of } from 'rxjs';

import { routes } from './app.routes';
import { authInterceptor } from './core/auth/auth.interceptor';
import { AuthService } from './core/auth/auth.service';

export const appConfig: ApplicationConfig = {
  providers: [
    /**
     * This app is zoneless: there is no `zone.js` polyfill (see angular.json — no `polyfills`
     * entry, and no dependency on zone.js), so Angular never patches the DOM's events and never
     * ticks the page for them. A component is checked when its own signals change, when an input it
     * is bound to changes, or when one of its own template events fires — which is exactly the
     * change detection the panels want, and why each of them is OnPush and holds its state in
     * signals (see the v2 grid's components).
     *
     * Do not add `provideZoneChangeDetection` here: it asks for `NgZone`, which zoneless apps do not
     * load, and the app will not bootstrap at all. There is nothing to coalesce either — with no
     * zone, a stream of pointer events does not ring a check per event to begin with.
     */
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes, withComponentInputBinding(), withRouterConfig({ paramsInheritanceStrategy: 'always' }), withInMemoryScrolling({ scrollPositionRestoration: 'top' })),
    provideHttpClient(withInterceptors([authInterceptor])),
    provideAnimationsAsync(),
    {
      provide: APP_INITIALIZER,
      useFactory: (auth: AuthService) => {
        return () => auth.getCsrfToken().pipe(
          catchError((err: unknown) => {
            return of(null);
          })
        );
      },
      deps: [AuthService],
      multi: true
    },
  ],
};
