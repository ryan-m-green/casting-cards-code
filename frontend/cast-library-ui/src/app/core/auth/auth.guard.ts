import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

export const authGuard: CanActivateFn = () => {
  const auth   = inject(AuthService);
  const router = inject(Router);
  if (auth.isLoggedIn()) return true;
  return router.createUrlTree(['/']);
};

export const dmGuard: CanActivateFn = () => {
  const auth   = inject(AuthService);
  const router = inject(Router);
  if (auth.isDm() || auth.isAdmin()) return true;
  if (!auth.isLoggedIn()) return router.createUrlTree(['/']);
  return router.createUrlTree(['/']);
};

export const playerGuard: CanActivateFn = () => {
  const auth   = inject(AuthService);
  const router = inject(Router);
  if (!auth.isLoggedIn()) return router.createUrlTree(['/']);
  if (auth.isDm()) return router.createUrlTree(['/dm/dashboard']);
  return true;
};

export const adminGuard: CanActivateFn = () => {
  const auth   = inject(AuthService);
  const router = inject(Router);
  if (auth.isAdmin()) return true;
  if (!auth.isLoggedIn()) return router.createUrlTree(['/']);
  return router.createUrlTree(['/']);
};

export const coverGuard: CanActivateFn = () => {
  const auth   = inject(AuthService);
  const router = inject(Router);
  if (auth.isDm() || auth.isAdmin()) return router.createUrlTree(['/dm/dashboard']);
  if (auth.isLoggedIn()) return router.createUrlTree(['/player/campaigns']);
  return true;
};
