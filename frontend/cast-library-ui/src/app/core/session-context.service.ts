import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { Session } from '../shared/models/session.model';
import { SessionService } from './session.service';
import { CampaignHubService, SessionStartedEvent, SessionEndedEvent, SessionCancelledEvent } from './hub/campaign-hub.service';

@Injectable({ providedIn: 'root' })
export class SessionContextService {
  constructor(
    private sessionService: SessionService,
    private campaignHubService: CampaignHubService
  ) {
    this.subscribeToSignalREvents();
  }

  getActiveSession(campaignId: string): Observable<Session | null> {
    return this.sessionService.getActiveSession(campaignId);
  }

  private subscribeToSignalREvents(): void {
    // SignalR events are handled by individual components subscribing to getActiveSession
    // This service is kept simple to match the working pattern in other components
  }

  // Clear cache for a specific campaign (useful when leaving a campaign)
  clearCampaignCache(campaignId: string): void {
    // No-op for now since we're using the simple pattern
  }
}
