import { Injectable, OnDestroy, inject } from '@angular/core';
import { Subscription } from 'rxjs';
import { CampaignHubService } from '../campaign-hub.service';

export interface FactionRemovedEvent {
  campaignId: string;
  factionInstanceId: string;
}

export interface FactionLockedEvent {
  campaignId: string;
  factionInstanceId: string;
}

export interface FactionSymbolAssignedEvent {
  campaignId: string;
  instanceId: string;
  entityType: 'cast' | 'sublocation';
  factionInstanceIds: string[];
  tickCount: number;
}

@Injectable({ providedIn: 'root' })
export class FactionEventService implements OnDestroy {
  private hub = inject(CampaignHubService);
  private subscriptions: Subscription[] = [];

  readonly factionRemoved$ = this.hub.factionRemoved$;
  readonly factionLocked$ = this.hub.factionLocked$;
  readonly factionSymbolAssigned$ = this.hub.factionSymbolAssigned$;

  constructor() {
    this.subscriptions.push(
      this.hub.factionRemoved$.subscribe(),
      this.hub.factionLocked$.subscribe(),
      this.hub.factionSymbolAssigned$.subscribe()
    );
  }

  ngOnDestroy() {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }
}
