import { Component, OnInit, OnDestroy, signal, inject, computed } from '@angular/core';
import { Subscription } from 'rxjs';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { catchError, of } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { PlayerCampaignShellService } from '../../../core/player-campaign-shell.service';
import { CampaignHubService } from '../../../core/hub/campaign-hub.service';
import { PlayerEventCardItemComponent } from '../../../shared/components/player-event-card-item/player-event-card-item.component';

interface CampaignEvent {
  id: string;
  title: string;
  body: string;
  linkedEntityType: string | null;
  sortOrder: number;
  createdAt: string;
  imageUrl?: string;
}

@Component({
  selector: 'app-player-events',
  standalone: true,
  imports: [CommonModule, PlayerEventCardItemComponent],
  templateUrl: './player-events.component.html',
  styleUrl: './player-events.component.scss',
})
export class PlayerEventsComponent implements OnInit, OnDestroy {
  private route    = inject(ActivatedRoute);
  private router   = inject(Router);
  private http     = inject(HttpClient);
  private shellSvc = inject(PlayerCampaignShellService);
  private hub      = inject(CampaignHubService);
  private hubSubscriptions: Subscription[] = [];

  campaignId   = signal('');
  events       = signal<CampaignEvent[]>([]);
  loading      = signal(true);
  expandedId   = signal<string | null>(null);
  typeFilters  = signal<string[]>([]);

  filteredEvents = computed(() => {
    const types = this.typeFilters();
    if (types.length === 0) return this.events();
    return this.events().filter(ev => {
      const effectiveType = ev.imageUrl ? 'handout' : (ev.linkedEntityType ?? 'campaign');
      return types.includes(effectiveType);
    });
  });

  toggleTypeFilter(type: string) {
    const current = this.typeFilters();
    this.typeFilters.set(
      current.includes(type) ? current.filter(t => t !== type) : [...current, type]
    );
  }

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id')!;
    this.campaignId.set(id);
    this.shellSvc.setTitleContext({ pageType: 'player-events', campaignId: id, baseRoute: '/player/campaign', location: null });
    this.loadEvents(id);

    this.hubSubscriptions.push(
      this.hub.cardVisibilityChanged$.subscribe(e => {
        if (!e || e.campaignId !== this.campaignId()) return;
        if (e.cardType !== 'campaign-event') return;
        if (e.isVisible) {
          this.loadEvents(this.campaignId());
        } else {
          this.events.update(list => list.filter(ev => ev.id !== e.instanceId));
        }
      })
    );

    this.hubSubscriptions.push(
      this.hub.storylineEventUpdated$.subscribe(e => {
        if (!e || e.campaignId !== this.campaignId()) return;
        
        // Update the event in the local list with new content
        this.events.update(list => 
          list.map(ev => 
            ev.id === e.eventId 
              ? { ...ev, title: e.title, body: e.body, imageUrl: e.imageUrl ?? undefined }
              : ev
          )
        );
      })
    );
  }

  ngOnDestroy() {
    this.hubSubscriptions.forEach(sub => sub.unsubscribe());
  }

  private loadEvents(campaignId: string) {
    this.loading.set(true);
    this.http.get<CampaignEvent[]>(`${environment.apiUrl}/api/campaigns/${campaignId}/events/player`)
      .pipe(catchError(() => of([])))
      .subscribe(data => {
        this.events.set(data);
        this.loading.set(false);
      });
  }

  toggleExpand(id: string) {
    this.expandedId.set(this.expandedId() === id ? null : id);
  }

  goBack() {
    this.router.navigate(['/player/campaign', this.campaignId()]);
  }
}
