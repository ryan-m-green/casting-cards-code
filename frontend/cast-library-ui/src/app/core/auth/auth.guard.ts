import { inject } from '@angular/core';
import { CanActivateFn, CanDeactivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';
import { SubscriptionChoiceComponent } from '../../features/subscription-choice/subscription-choice.component';

export const authGuard: CanActivateFn = () => {
  const auth   = inject(AuthService);
  const router = inject(Router);
  if (auth.isLoggedIn()) return true;
  return router.createUrlTree(['/']);
};

export const dmGuard: CanActivateFn = () => {
  const auth   = inject(AuthService);
  const router = inject(Router);
  
  if (auth.isDm() || auth.isAdmin()) {
    return true;
  }
  if (!auth.isLoggedIn()) {
    return router.createUrlTree(['/']);
  }
  auth.logout();
  return false;
};

export const playerGuard: CanActivateFn = () => {
  const auth   = inject(AuthService);
  const router = inject(Router);
  if (!auth.isLoggedIn()) return router.createUrlTree(['/']);
  if (auth.isDm()) return router.createUrlTree(['/gm/campaigns']);
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
  if (auth.isDm() || auth.isAdmin()) return router.createUrlTree(['/gm/dashboard']);
  if (auth.isLoggedIn()) return router.createUrlTree(['/player/campaigns']);
  return true;
};

export const subscriptionLockGuard: CanActivateFn = () => {
  const auth   = inject(AuthService);
  const router = inject(Router);

  if (auth.isExempt()) return true;
  if (auth.isFreeTrial()) return true;
  if (auth.lockLevel() === 'FullAccess') return true;

  return router.createUrlTree(['/gm/dashboard']);
};

export const libraryAccessGuard: CanActivateFn = () => {
  const auth   = inject(AuthService);
  const router = inject(Router);

  if (auth.isExempt()) return true;
  if (auth.isFreeTrial()) return true;
  const level = auth.lockLevel();
  if (level === 'FullAccess' || level === 'SoftLock') return true;

  return router.createUrlTree(['/gm/dashboard']);
};

export const campaignShellAccessGuard: CanActivateFn = () => {
  const auth   = inject(AuthService);
  const router = inject(Router);

  if (auth.isExempt()) return true;
  if (auth.isFreeTrial()) return true;
  const level = auth.lockLevel();
  if (level === 'FullAccess' || level === 'SoftLock') return true;

  return router.createUrlTree([auth.isDm() ? '/gm/dashboard' : '/player/campaigns']);
};

export const playerLibraryAccessGuard: CanActivateFn = () => {
  const auth   = inject(AuthService);
  const router = inject(Router);

  if (auth.isExempt()) return true;
  if (auth.isFreeTrial()) return true;
  const level = auth.lockLevel();
  if (level === 'FullAccess' || level === 'SoftLock') return true;

  return router.createUrlTree(['/player/campaigns']);
};

export const subscriptionChoiceGuard: CanDeactivateFn<SubscriptionChoiceComponent> = (component) => {
  if (component.isCheckoutSuccess()) {
    return false;
  }
  return true;
};
