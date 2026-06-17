import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, Subject, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthResponse, LoginRequest, RegisterRequest, User } from '../../shared/models/user.model';
import type { LockLevel } from '../../shared/models/subscription.model';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly TOKEN_KEY = 'cast_library_token';
  private readonly USER_KEY  = 'cast_library_user';

  private _currentUser = signal<User | null>(this.loadUser());
  readonly currentUser = this._currentUser.asReadonly();
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

  readonly closeCoverRequest$ = new Subject<void>();

  constructor(private http: HttpClient, private router: Router) {}

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

  /** Signals the shell to animate the cover closed first, then navigates. */
  requestLogout(): void {
    this.closeCoverRequest$.next();
  }

  logout(): Promise<boolean> {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
    this._currentUser.set(null);
    return this.router.navigate(['/'], { state: { noFlip: true } });
  }

  getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  private storeSession(response: AuthResponse): void {
    localStorage.setItem(this.TOKEN_KEY, response.token);
    localStorage.setItem(this.USER_KEY, JSON.stringify(response.user));
    this._currentUser.set(response.user);
    this._lockLevel.set(this.parseLockLevelFromToken(response.token));
    this._bypassPayment.set(this.parseBypassPaymentFromToken(response.token));
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
