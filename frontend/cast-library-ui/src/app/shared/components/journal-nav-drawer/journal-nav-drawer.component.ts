import {
  Component,
  computed,
  signal,
  inject,
  HostListener,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Router, NavigationEnd } from '@angular/router';
import { filter, map, startWith } from 'rxjs';
import { AuthService } from '../../../core/auth/auth.service';

@Component({
  selector: 'app-journal-nav-drawer',
  standalone: true,
  imports: [],
  templateUrl: './journal-nav-drawer.component.html',
  styleUrl: './journal-nav-drawer.component.scss',
})
export class JournalNavDrawerComponent {
  private readonly router = inject(Router);
  private readonly auth   = inject(AuthService);

  readonly isDm       = this.auth.isDm;
  readonly isAdmin    = this.auth.isAdmin;
  readonly isLoggedIn = this.auth.isLoggedIn;

  isOpen    = signal(false);
  isClosing = signal(false);

  private readonly currentUrl = toSignal(
    this.router.events.pipe(
      filter(e => e instanceof NavigationEnd),
      map(e => (e as NavigationEnd).urlAfterRedirects),
      startWith(this.router.url),
    ),
    { initialValue: this.router.url },
  );

  readonly isOnCover = computed(() => {
    const url = this.currentUrl();
    return url === '/' || url === '';
  });

  isActive(path: string): boolean {
    return this.currentUrl().startsWith(path);
  }

  isActiveExact(path: string): boolean {
    const url = this.currentUrl();
    return url === path || url === path + '/';
  }

  open() {
    this.isOpen.set(true);
  }

  close() {
    this.isClosing.set(true);
    setTimeout(() => {
      this.isOpen.set(false);
      this.isClosing.set(false);
    }, 480);
  }

  @HostListener('document:keydown.escape')
  onEscape() {
    if (this.isOpen()) this.close();
  }

  navigate(route: string) {
    this.router.navigate([route]);
    this.close();
  }

  logout() {
    this.close();
    setTimeout(() => this.auth.requestLogout(), 480);
  }
}
