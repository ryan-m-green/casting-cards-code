import { Component, inject, signal, HostListener, Input, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { ChroniclesTimelineComponent } from '../chronicles-timeline/chronicles-timeline.component';
import { StorylineFilterBarComponent } from '../storyline-filter-bar/storyline-filter-bar.component';
import { ChroniclesResponse, ChronicleItem } from '../../models/chronicle.model';
import { TimeOfDay } from '../../models/time-of-day.model';
import { CampaignDropdownOption } from '../campaign-dropdown/campaign-dropdown.component';
import { CampaignHubService } from '../../../core/hub/campaign-hub.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-campaign-chronicle-drawer',
  standalone: true,
  imports: [CommonModule, FormsModule, ChroniclesTimelineComponent, StorylineFilterBarComponent],
  templateUrl: './campaign-chronicle-drawer.component.html',
  styleUrl: './campaign-chronicle-drawer.component.scss'
})
export class CampaignChronicleDrawerComponent implements OnInit, OnDestroy {
  private http = inject(HttpClient);
  private hub = inject(CampaignHubService);
  private hubSubscriptions: Subscription[] = [];

  @Input() portalColor: string = '#6e28d0';
  @Input() isDmMode: boolean = false;
  @Input() campaignId: string = '';

  isOpen = signal(false);
  isClosing = signal(false);
  loadingChronicles = signal(false);
  chronicles = signal<ChroniclesResponse | null>(null);
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

  sessionOptions = signal<CampaignDropdownOption[]>([]);

  ngOnInit() {
    this.hubSubscriptions.push(
      this.hub.sessionEnded$.subscribe(e => {
        if (!e || e.campaignId !== this.campaignId) return;
        if (this.isOpen()) {
          this.loadChronicles();
        }
      })
    );
  }

  ngOnDestroy() {
    this.hubSubscriptions.forEach(sub => sub.unsubscribe());
  }

  open() {
    this.isOpen.set(true);
    this.chroniclesPage.set(1);
    this.chroniclesSearchQuery.set('');
    this.chroniclesTypeFilters.set([]);
    this.loadChronicles();
  }

  openWithSearch(query: string) {
    this.isOpen.set(true);
    this.chroniclesPage.set(1);
    this.chroniclesSearchQuery.set(query);
    this.chroniclesTypeFilters.set([]);
    this.loadChronicles(query);
  }

  close() {
    this.isClosing.set(true);
    setTimeout(() => {
      this.isOpen.set(false);
      this.chronicles.set(null);
      this.chronicleEditingId.set(null);
      this.isClosing.set(false);
    }, 240);
  }

  @HostListener('document:keydown.escape')
  onEscape() {
    if (this.isOpen()) {
      this.close();
    }
  }

  loadChronicles(searchQuery?: string, typeFilters?: string[]) {
    if (!this.campaignId) return;

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
      .subscribe(data => {
        this.chronicles.set(data);
        if (data) {
          const allSessionIds = new Set(data.sessions.map(s => String(s.sessionId)));
          this.expandedSessionIds.set(allSessionIds);
        }
        this.loadingChronicles.set(false);
      });

    // Load all sessions for the dropdown options
    this.http.get<any[]>(`${environment.apiUrl}/api/campaigns/${this.campaignId}/chronicles/sessions`)
      .subscribe(sessions => {
        if (sessions) {
          this.sessionOptions.set(sessions.map(s => ({
            value: String(s.sessionId),
            label: `Session ${s.sessionNumber}${s.alternateTitle ? ' - ' + s.alternateTitle : ''}`
          })));
        }
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

  openChronicleEdit(payload: { chronicle: ChronicleItem; sessionId: string }) {
    const { chronicle, sessionId } = payload;
    const hasPlayerNote = chronicle.linkedEntities?.some(e => e.entityType.toLowerCase() === 'player-note');
    if (!this.isDmMode && !hasPlayerNote) return;
    this.chronicleEditingId.set(chronicle.id);
    this.chronicleEditTitle.set(chronicle.title);
    this.chronicleEditBody.set(chronicle.body);
    this.chronicleEditSessionId.set(String(sessionId));
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
    if (!this.isDmMode) return;
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
