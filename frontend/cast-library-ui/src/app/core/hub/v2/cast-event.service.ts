import { Injectable, OnDestroy, inject } from '@angular/core';
import { Subscription } from 'rxjs';
import { CampaignHubService } from '../campaign-hub.service';

export interface CastTraveledEvent {
  campaignId: string;
  castInstanceId: string;
  fromSublocationInstanceId: string | null;
  toLocationInstanceId: string;
  toSublocationInstanceId: string;
  traveledToTheParty: boolean;
  isVisible: boolean;
}

@Injectable({ providedIn: 'root' })
export class CastEventService implements OnDestroy {
  private hub = inject(CampaignHubService);
  private subscriptions: Subscription[] = [];

  readonly castTravel$ = this.hub.castTravel$;

  constructor() {
    this.subscriptions.push(
      this.hub.castTravel$.subscribe()
    );
  }

  ngOnDestroy() {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }
}
