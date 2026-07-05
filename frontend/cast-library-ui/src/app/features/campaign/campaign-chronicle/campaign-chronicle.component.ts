import { Component, OnInit, OnDestroy, signal, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { catchError, of } from 'rxjs';
import { Subscription } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { CampaignShellService } from '../../../core/campaign-shell.service';
import { SessionService } from '../../../core/session.service';
import { CampaignHubService } from '../../../core/hub/campaign-hub.service';
import { ChroniclesTimelineComponent } from '../../../shared/components/chronicles-timeline/chronicles-timeline.component';
import { StorylineFilterBarComponent } from '../../../shared/components/storyline-filter-bar/storyline-filter-bar.component';
import { ChroniclesResponse, ChronicleSession, ChronicleItem } from '../../../shared/models/chronicle.model';
import { TimeOfDay } from '../../../shared/models/time-of-day.model';
import { Session } from '../../../shared/models/session.model';
import { CampaignDropdownOption } from '../../../shared/components/campaign-dropdown/campaign-dropdown.component';

@Component({
  selector: 'app-campaign-chronicle',
  standalone: true,
  imports: [CommonModule, ChroniclesTimelineComponent, StorylineFilterBarComponent],
  templateUrl: './campaign-chronicle.component.html',
  styleUrl: './campaign-chronicle.component.scss',
})
export class CampaignChronicleComponent implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private shellSvc = inject(CampaignShellService);
  private http = inject(HttpClient);
  private sessionService = inject(SessionService);
  private hub = inject(CampaignHubService);
  private hubSubscriptions: Subscription[] = [];

  campaignId = '';

  // Chronicles state
  chronicles = signal<ChroniclesResponse | null>(null);
  loadingChronicles = signal(false);
  chroniclesPage = signal(1);
  chroniclesPageSize = 5;
  chroniclesSearchQuery = signal('');
  chroniclesTypeFilters = signal<string[]>([]);
  expandedSessionIds = signal<Set<string>>(new Set());
  chronicleEditingId = signal<string | null>(null);
  chronicleEditTitle = signal('');
  chronicleEditBody = signal('');
  chronicleSaving = signal(false);
  chronicleSaveError = signal<string | null>(null);
  chronicleEditSessionId = signal('');
  chronicleEditSortOrder = signal(0);

  timeOfDay = computed(() => this.shellSvc.campaign()?.timeOfDay ?? null);

  sessionOptions = computed<CampaignDropdownOption[]>(() => {
    const chrons = this.chronicles();
    if (!chrons || !chrons.sessions) return [];
    return chrons.sessions.map(s => ({
      value: s.sessionId,
      label: `Session ${s.sessionNumber}${s.alternateTitle ? ' - ' + s.alternateTitle : ''}`
    }));
  });

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id')!;
    this.campaignId = id;
    this.shellSvc.setTitleContext({ pageType: 'gm-chronicles', campaignId: id, baseRoute: '/campaign', location: null }, '56px');
    this.loadChronicles();

    this.hubSubscriptions.push(
      this.hub.sessionEnded$.subscribe(e => {
        if (!e || e.campaignId !== this.campaignId) return;
        this.loadChronicles();
      })
    );
  }

  ngOnDestroy() {
    this.hubSubscriptions.forEach(sub => sub.unsubscribe());
  }

  loadChronicles(searchQuery?: string, typeFilters?: string[]) {
    this.chronicles.set(null);
    this.loadingChronicles.set(true);
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
        if (data) {
          const allSessionIds = new Set(data.sessions.map(s => s.sessionId));
          this.expandedSessionIds.set(allSessionIds);
        }
        this.loadingChronicles.set(false);
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

  onChronicleReset() {
    this.chroniclesSearchQuery.set('');
    this.chroniclesTypeFilters.set([]);
    this.chroniclesPage.set(1);
    this.loadChronicles();
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

  openChronicleEdit(chronicle: ChronicleItem) {
    this.chronicleEditingId.set(chronicle.id);
    this.chronicleEditTitle.set(chronicle.title);
    this.chronicleEditBody.set(chronicle.body);
    this.chronicleEditSessionId.set(chronicle.sessionId);
    this.chronicleEditSortOrder.set(chronicle.sortOrder);
    this.chronicleSaving.set(false);
    this.chronicleSaveError.set(null);
  }

  closeChronicleEdit() {
    this.chronicleEditingId.set(null);
    this.chronicleEditTitle.set('');
    this.chronicleEditBody.set('');
    this.chronicleEditSessionId.set('');
    this.chronicleEditSortOrder.set(0);
    this.chronicleSaving.set(false);
    this.chronicleSaveError.set(null);
  }

  saveChronicleEdit(chronicleId: string) {
    if (this.chronicleSaving()) return;
    this.chronicleSaving.set(true);
    this.chronicleSaveError.set(null);

    const payload = {
      title: this.chronicleEditTitle(),
      body: this.chronicleEditBody(),
      sessionId: this.chronicleEditSessionId(),
      sortOrder: this.chronicleEditSortOrder()
    };

    this.http.patch(`${environment.apiUrl}/api/campaigns/${this.campaignId}/chronicles/${chronicleId}`, payload)
      .subscribe({
        next: () => {
          this.loadChronicles();
          this.closeChronicleEdit();
        },
        error: (err) => {
          this.chronicleSaving.set(false);
          const raw = err?.error;
          this.chronicleSaveError.set(typeof raw === 'string' && raw.length ? raw : 'Failed to save chronicle. Please try again.');
        }
      });
  }

  onChronicleSessionChange(sessionId: string) {
    this.chronicleEditSessionId.set(sessionId);
  }

  onChronicleSortOrderChange(sortOrder: number) {
    this.chronicleEditSortOrder.set(sortOrder);
  }

  deleteSession(sessionId: string) {
    this.http.delete(`${environment.apiUrl}/api/campaigns/${this.campaignId}/chronicles/sessions/${sessionId}`)
      .subscribe({
        next: () => {
          this.loadChronicles();
        },
        error: () => {
          // Handle error
        }
      });
  }
}
