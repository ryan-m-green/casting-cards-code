import { Injectable, OnDestroy, inject } from '@angular/core';
import { Subscription } from 'rxjs';
import { CampaignHubService } from '../campaign-hub.service';
import {
  SecretRevealedEvent,
  SecretResealedEvent,
  SecretCreatedEvent,
  SecretDeletedEvent,
  SecretDeliveredEvent,
  SecretSharedEvent,
  PlayerSecretDeletedEvent,
} from '../../../shared/models/secret.model';

@Injectable({ providedIn: 'root' })
export class SecretEventService implements OnDestroy {
  private hub = inject(CampaignHubService);
  private subscriptions: Subscription[] = [];

  readonly secretRevealed$ = this.hub.secretRevealed$;
  readonly secretResealed$ = this.hub.secretResealed$;
  readonly secretCreated$ = this.hub.secretCreated$;
  readonly secretDeleted$ = this.hub.secretDeleted$;
  readonly secretDelivered$ = this.hub.secretDelivered$;
  readonly secretShared$ = this.hub.secretShared$;
  readonly playerSecretDeleted$ = this.hub.playerSecretDeleted$;

  constructor() {
    this.subscriptions.push(
      this.hub.secretRevealed$.subscribe(),
      this.hub.secretResealed$.subscribe(),
      this.hub.secretCreated$.subscribe(),
      this.hub.secretDeleted$.subscribe(),
      this.hub.secretDelivered$.subscribe(),
      this.hub.secretShared$.subscribe(),
      this.hub.playerSecretDeleted$.subscribe()
    );
  }

  async revealSecret(campaignId: string, secretId: string): Promise<void> {
    await this.hub.revealSecret(campaignId, secretId);
  }

  ngOnDestroy() {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }
}
