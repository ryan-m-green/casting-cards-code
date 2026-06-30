import { Component, OnInit, OnDestroy, signal, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { catchError, of } from 'rxjs';
import { Subscription } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { PlayerCampaignShellService } from '../../../core/player-campaign-shell.service';
import { CampaignHubService } from '../../../core/hub/campaign-hub.service';
import { PlayerEventsComponent } from '../player-events/player-events.component';
import { ChroniclesTimelineComponent } from '../../../shared/components/chronicles-timeline/chronicles-timeline.component';
import { StorylineFilterBarComponent } from '../../../shared/components/storyline-filter-bar/storyline-filter-bar.component';
import type { ChroniclesResponse } from '../../../shared/models/chronicle.model';
import type { TimeOfDay } from '../../../shared/models/time-of-day.model';

type PlayerPlotTab = 'storyline' | 'chronicles';

// Player plot component with tabs for storyline and chronicles
@Component({
  selector: 'app-player-plot',
  standalone: true,
  imports: [CommonModule, PlayerEventsComponent, ChroniclesTimelineComponent, StorylineFilterBarComponent],
  templateUrl: './player-plot.component.html',
  styleUrl: './player-plot.component.scss',
})
export class PlayerPlotComponent implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private shellSvc = inject(PlayerCampaignShellService);
  private http = inject(HttpClient);
  private hub = inject(CampaignHubService);
  private hubSubscriptions: Subscription[] = [];

  campaignId = '';
  activeTab = signal<PlayerPlotTab>('storyline');

  timeOfDay = computed(() => this.shellSvc.campaign()?.timeOfDay ?? null);

  // Chronicles state
  chronicles = signal<ChroniclesResponse | null>(null);
  chroniclesLoading = signal(false);
  chroniclesPage = signal(1);
  chroniclesPageSize = 5;
  chroniclesSearchQuery = signal('');
  chroniclesTypeFilters = signal<string[]>([]);
  expandedSessionIds = signal<Set<string>>(new Set());

  setTab(tab: PlayerPlotTab) {
    this.activeTab.set(tab);
    if (tab === 'chronicles') this.loadChronicles();
  }

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id')!;
    this.campaignId = id;
    this.shellSvc.setTitleContext({ pageType: 'player-plot', campaignId: id, campaignName: this.shellSvc.campaign()?.name, baseRoute: '/player/campaign', location: null });

    this.hubSubscriptions.push(
      this.hub.sessionEnded$.subscribe(e => {
        if (!e || e.campaignId !== this.campaignId) return;
        if (this.activeTab() === 'chronicles') {
          this.loadChronicles();
        }
      })
    );
  }

  ngOnDestroy() {
    this.hubSubscriptions.forEach(sub => sub.unsubscribe());
  }

  loadChronicles(searchQuery?: string, typeFilters?: string[]) {
    this.chronicles.set(null);
    this.chroniclesLoading.set(true);
    const params = new URLSearchParams({
      pageNumber: this.chroniclesPage().toString(),
      pageSize: this.chroniclesPageSize.toString()
    });
    const actualSearchQuery = searchQuery ?? this.chroniclesSearchQuery();
    const actualTypeFilters = typeFilters ?? this.chroniclesTypeFilters();
    if (actualSearchQuery) {
      params.set('searchQuery', actualSearchQuery);
    }
    if (actualTypeFilters.length > 0) {
      actualTypeFilters.forEach(filter => {
        params.append('typeFilters', filter);
      });
    }

    this.http.get<ChroniclesResponse>(`${environment.apiUrl}/api/campaigns/${this.campaignId}/chronicles/sessions-paged?${params}`)
      .pipe(catchError(() => of(null)))
      .subscribe(data => {
        this.chronicles.set(data);
        // Initialize all sessions as expanded
        if (data) {
          const allSessionIds = new Set(data.sessions.map(s => s.sessionId));
          this.expandedSessionIds.set(allSessionIds);
        }
        this.chroniclesLoading.set(false);
      });
  }

  toggleSessionExpand(sessionId: string) {
    const current = new Set(this.expandedSessionIds());
    if (current.has(sessionId)) {
      current.delete(sessionId);
    } else {
      current.add(sessionId);
    }
    this.expandedSessionIds.set(current);
  }

  getIconForType(type: string): string {
    const icons: Record<string, string> = {
      cast: 'user',
      faction: 'shield',
      location: 'map-pin',
      sublocation: 'home',
      player: 'users',
      campaign: 'book',
      handout: 'file-text'
    };
    return icons[type] || 'circle';
  }

  onChronicleSearch(payload: { query: string; filters: string[] }) {
    this.chroniclesSearchQuery.set(payload.query);
    this.chroniclesTypeFilters.set(payload.filters);
    this.chroniclesPage.set(1);
    this.loadChronicles(payload.query, payload.filters);
  }

  onChronicleTypeFilterChange(filters: string[]) {
    this.chroniclesTypeFilters.set(filters);
    this.chroniclesPage.set(1);
    this.loadChronicles(this.chroniclesSearchQuery(), filters);
  }

  chronicleNextPage() {
    const current = this.chroniclesPage();
    const total = this.chronicles()?.totalPages ?? 1;
    if (current < total) {
      this.chroniclesPage.set(current + 1);
      this.loadChronicles();
    }
  }

  chroniclePrevPage() {
    const current = this.chroniclesPage();
    if (current > 1) {
      this.chroniclesPage.set(current - 1);
      this.loadChronicles();
    }
  }
}
