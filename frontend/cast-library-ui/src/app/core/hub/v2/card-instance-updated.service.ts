import { Injectable, OnDestroy, inject } from '@angular/core';
import { Subscription } from 'rxjs';
import { CampaignHubService } from '../campaign-hub.service';

export interface CastInstanceUpdatedEvent {
  campaignId: string;
  castInstanceId: string;
}

export interface LocationInstanceUpdatedEvent {
  campaignId: string;
  locationInstanceId: string;
}

export interface SublocationInstanceUpdatedEvent {
  campaignId: string;
  sublocationInstanceId: string;
}

export interface FactionInstanceUpdatedEvent {
  campaignId: string;
  factionInstanceId: string;
}

@Injectable({ providedIn: 'root' })
export class CardInstanceUpdatedService implements OnDestroy {
  private hub = inject(CampaignHubService);
  private subscriptions: Subscription[] = [];

  readonly castInstanceUpdated$ = this.hub.castInstanceUpdated$;
  readonly locationInstanceUpdated$ = this.hub.locationInstanceUpdated$;
  readonly sublocationInstanceUpdated$ = this.hub.sublocationInstanceUpdated$;
  readonly factionInstanceUpdated$ = this.hub.factionInstanceUpdated$;

  constructor() {
    console.log('CardInstanceUpdatedService initialized');
    this.subscriptions.push(
      this.hub.castInstanceUpdated$.subscribe(event => {
        console.log('CardInstanceUpdatedService - castInstanceUpdated$ received:', event);
      }),
      this.hub.locationInstanceUpdated$.subscribe(event => {
        console.log('CardInstanceUpdatedService - locationInstanceUpdated$ received:', event);
      }),
      this.hub.sublocationInstanceUpdated$.subscribe(event => {
        console.log('CardInstanceUpdatedService - sublocationInstanceUpdated$ received:', event);
      }),
      this.hub.factionInstanceUpdated$.subscribe(event => {
        console.log('CardInstanceUpdatedService - factionInstanceUpdated$ received:', event);
      })
    );
  }

  ngOnDestroy() {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }
}
