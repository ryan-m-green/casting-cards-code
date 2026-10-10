import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { AuthService } from './auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);

  let modifiedReq = req;
  const method = req.method.toUpperCase();

  modifiedReq = req.clone({ withCredentials: true });

  if (req.url.includes('/api/') &&
      !req.url.includes('/api/auth/login') &&
      !req.url.includes('/api/auth/register') &&
      !req.url.includes('/api/auth/forgot-password') &&
      !req.url.includes('/api/auth/reset-password') &&
      !req.url.includes('/api/auth/verify-email') &&
      !req.url.includes('/api/stripe/webhook')) {

    const token = localStorage.getItem('cast_library_token');
    if (token && token.trim() !== '' && token.includes('.')) {
      modifiedReq = modifiedReq.clone({
        headers: modifiedReq.headers.set('Authorization', `Bearer ${token}`),
        withCredentials: true
      });
    }
  }

  if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(method) &&
      !req.url.includes('/api/auth/login') &&
      !req.url.includes('/api/auth/register') &&
      !req.url.includes('/api/auth/forgot-password') &&
      !req.url.includes('/api/auth/reset-password') &&
      !req.url.includes('/api/auth/verify-email') &&
      !req.url.includes('/api/stripe/webhook')) {

    const xsrfToken = auth.xsrfToken();
    const xsrfCookie = document.cookie.split(';').find(cookie => cookie.trim().startsWith('XSRF-TOKEN='));

    if (xsrfToken && xsrfCookie) {
      modifiedReq = modifiedReq.clone({
        headers: modifiedReq.headers.set('X-XSRF-TOKEN', xsrfToken),
        withCredentials: true
      });
    } else if (!xsrfCookie) {
      auth.getCsrfToken().subscribe({
        error: () => {
        }
      });
    }
  }

  return next(modifiedReq).pipe(
    catchError((err: HttpErrorResponse) => {
      if (err.status === 401 && !req.headers.has('X-Skip-Auth-Interceptor')) {
        auth.safeLogout();
      } else if (err.status === 400 && err.error?.error === 'Invalid antiforgery token') {
        auth.getCsrfToken().subscribe({
          next: () => {
          },
          error: () => {
            auth.safeLogout();
          }
        });
      }
      return throwError(() => err);
    })
  );
};
