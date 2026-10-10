import { Injectable, OnDestroy, inject } from '@angular/core';
import { Subscription } from 'rxjs';
import { CampaignHubService } from '../campaign-hub.service';
import {
  CardVisibilityChangedEvent,
  BulkCardVisibilityChangedEvent,
} from '../../../shared/models/secret.model';

@Injectable({ providedIn: 'root' })
export class CardEventService implements OnDestroy {
  private hub = inject(CampaignHubService);
  private subscriptions: Subscription[] = [];

  readonly cardVisibilityChanged$ = this.hub.cardVisibilityChanged$;
  readonly bulkCardVisibilityChanged$ = this.hub.bulkCardVisibilityChanged$;

  constructor() {
    this.subscriptions.push(
      this.hub.cardVisibilityChanged$.subscribe(),
      this.hub.bulkCardVisibilityChanged$.subscribe()
    );
  }

  ngOnDestroy() {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }
}
