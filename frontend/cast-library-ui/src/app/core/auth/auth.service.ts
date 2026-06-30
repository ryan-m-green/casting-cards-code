import { Injectable, signal, computed, OnDestroy } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, Subject, tap, catchError } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { AuthResponse, LoginRequest, RegisterRequest, User } from '../../shared/models/user.model';
import type { LockLevel } from '../../shared/models/subscription.model';
import type { Subscription } from '../../shared/models/subscription.model';

@Injectable({ providedIn: 'root' })
export class AuthService implements OnDestroy {
  private readonly TOKEN_KEY = 'cast_library_token';
  private readonly USER_KEY  = 'cast_library_user';
  private readonly XSRF_TOKEN_KEY = 'cast_library_xsrf_token';

  private _currentUser = signal<User | null>(this.loadUser());
  private _xsrfToken = signal<string | null>(null);
  private _isTokenReady = signal<boolean>(false);
  readonly currentUser = this._currentUser.asReadonly();
  readonly xsrfToken = this._xsrfToken.asReadonly();
  readonly isTokenReady = this._isTokenReady.asReadonly();
  readonly isDm        = computed(() => this._currentUser()?.role === 'DM' || this._currentUser()?.role === 'Admin');
  readonly isAdmin     = computed(() => this._currentUser()?.role === 'Admin');
  readonly isLoggedIn  = computed(() => this._currentUser() !== null);

  private _lockLevel = signal<LockLevel>(this.loadLockLevelFromToken());
  readonly lockLevel = this._lockLevel.asReadonly();
  private _bypassPayment = signal(this.loadBypassPaymentFromToken());
  readonly bypassPayment = this._bypassPayment.asReadonly();
  readonly isSoftLock = computed(() => this._lockLevel() === 'SoftLock');
  readonly isHardLock = computed(() => this._lockLevel() === 'HardLock');
  readonly isSuspended = computed(() => this._lockLevel() === 'Suspended');
  readonly isExempt = computed(() => this.isAdmin() || this._bypassPayment());

  // Subscription state management
  private _subscription = signal<Subscription | null>(this.loadSubscriptionFromToken());
  readonly subscription = this._subscription.asReadonly();
  readonly isFreeTrial = computed(() => this._subscription()?.status === 'FreeTrial');
  readonly canUpgrade = computed(() => {
    const sub = this._subscription();
    return sub?.status === 'FreeTrial' && !sub.bypassPayment;
  });

  readonly closeCoverRequest$ = new Subject<void>();
  private tokenRefreshAttempts = 0;
  private readonly MAX_REFRESH_ATTEMPTS = 3;
  private subscriptionRefreshInterval: any = null;

  constructor(private http: HttpClient, private router: Router) {
    // Initialize CSRF token from localStorage if available
    const storedXsrfToken = localStorage.getItem(this.XSRF_TOKEN_KEY);
    if (storedXsrfToken) {
      this._xsrfToken.set(storedXsrfToken);
      this._isTokenReady.set(true);
    } else {
      // Mark as ready to allow app to function, will initialize via APP_INITIALIZER
      this._isTokenReady.set(true);
    }
  }

