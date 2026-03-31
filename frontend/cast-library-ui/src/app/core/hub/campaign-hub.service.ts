import { Injectable, signal } from '@angular/core';
import * as signalR from '@microsoft/signalr';
import { environment } from '../../../environments/environment';
import { SecretRevealedEvent } from '../../shared/models/secret.model';

@Injectable({ providedIn: 'root' })
export class CampaignHubService {
  private connection: signalR.HubConnection | null = null;

  readonly secretRevealed = signal<SecretRevealedEvent | null>(null);
  readonly noteUpdated    = signal<{ entityType: string; instanceId: string } | null>(null);
  readonly isConnected    = signal(false);

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

    this.connection.on('NoteUpdated', (event: { entityType: string; instanceId: string }) => {
      this.noteUpdated.set(event);
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
