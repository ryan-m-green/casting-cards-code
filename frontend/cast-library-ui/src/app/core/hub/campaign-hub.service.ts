import { Injectable } from '@angular/core';
import { signal } from '@angular/core';
import { Subject, Observable } from 'rxjs';
import * as signalR from '@microsoft/signalr';
import { environment } from '../../../environments/environment';
import {
  SecretRevealedEvent,
  SecretResealedEvent,
  CardVisibilityChangedEvent,
  BulkCardVisibilityChangedEvent,
  SecretDeliveredEvent,
  SecretSharedEvent,
  PlayerSecretDeletedEvent,
} from '../../shared/models/secret.model';
import {
  TimeCursorMovedEvent,
  PlayerNotesUpdatedEvent,
  DmNotesUpdatedEvent,
  DayAdvancedEvent,
  TimeOfDay,
} from '../../shared/models/time-of-day.model';
import { GoldAwardedEvent, ConditionRemovedEvent, ConditionAssignedEvent } from '../../shared/models/player-card.model';
import { CampaignPlayer } from '../../shared/models/campaign.model';

export interface PlayerJoinedEvent {
  campaignId: string;
  player: CampaignPlayer;
}

export interface PlayerRemovedEvent {
  campaignId: string;
}

export interface CastTravelledEvent {
  campaignId: string;
  castInstanceId: string;
  fromSublocationInstanceId: string | null;
  toLocationInstanceId: string;
  toSublocationInstanceId: string;
}

export interface FactionRemovedEvent {
  campaignId: string;
  factionInstanceId: string;
}

export interface FactionLockedEvent {
  campaignId: string;
  factionInstanceId: string;
}

export interface StorylineEventUpdatedEvent {
  campaignId: string;
  eventId: string;
  title: string;
  body: string;
  imageUrl: string | null;
}


export interface ShopItemUpdatedEvent {
  campaignId: string;
  sublocationInstanceId: string;
  shopItemId: string;
}

export interface ShopItemScratchToggledEvent {
  campaignId: string;
  sublocationInstanceId: string;
  shopItemId: string;
  isScratchedOff: boolean;
}

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
export class CampaignHubService {
  private connection: signalR.HubConnection | null = null;

  private secretRevealedSubject            = new Subject<SecretRevealedEvent | null>();
  private secretDeliveredSubject           = new Subject<SecretDeliveredEvent | null>();
  private secretResealedSubject            = new Subject<SecretResealedEvent | null>();
  private cardVisibilityChangedSubject     = new Subject<CardVisibilityChangedEvent | null>();
  private bulkCardVisibilityChangedSubject = new Subject<BulkCardVisibilityChangedEvent | null>();
  private noteUpdatedSubject               = new Subject<{ entityType: string; instanceId: string; campaignId: string } | null>();
  private quickNoteQueuedSubject           = new Subject<{ campaignId: string } | null>();
  private timeCursorMovedSubject           = new Subject<TimeCursorMovedEvent | null>();
  private playerNotesUpdatedSubject        = new Subject<PlayerNotesUpdatedEvent | null>();
  private dmNotesUpdatedSubject            = new Subject<DmNotesUpdatedEvent | null>();
  private timeOfDayUpdatedSubject          = new Subject<TimeOfDay | null>();
  private dayAdvancedSubject               = new Subject<DayAdvancedEvent | null>();
  private goldAwardedSubject               = new Subject<GoldAwardedEvent[]>();
  private conditionRemovedSubject          = new Subject<ConditionRemovedEvent | null>();
  private conditionAssignedSubject         = new Subject<ConditionAssignedEvent | null>();
  private secretSharedSubject              = new Subject<SecretSharedEvent | null>();
  private playerSecretDeletedSubject       = new Subject<PlayerSecretDeletedEvent | null>();
  private playerJoinedSubject              = new Subject<PlayerJoinedEvent | null>();
  private playerRemovedSubject             = new Subject<PlayerRemovedEvent | null>();
  private castTravelledSubject             = new Subject<CastTravelledEvent | null>();
  private factionRemovedSubject            = new Subject<FactionRemovedEvent | null>();
  private factionLockedSubject             = new Subject<FactionLockedEvent | null>();
  private shopItemUpdatedSubject            = new Subject<ShopItemUpdatedEvent | null>();
  private shopItemScratchToggledSubject     = new Subject<ShopItemScratchToggledEvent | null>();
  private castInstanceUpdatedSubject        = new Subject<CastInstanceUpdatedEvent | null>();
  private locationInstanceUpdatedSubject    = new Subject<LocationInstanceUpdatedEvent | null>();
  private sublocationInstanceUpdatedSubject = new Subject<SublocationInstanceUpdatedEvent | null>();
  private factionInstanceUpdatedSubject     = new Subject<FactionInstanceUpdatedEvent | null>();
  private storylineEventUpdatedSubject      = new Subject<StorylineEventUpdatedEvent | null>();
  private campaignNavChangedSubject          = new Subject<{ campaignId: string } | null>();
  readonly isConnected = signal(false);

