import { Injectable, signal, computed, OnDestroy } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { Subscription, LockLevel } from '../shared/models/subscription.model';
import { StripeService } from './stripe.service';

@Injectable({ providedIn: 'root' })
export class SubscriptionService implements OnDestroy {
  private _subscription = signal<Subscription | null>(null);
  readonly subscription = this._subscription.asReadonly();
  readonly lockLevel = signal<LockLevel>('Suspended');
  readonly bypassPayment = signal(false);
  readonly isFreeTrial = computed(() => this._subscription()?.status === 'FreeTrial');
  readonly canUpgrade = computed(() => {
    const sub = this._subscription();
    return sub?.status === 'FreeTrial' && !sub.bypassPayment;
  });
  readonly isFullAccess = computed(() => this.lockLevel() === 'FullAccess');
  readonly isSoftLock = computed(() => this.lockLevel() === 'SoftLock');
  readonly isHardLock = computed(() => this.lockLevel() === 'HardLock');
  readonly isSuspended = computed(() => this.lockLevel() === 'Suspended');
  readonly isExempt = computed(() => this.bypassPayment());
  private refreshInterval: any;

  constructor(private http: HttpClient, private stripe: StripeService) {
    this.loadSubscription();
    // Refresh subscription every 30 seconds to catch webhook changes
    this.refreshInterval = setInterval(() => {
      console.log('SubscriptionService: Periodic subscription refresh');
      this.loadSubscription();
    }, 30000);
  }

  ngOnDestroy(): void {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }
  }

  loadSubscription(): void {
    this.stripe.getUserSubscription().subscribe({
      next: (sub) => {
        this._subscription.set(sub);
        if (sub) {
          this.lockLevel.set(sub.lockLevel);
          this.bypassPayment.set(sub.bypassPayment);
        }
      },
      error: () => this._subscription.set(null)
    });
  }

  refreshSubscription(): void {
    console.log('SubscriptionService: Manual subscription refresh triggered');
    this.loadSubscription();
  }
}
