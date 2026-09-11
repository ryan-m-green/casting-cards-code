import { Injectable, OnDestroy, inject } from '@angular/core';
import { Subscription } from 'rxjs';
import { CampaignHubService } from '../campaign-hub.service';

export interface StorylineEventUpdatedEvent {
  campaignId: string;
  eventId: string;
  sceneType: 'campaign-event' | 'campaign-handout';
  title: string;
  body: string;
  imageUrl: string | null;
}

export interface CampaignNavChangedEvent {
  campaignId: string;
}

export interface NoteUpdatedEvent {
  entityType: string;
  instanceId: string;
  campaignId: string;
}

export interface QuickNoteQueuedEvent {
  campaignId: string;
}

export interface SubscriptionLockLevelChangedEvent {
  userId: string;
  lockLevel: string;
}

export interface SoundtrackTriggeredEvent {
  campaignId: string;
  soundtrackId: string;
}

@Injectable({ providedIn: 'root' })
export class CampaignEventService implements OnDestroy {
  private hub = inject(CampaignHubService);
  private subscriptions: Subscription[] = [];

  readonly storylineEventUpdated$ = this.hub.storylineEventUpdated$;
  readonly campaignNavChanged$ = this.hub.campaignNavChanged$;
  readonly noteUpdated$ = this.hub.noteUpdated$;
  readonly quickNoteQueued$ = this.hub.quickNoteQueued$;
  readonly subscriptionLockLevelChanged$ = this.hub.subscriptionLockLevelChanged$;
  readonly soundtrackTriggered$ = this.hub.soundtrackTriggered$;

  constructor() {
    this.subscriptions.push(
      this.hub.storylineEventUpdated$.subscribe(),
      this.hub.campaignNavChanged$.subscribe(),
      this.hub.noteUpdated$.subscribe(),
      this.hub.quickNoteQueued$.subscribe(),
      this.hub.subscriptionLockLevelChanged$.subscribe(),
      this.hub.soundtrackTriggered$.subscribe()
    );
  }

  ngOnDestroy() {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }
}
