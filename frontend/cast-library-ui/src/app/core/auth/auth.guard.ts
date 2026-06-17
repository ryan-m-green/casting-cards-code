import { inject } from '@angular/core';
import { CanActivateFn, CanDeactivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';
import { SubscriptionService } from '../subscription.service';
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
  if (auth.isDm() || auth.isAdmin()) return true;
  if (!auth.isLoggedIn()) return router.createUrlTree(['/']);
  // Logged-in player attempting a DM page — log them out and send to login
  auth.logout();
  return false;
};

export const playerGuard: CanActivateFn = () => {
  const auth   = inject(AuthService);
  const router = inject(Router);
  if (!auth.isLoggedIn()) return router.createUrlTree(['/']);
  if (auth.isDm()) return router.createUrlTree(['/dm/campaigns']);
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

export const subscriptionLockGuard: CanActivateFn = () => {
  const auth            = inject(AuthService);
  const subscription    = inject(SubscriptionService);
  const router          = inject(Router);

  // Allow if exempt (admin or bypassPayment from JWT token for immediate bypass)
  if (auth.isExempt()) return true;
  // Allow if on free trial
  if (subscription.isFreeTrial()) return true;
  // Check current lock level from auth service (from JWT token for immediate availability)
  // Allow if FullAccess
  if (auth.lockLevel() === 'FullAccess') return true;

  // Redirect to dashboard if locked (SoftLock, HardLock, Suspended)
  return router.createUrlTree(['/dm/dashboard']);
};

export const libraryAccessGuard: CanActivateFn = () => {
  const auth            = inject(AuthService);
  const subscription    = inject(SubscriptionService);
  const router          = inject(Router);

  // Allow if exempt (admin or bypassPayment from JWT token for immediate bypass)
  if (auth.isExempt()) return true;
  // Allow if on free trial
  if (subscription.isFreeTrial()) return true;
  // Check current lock level from auth service (from JWT token for immediate availability)
  const level = auth.lockLevel();
  // Allow if FullAccess or SoftLock
  if (level === 'FullAccess' || level === 'SoftLock') return true;

  // Redirect to dashboard if HardLock or Suspended
  return router.createUrlTree(['/dm/dashboard']);
};

export const playerLibraryAccessGuard: CanActivateFn = () => {
  const auth            = inject(AuthService);
  const subscription    = inject(SubscriptionService);
  const router          = inject(Router);

  // Allow if exempt (admin or bypassPayment from JWT token for immediate bypass)
  if (auth.isExempt()) return true;
  // Allow if on free trial
  if (subscription.isFreeTrial()) return true;
  // Check current lock level from auth service (from JWT token for immediate availability)
  const level = auth.lockLevel();
  // Allow if FullAccess or SoftLock
  if (level === 'FullAccess' || level === 'SoftLock') return true;

  // Redirect to player dashboard if HardLock or Suspended
  return router.createUrlTree(['/player/campaigns']);
};

export const subscriptionChoiceGuard: CanDeactivateFn<SubscriptionChoiceComponent> = (component) => {
  if (component.isCheckoutSuccess()) {
    return false;
  }
  return true;
};