  readonly secretRevealed$            = this.secretRevealedSubject.asObservable();
  readonly secretDelivered$           = this.secretDeliveredSubject.asObservable();
  readonly secretResealed$            = this.secretResealedSubject.asObservable();
  readonly cardVisibilityChanged$     = this.cardVisibilityChangedSubject.asObservable();
  readonly bulkCardVisibilityChanged$ = this.bulkCardVisibilityChangedSubject.asObservable();
  readonly noteUpdated$               = this.noteUpdatedSubject.asObservable();
  readonly quickNoteQueued$           = this.quickNoteQueuedSubject.asObservable();
  readonly timeCursorMoved$           = this.timeCursorMovedSubject.asObservable();
  readonly playerNotesUpdated$        = this.playerNotesUpdatedSubject.asObservable();
  readonly dmNotesUpdated$            = this.dmNotesUpdatedSubject.asObservable();
  readonly timeOfDayUpdated$          = this.timeOfDayUpdatedSubject.asObservable();
  readonly dayAdvanced$               = this.dayAdvancedSubject.asObservable();
  readonly goldAwarded$               = this.goldAwardedSubject.asObservable();
  readonly conditionRemoved$          = this.conditionRemovedSubject.asObservable();
  readonly conditionAssigned$         = this.conditionAssignedSubject.asObservable();
  readonly secretShared$              = this.secretSharedSubject.asObservable();
  readonly playerSecretDeleted$       = this.playerSecretDeletedSubject.asObservable();
  readonly playerJoined$              = this.playerJoinedSubject.asObservable();
  readonly playerRemoved$             = this.playerRemovedSubject.asObservable();
  readonly castTravelled$             = this.castTravelledSubject.asObservable();
  readonly factionRemoved$            = this.factionRemovedSubject.asObservable();
  readonly factionLocked$             = this.factionLockedSubject.asObservable();
  readonly shopItemUpdated$            = this.shopItemUpdatedSubject.asObservable();
  readonly shopItemScratchToggled$     = this.shopItemScratchToggledSubject.asObservable();
  readonly castInstanceUpdated$        = this.castInstanceUpdatedSubject.asObservable();
  readonly locationInstanceUpdated$    = this.locationInstanceUpdatedSubject.asObservable();
  readonly sublocationInstanceUpdated$ = this.sublocationInstanceUpdatedSubject.asObservable();
  readonly factionInstanceUpdated$     = this.factionInstanceUpdatedSubject.asObservable();
  readonly storylineEventUpdated$      = this.storylineEventUpdatedSubject.asObservable();
  readonly campaignNavChanged$          = this.campaignNavChangedSubject.asObservable();

