import { Injectable, OnDestroy, inject } from '@angular/core';
import { Subscription } from 'rxjs';
import { CampaignHubService } from '../campaign-hub.service';

export interface SessionDeletedEvent {
  sessionId: string;
}

export interface SessionEndedEvent {
  campaignId: string;
  archivedSessionId: string;
  timestamp: number;
}

export interface SessionStartedEvent {
  campaignId: string;
  sessionId: string;
  sessionNumber: number;
  startDay: number;
  timestamp: number;
}

export interface SessionCancelledEvent {
  campaignId: string;
  timestamp: number;
}

@Injectable({ providedIn: 'root' })
export class SessionEventService implements OnDestroy {
  private hub = inject(CampaignHubService);
  private subscriptions: Subscription[] = [];

  readonly sessionDeleted$ = this.hub.sessionDeleted$;
  readonly sessionEnded$ = this.hub.sessionEnded$;
  readonly sessionStarted$ = this.hub.sessionStarted$;
  readonly sessionCancelled$ = this.hub.sessionCancelled$;

  constructor() {
    this.subscriptions.push(
      this.hub.sessionDeleted$.subscribe(),
      this.hub.sessionEnded$.subscribe(),
      this.hub.sessionStarted$.subscribe(),
      this.hub.sessionCancelled$.subscribe()
    );
  }

  ngOnDestroy() {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }
}