  login(request: LoginRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${environment.apiUrl}/api/auth/login`, request).pipe(
      tap(response => this.storeSession(response))
    );
  }

  register(request: RegisterRequest): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${environment.apiUrl}/api/auth/register`, request);
  }

  forgotPassword(email: string): Observable<void> {
    return this.http.post<void>(`${environment.apiUrl}/api/auth/forgot-password`, { email });
  }

  resetPassword(token: string, newPassword: string): Observable<void> {
    return this.http.post<void>(`${environment.apiUrl}/api/auth/reset-password`, { token, newPassword });
  }

  changePassword(currentPassword: string, newPassword: string): Observable<void> {
    return this.http.post<void>(`${environment.apiUrl}/api/auth/change-password`, { currentPassword, newPassword });
  }

  refreshCurrentUser(): Observable<AuthResponse> {
    return this.http.get<AuthResponse>(`${environment.apiUrl}/api/auth/me`).pipe(
      tap(response => this.storeSession(response))
    );
  }

  verifyEmail(token: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${environment.apiUrl}/api/auth/verify-email`, { token }).pipe(
      tap(response => this.storeSession(response))
    );
  }

  getCsrfToken(): Observable<{ token: string }> {
    return this.http.get<{ token: string }>(`${environment.apiUrl}/api/auth/xsrf-token`).pipe(
      tap({
        next: response => {
          this._xsrfToken.set(response.token);
          localStorage.setItem(this.XSRF_TOKEN_KEY, response.token);
          this.tokenRefreshAttempts = 0;
        },
        error: (error: HttpErrorResponse) => {
          this.tokenRefreshAttempts++;

          // Clear existing token on error to force refresh
          this._xsrfToken.set(null);
          localStorage.removeItem(this.XSRF_TOKEN_KEY);

          // Implement exponential backoff for retry
          if (this.tokenRefreshAttempts < this.MAX_REFRESH_ATTEMPTS) {
            const delay = Math.pow(2, this.tokenRefreshAttempts) * 1000; // 1s, 2s, 4s
            setTimeout(() => {
              this.getCsrfToken().subscribe({
                error: () => {
                  // Recursive retry handled by the error handler
                }
              });
            }, delay);
          } else {
            this.tokenRefreshAttempts = 0;
          }
        }
      })
    );
  }

  private initializeXsrfToken(): Observable<{ token: string }> {
    // Call the XSRF token endpoint to set the cookie
    return this.getCsrfToken();
  }

  /** Signals the shell to animate the cover closed first, then navigates. */
  requestLogout(): void {
    this.closeCoverRequest$.next();
  }

  logout(): Promise<boolean> {
    this.stopSubscriptionRefresh();
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
    localStorage.removeItem(this.XSRF_TOKEN_KEY);
    this._currentUser.set(null);
    this._xsrfToken.set(null);
    this._isTokenReady.set(false);
    this._subscription.set(null);
    return this.router.navigate(['/'], { state: { noFlip: true } });
  }

  // Safe logout method that doesn't make HTTP calls - used by interceptor
  safeLogout(): void {
    this.stopSubscriptionRefresh();
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
    localStorage.removeItem(this.XSRF_TOKEN_KEY);
    this._currentUser.set(null);
    this._xsrfToken.set(null);
    this._isTokenReady.set(false);
    this._subscription.set(null);
    this.router.navigate(['/'], { state: { noFlip: true } });
  }

  ngOnDestroy(): void {
    this.stopSubscriptionRefresh();
  }

  startSubscriptionRefresh(): void {
    if (this.subscriptionRefreshInterval) {
      return; // Already running
    }

    this.refreshCurrentUser(); // Initial refresh

    this.subscriptionRefreshInterval = setInterval(() => {
      this.refreshCurrentUser().subscribe({
        error: (error: HttpErrorResponse) => {
          // Continue interval even on error, will recover when connection is restored
        }
      });
    }, 30000); // 30 seconds
  }

  stopSubscriptionRefresh(): void {
    if (this.subscriptionRefreshInterval) {
      clearInterval(this.subscriptionRefreshInterval);
      this.subscriptionRefreshInterval = null;
    }
  }

  getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  private storeSession(response: AuthResponse): void {
    // Store CSRF token if present
    if ((response as any).xsrfToken) {
      this._xsrfToken.set((response as any).xsrfToken);
      localStorage.setItem(this.XSRF_TOKEN_KEY, (response as any).xsrfToken);
    }

    // Store JWT token in localStorage for API calls
    localStorage.setItem(this.TOKEN_KEY, response.token);
    localStorage.setItem(this.USER_KEY, JSON.stringify(response.user));
    this._currentUser.set(response.user);
    this._lockLevel.set(this.parseLockLevelFromToken(response.token));
    this._bypassPayment.set(this.parseBypassPaymentFromToken(response.token));
    this._subscription.set(this.loadSubscriptionFromToken());

    // After successful login/verify, refresh XSRF token to ensure cookie is set
    this.getCsrfToken().subscribe({
      next: () => {
        this._isTokenReady.set(true);
      },
      error: (error: HttpErrorResponse) => {
      }
    });
  }

  private loadUser(): User | null {
    const stored = localStorage.getItem(this.USER_KEY);
    if (!stored) return null;
    if (this.isTokenExpired()) {
      localStorage.removeItem(this.TOKEN_KEY);
      localStorage.removeItem(this.USER_KEY);
      return null;
    }
    return JSON.parse(stored);
  }

  private isTokenExpired(): boolean {
    const token = localStorage.getItem(this.TOKEN_KEY);
    if (!token) return true;
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.exp * 1000 < Date.now();
    } catch {
      return true;
    }
  }

  private loadLockLevelFromToken(): LockLevel {
    const token = localStorage.getItem(this.TOKEN_KEY);
    if (!token) return 'FullAccess';
    return this.parseLockLevelFromToken(token);
  }

  private loadBypassPaymentFromToken(): boolean {
    const token = localStorage.getItem(this.TOKEN_KEY);
    if (!token) return false;
    return this.parseBypassPaymentFromToken(token);
  }

  private loadSubscriptionFromToken(): Subscription | null {
    const token = localStorage.getItem(this.TOKEN_KEY);
    if (!token) return null;
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      if (payload.subscriptionId && payload.userId) {
        const lockLevel = payload.lockLevel || 'FullAccess';
        const bypassPayment = payload.bypassPayment || false;
        return {
          id: payload.subscriptionId,
          userId: payload.userId,
          status: payload.subscriptionStatus || 'FreeTrial',
          pricingModelId: payload.pricingModelId,
          bypassPayment: bypassPayment,
          lockLevel: lockLevel as LockLevel,
          currentPeriodEnd: payload.currentPeriodEnd,
          createdAt: payload.createdAt || new Date().toISOString(),
          pastDueSince: payload.pastDueSince
        };
      }
      return null;
    } catch {
      return null;
    }
  }

  private parseLockLevelFromToken(token: string): LockLevel {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const lockLevel = payload.lockLevel as LockLevel;
      return lockLevel || 'Suspended';
    } catch {
      return 'Suspended';
    }
  }

  private parseBypassPaymentFromToken(token: string): boolean {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.bypassPayment === 'true' || payload.bypassPayment === true;
    } catch {
      return false;
    }
  }
}
