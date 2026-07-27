import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class SubscriptionDrawerService {
  private openRequest$ = new Subject<void>();

  readonly open$ = this.openRequest$.asObservable();

  open(): void {
    this.openRequest$.next();
  }
}
