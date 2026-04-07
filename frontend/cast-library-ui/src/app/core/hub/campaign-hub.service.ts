import { Injectable, signal } from '@angular/core';
import * as signalR from '@microsoft/signalr';
import { environment } from '../../../environments/environment';
import {
  SecretRevealedEvent,
  SecretResealedEvent,
  CardVisibilityChangedEvent,
  BulkCardVisibilityChangedEvent,
} from '../../shared/models/secret.model';
import {
  TimeCursorMovedEvent,
  PlayerNotesUpdatedEvent,
  DmNotesUpdatedEvent,
  TimeOfDay,
} from '../../shared/models/time-of-day.model';

@Injectable({ providedIn: 'root' })
export class CampaignHubService {
  private connection: signalR.HubConnection | null = null;

  readonly secretRevealed            = signal<SecretRevealedEvent | null>(null);
  readonly secretResealed            = signal<SecretResealedEvent | null>(null);
  readonly cardVisibilityChanged     = signal<CardVisibilityChangedEvent | null>(null);
  readonly bulkCardVisibilityChanged = signal<BulkCardVisibilityChangedEvent | null>(null);
  readonly noteUpdated               = signal<{ entityType: string; instanceId: string } | null>(null);
  readonly timeCursorMoved           = signal<TimeCursorMovedEvent | null>(null);
  readonly playerNotesUpdated        = signal<PlayerNotesUpdatedEvent | null>(null);
  readonly dmNotesUpdated            = signal<DmNotesUpdatedEvent | null>(null);
  readonly timeOfDayUpdated          = signal<TimeOfDay | null>(null);
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