  async connect(token: string): Promise<void> {
    this.connection = new signalR.HubConnectionBuilder()
      .withUrl(`${environment.apiUrl}/hubs/campaign`, {
        accessTokenFactory: () => token,
      })
      .withAutomaticReconnect()
      .build();

    this.connection.on('SecretRevealed', (event: SecretRevealedEvent) => {
      this.secretRevealedSubject.next(event);
    });

    this.connection.on('SecretDelivered', (event: SecretDeliveredEvent) => {
      this.secretDeliveredSubject.next(event);
    });

    this.connection.on('SecretResealed', (event: SecretResealedEvent) => {
      this.secretResealedSubject.next(event);
    });

    this.connection.on('CardVisibilityChanged', (event: CardVisibilityChangedEvent) => {
      this.cardVisibilityChangedSubject.next(event);
    });

    this.connection.on('BulkCardVisibilityChanged', (event: BulkCardVisibilityChangedEvent) => {
      this.bulkCardVisibilityChangedSubject.next(event);
    });

    this.connection.on('NoteUpdated', (event: { entityType: string; instanceId: string; campaignId: string }) => {
      this.noteUpdatedSubject.next(event);
    });

    this.connection.on('QuickNoteQueued', (event: { campaignId: string }) => {
      this.quickNoteQueuedSubject.next(event);
    });

    this.connection.on('TimeCursorMoved', (event: TimeCursorMovedEvent) => {
      this.timeCursorMovedSubject.next(event);
    });

    this.connection.on('PlayerNotesUpdated', (event: PlayerNotesUpdatedEvent) => {
      this.playerNotesUpdatedSubject.next(event);
    });

    this.connection.on('DmNotesUpdated', (event: DmNotesUpdatedEvent) => {
      this.dmNotesUpdatedSubject.next(event);
    });

    this.connection.on('TimeOfDayUpdated', (tod: TimeOfDay) => {
      this.timeOfDayUpdatedSubject.next(tod);
    });

    this.connection.on('DayAdvanced', (event: DayAdvancedEvent) => {
      this.dayAdvancedSubject.next(event);
    });

    this.connection.on('GoldAwarded', (event: GoldAwardedEvent) => {
      this.goldAwardedSubject.next([event]);
    });

    this.connection.on('ConditionRemoved', (event: ConditionRemovedEvent) => {
      this.conditionRemovedSubject.next(event);
    });

    this.connection.on('ConditionAssigned', (event: ConditionAssignedEvent) => {
      this.conditionAssignedSubject.next(event);
    });

    this.connection.on('SecretShared', (event: SecretSharedEvent) => {
      this.secretSharedSubject.next(event);
    });

    this.connection.on('PlayerSecretDeleted', (event: PlayerSecretDeletedEvent) => {
      this.playerSecretDeletedSubject.next(event);
    });

    this.connection.on('PlayerJoined', (event: PlayerJoinedEvent) => {
      this.playerJoinedSubject.next(event);
    });

    this.connection.on('PlayerRemoved', (event: PlayerRemovedEvent) => {
      this.playerRemovedSubject.next(event);
    });

    this.connection.on('CastTravelled', (event: CastTravelledEvent) => {
      this.castTravelledSubject.next(event);
    });

    this.connection.on('FactionRemoved', (event: FactionRemovedEvent) => {
      this.factionRemovedSubject.next(event);
    });

    this.connection.on('FactionLocked', (event: FactionLockedEvent) => {
      this.factionLockedSubject.next(event);
    });


    this.connection.on('ShopItemUpdated', (event: ShopItemUpdatedEvent) => {
      this.shopItemUpdatedSubject.next(event);
    });

    this.connection.on('ShopItemScratchToggled', (event: ShopItemScratchToggledEvent) => {
      this.shopItemScratchToggledSubject.next(event);
    });

    this.connection.on('CastInstanceUpdated', (event: CastInstanceUpdatedEvent) => {
      this.castInstanceUpdatedSubject.next(event);
    });

    this.connection.on('LocationInstanceUpdated', (event: LocationInstanceUpdatedEvent) => {
      this.locationInstanceUpdatedSubject.next(event);
    });

    this.connection.on('SublocationInstanceUpdated', (event: SublocationInstanceUpdatedEvent) => {
      this.sublocationInstanceUpdatedSubject.next(event);
    });

    this.connection.on('FactionInstanceUpdated', (event: FactionInstanceUpdatedEvent) => {
      this.factionInstanceUpdatedSubject.next(event);
    });

    this.connection.on('StorylineEventUpdated', (event: StorylineEventUpdatedEvent) => {
      this.storylineEventUpdatedSubject.next(event);
    });

    this.connection.on('CampaignNavChanged', (event: { campaignId: string }) => {
      this.campaignNavChangedSubject.next(event);
    });

    this.connection.onclose(() => this.isConnected.set(false));
    this.connection.onreconnected(() => this.isConnected.set(true));

    await this.connection.start();
    this.isConnected.set(true);
  }

  async joinCampaign(campaignId: string): Promise<void> {
    await this.connection?.invoke('JoinCampaign', campaignId);
  }

  async leaveCampaign(campaignId: string): Promise<void> {
    await this.connection?.invoke('LeaveCampaign', campaignId);
  }

  async revealSecret(campaignId: string, secretId: string): Promise<void> {
    await this.connection?.invoke('RevealSecret', campaignId, secretId);
  }

  async disconnect(): Promise<void> {
    await this.connection?.stop();
    this.isConnected.set(false);
  }
}
