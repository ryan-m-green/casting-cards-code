import { Injectable, OnDestroy, inject } from '@angular/core';
import { Subscription } from 'rxjs';
import { CampaignHubService } from '../campaign-hub.service';
import {
  TimeCursorMovedEvent,
  PlayerNotesUpdatedEvent,
  DmNotesUpdatedEvent,
  DayAdvancedEvent,
  TimeOfDay,
} from '../../../shared/models/time-of-day.model';

@Injectable({ providedIn: 'root' })
export class TimeEventService implements OnDestroy {
  private hub = inject(CampaignHubService);
  private subscriptions: Subscription[] = [];

  readonly timeCursorMoved$ = this.hub.timeCursorMoved$;
  readonly playerNotesUpdated$ = this.hub.playerNotesUpdated$;
  readonly dmNotesUpdated$ = this.hub.dmNotesUpdated$;
  readonly timeOfDayUpdated$ = this.hub.timeOfDayUpdated$;
  readonly dayAdvanced$ = this.hub.dayAdvanced$;

  constructor() {
    this.subscriptions.push(
      this.hub.timeCursorMoved$.subscribe(),
      this.hub.playerNotesUpdated$.subscribe(),
      this.hub.dmNotesUpdated$.subscribe(),
      this.hub.timeOfDayUpdated$.subscribe(),
      this.hub.dayAdvanced$.subscribe()
    );
  }

  ngOnDestroy() {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }
}
