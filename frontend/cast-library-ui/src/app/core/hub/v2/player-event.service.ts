import { Injectable, OnDestroy, inject } from '@angular/core';
import { Subscription } from 'rxjs';
import { CampaignHubService } from '../campaign-hub.service';
import { CampaignPlayer } from '../../../shared/models/campaign.model';
import { GoldAwardedEvent, ConditionRemovedEvent, ConditionAssignedEvent } from '../../../shared/models/player-card.model';

export interface PlayerJoinedEvent {
  campaignId: string;
  player: CampaignPlayer;
}

export interface PlayerRemovedEvent {
  campaignId: string;
}

export interface PlayerNotesUpdatedEvent {
  campaignId: string;
  playerUserId: string;
  notes: string;
}

export interface InventoryItemUsedEvent {
  campaignId: string;
  playerUserId: string;
  inventoryItemId: string;
}

@Injectable({ providedIn: 'root' })
export class PlayerEventService implements OnDestroy {
  private hub = inject(CampaignHubService);
  private subscriptions: Subscription[] = [];

  readonly playerJoined$ = this.hub.playerJoined$;
  readonly playerRemoved$ = this.hub.playerRemoved$;
  readonly playerNotesUpdated$ = this.hub.playerNotesUpdated$;
  readonly goldAwarded$ = this.hub.goldAwarded$;
  readonly conditionRemoved$ = this.hub.conditionRemoved$;
  readonly conditionAssigned$ = this.hub.conditionAssigned$;
  readonly inventoryItemUsed$ = this.hub.inventoryItemUsed$;

  constructor() {
    this.subscriptions.push(
      this.hub.playerJoined$.subscribe(),
      this.hub.playerRemoved$.subscribe(),
      this.hub.playerNotesUpdated$.subscribe(),
      this.hub.goldAwarded$.subscribe(),
      this.hub.conditionRemoved$.subscribe(),
      this.hub.conditionAssigned$.subscribe(),
      this.hub.inventoryItemUsed$.subscribe()
    );
  }

  ngOnDestroy() {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }
}
