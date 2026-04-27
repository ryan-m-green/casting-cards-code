import { Injectable, signal } from '@angular/core';
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

@Injectable({ providedIn: 'root' })
export class CampaignHubService {
  private connection: signalR.HubConnection | null = null;

  readonly secretRevealed            = signal<SecretRevealedEvent | null>(null);
  readonly secretDelivered           = signal<SecretDeliveredEvent | null>(null);
  readonly secretResealed            = signal<SecretResealedEvent | null>(null);
  readonly cardVisibilityChanged     = signal<CardVisibilityChangedEvent | null>(null);
  readonly bulkCardVisibilityChanged = signal<BulkCardVisibilityChangedEvent | null>(null);
  readonly noteUpdated               = signal<{ entityType: string; instanceId: string } | null>(null);
  readonly timeCursorMoved           = signal<TimeCursorMovedEvent | null>(null);
  readonly playerNotesUpdated        = signal<PlayerNotesUpdatedEvent | null>(null);
  readonly dmNotesUpdated            = signal<DmNotesUpdatedEvent | null>(null);
  readonly timeOfDayUpdated          = signal<TimeOfDay | null>(null);
  readonly dayAdvanced               = signal<DayAdvancedEvent | null>(null);
  readonly goldAwarded               = signal<GoldAwardedEvent[]>([]);
  readonly conditionRemoved          = signal<ConditionRemovedEvent | null>(null);
  readonly conditionAssigned         = signal<ConditionAssignedEvent | null>(null);
  readonly secretShared              = signal<SecretSharedEvent | null>(null);
  readonly playerSecretDeleted       = signal<PlayerSecretDeletedEvent | null>(null);
  readonly playerJoined              = signal<PlayerJoinedEvent | null>(null);
  readonly playerRemoved             = signal<PlayerRemovedEvent | null>(null);
  readonly castTravelled             = signal<CastTravelledEvent | null>(null);
  readonly isConnected               = signal(false);

  async connect(token: string): Promise<void> {
    this.connection = new signalR.HubConnectionBuilder()
      .withUrl(`${environment.apiUrl}/hubs/campaign`, {
        accessTokenFactory: () => token,
      })
      .withAutomaticReconnect()
      .build();

    this.connection.on('SecretRevealed', (event: SecretRevealedEvent) => {
      this.secretRevealed.set(event);
    });

    this.connection.on('SecretDelivered', (event: SecretDeliveredEvent) => {
      this.secretDelivered.set(event);
    });

    this.connection.on('SecretResealed', (event: SecretResealedEvent) => {
      this.secretResealed.set(event);
    });

    this.connection.on('CardVisibilityChanged', (event: CardVisibilityChangedEvent) => {
      this.cardVisibilityChanged.set(event);
    });

    this.connection.on('BulkCardVisibilityChanged', (event: BulkCardVisibilityChangedEvent) => {
      this.bulkCardVisibilityChanged.set(event);
    });

    this.connection.on('NoteUpdated', (event: { entityType: string; instanceId: string }) => {
      this.noteUpdated.set(event);
    });

    this.connection.on('TimeCursorMoved', (event: TimeCursorMovedEvent) => {
      this.timeCursorMoved.set(event);
    });

    this.connection.on('PlayerNotesUpdated', (event: PlayerNotesUpdatedEvent) => {
      this.playerNotesUpdated.set(event);
    });

    this.connection.on('DmNotesUpdated', (event: DmNotesUpdatedEvent) => {
      this.dmNotesUpdated.set(event);
    });

    this.connection.on('TimeOfDayUpdated', (tod: TimeOfDay) => {
      this.timeOfDayUpdated.set(tod);
    });

    this.connection.on('DayAdvanced', (event: DayAdvancedEvent) => {
      this.dayAdvanced.set(event);
    });

    this.connection.on('GoldAwarded', (event: GoldAwardedEvent) => {
      this.goldAwarded.update(q => [...q, event]);
    });

    this.connection.on('ConditionRemoved', (event: ConditionRemovedEvent) => {
      this.conditionRemoved.set(event);
    });

    this.connection.on('ConditionAssigned', (event: ConditionAssignedEvent) => {
      this.conditionAssigned.set(event);
    });

    this.connection.on('SecretShared', (event: SecretSharedEvent) => {
      this.secretShared.set(event);
    });

    this.connection.on('PlayerSecretDeleted', (event: PlayerSecretDeletedEvent) => {
      this.playerSecretDeleted.set(event);
    });

    this.connection.on('PlayerJoined', (event: PlayerJoinedEvent) => {
      this.playerJoined.set(event);
    });

    this.connection.on('PlayerRemoved', (event: PlayerRemovedEvent) => {
      this.playerRemoved.set(event);
    });

    this.connection.on('CastTravelled', (event: CastTravelledEvent) => {
      this.castTravelled.set(event);
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
