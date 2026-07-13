import {
  Component, OnInit, OnDestroy, signal, inject, computed,
} from '@angular/core';
import { Subscription } from 'rxjs';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { catchError, switchMap, of } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { PlayerCampaignShellService } from '../../../core/player-campaign-shell.service';
import { CampaignHubService } from '../../../core/hub/campaign-hub.service';
import { SessionContextService } from '../../../core/session-context.service';
import { SessionService } from '../../../core/session.service';
import { QuicknoteQueueItem } from '../../../shared/models/quicknote-queue.model';
import { Session, ArchivedSession } from '../../../shared/models/session.model';
import {
  CampaignDetail,
  CampaignCastPlayerNotes,
  CampaignPlayerNotes,
} from '../../../shared/models/campaign.model';
import { CampaignLocationInstance } from '../../../shared/models/location.model';
import { CampaignSublocationInstance } from '../../../shared/models/sublocation.model';
import { CampaignCastInstance } from '../../../shared/models/cast.model';
import { CampaignFactionInstance } from '../../../shared/models/faction.model';
import { NoteDestinationPickerComponent } from '../../../shared/components/note-destination-picker/note-destination-picker.component';
import { CampaignDropdownComponent, CampaignDropdownOption } from '../../../shared/components/campaign-dropdown/campaign-dropdown.component';

type DestinationType = 'location' | 'sublocation' | 'cast' | 'faction' | 'campaign';

interface QueueItemState {
  item: QuicknoteQueueItem;
  destType: DestinationType;
  entityId: string;
  selectedSessionId: string | null;
  routing: boolean;
  deleting: boolean;
  migrating: boolean;
  success: boolean;
  editing: boolean;
  editedContent: string;
}

@Component({
  selector: 'app-player-quicknote-queue',
  standalone: true,
  imports: [CommonModule, FormsModule, NoteDestinationPickerComponent, CampaignDropdownComponent],
  templateUrl: './player-quicknote-queue.component.html',
  styleUrl: './player-quicknote-queue.component.scss',
})
export class PlayerQuicknoteQueueComponent implements OnInit, OnDestroy {
  private route    = inject(ActivatedRoute);
  private router   = inject(Router);
  private http     = inject(HttpClient);
  private shellSvc = inject(PlayerCampaignShellService);
  private hub      = inject(CampaignHubService);
  private sessionContext = inject(SessionContextService);
  private sessionService = inject(SessionService);
  private hubSubscriptions: Subscription[] = [];

  // Debug log at class level
  private static readonly COMPONENT_NAME = 'Quicknote Queue';

  campaignId = signal('');
  items      = signal<QueueItemState[]>([]);
  loading    = signal(true);
  isSessionActive = signal(false);
  archivedSessions = signal<ArchivedSession[]>([]);

  readonly campaign = computed(() => this.shellSvc.campaign());
  readonly locations = computed(() => this.campaign()?.locations?.filter(l => l.isVisibleToPlayers) ?? []);
  readonly sublocations = computed(() => this.campaign()?.sublocations?.filter(s => s.isVisibleToPlayers) ?? []);
  readonly casts = computed(() => this.campaign()?.casts?.filter(c => c.isVisibleToPlayers) ?? []);
  readonly factions = computed(() => this.campaign()?.factions?.filter(f => f.isVisibleToPlayers) ?? []);

  get sessionOptions(): CampaignDropdownOption[] {
    const options: CampaignDropdownOption[] = [{ value: '', label: '-- Select Session --' }];
    for (const session of this.archivedSessions()) {
      options.push({
        value: session.id,
        label: `Session #${session.sessionNumber} - ${new Date(session.startTime).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })}`
      });
    }
    return options;
  }

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id')!;
    this.campaignId.set(id);
    this.shellSvc.setTitle('Quicknote Queue');
    this.loadQueue(id);
    this.loadArchivedSessions(id);

    // Directly check session state on init
    this.hubSubscriptions.push(
      this.sessionService.getActiveSession(this.campaignId()).subscribe({
        next: (session: Session | null) => {
          this.isSessionActive.set(session !== null);
        },
        error: (err) => {
          console.error('Quicknote Queue - Error fetching session:', err);
        }
      })
    );

    this.hubSubscriptions.push(
      this.hub.quickNoteQueued$.subscribe(e => {
        if (e?.campaignId === this.campaignId()) {
          this.loadQueue(this.campaignId());
        }
      })
    );

    // Subscribe to SignalR events for session updates
    this.hubSubscriptions.push(
      this.hub.sessionStarted$.subscribe((event: any) => {
        if (event && event.campaignId === this.campaignId()) {
          this.isSessionActive.set(true);
        }
      })
    );

    this.hubSubscriptions.push(
      this.hub.sessionEnded$.subscribe((event: any) => {
        if (event && event.campaignId === this.campaignId()) {
          this.isSessionActive.set(false);
        }
      })
    );

    this.hubSubscriptions.push(
      this.hub.sessionCancelled$.subscribe((event: any) => {
        if (event && event.campaignId === this.campaignId()) {
          this.isSessionActive.set(false);
        }
      })
    );
  }

  ngOnDestroy() {
    this.hubSubscriptions.forEach(sub => sub.unsubscribe());
  }

  private loadQueue(campaignId: string) {
    this.loading.set(true);
    this.http.get<QuicknoteQueueItem[]>(
      `${environment.apiUrl}/api/campaigns/${campaignId}/quicknote-queue`
    ).pipe(catchError(() => of([])))
      .subscribe(data => {
        this.items.set(data.map(item => ({
          item,
          destType: 'cast',
          entityId: '',
          selectedSessionId: null,
          routing:  false,
          deleting: false,
          migrating: false,
          success:  false,
          editing: false,
          editedContent: item.content,
        })));
        this.loading.set(false);
      });
  }

  private loadArchivedSessions(campaignId: string) {
    this.sessionService.getArchivedSessions(campaignId).pipe(catchError(() => of([])))
      .subscribe(data => {
        this.archivedSessions.set(data);
      });
  }

  canRoute(state: QueueItemState): boolean {
    const needsEntity = state.destType === 'location' || state.destType === 'sublocation'
      || state.destType === 'cast' || state.destType === 'faction';
    if (needsEntity && !state.entityId) return false;
    
    // If no active session, require session selection
    if (!this.isSessionActive() && !state.selectedSessionId) return false;
    
    return true;
  }

  onDestTypeChange(state: QueueItemState, value: string) {
    state.destType = value as DestinationType;
  }

  fileNote(state: QueueItemState) {
    if (!this.canRoute(state) || state.routing) return;

    const content  = state.item.content;
    const cId      = this.campaignId();
    const base     = environment.apiUrl;
    const eId      = state.entityId;
    const itemId   = state.item.id;

    state.routing = true;

    // If no active session, migrate to chronicle using selected session
    if (!this.isSessionActive() && state.selectedSessionId) {
      this.http.post(`${base}/api/campaigns/${cId}/chronicles/migrate-player-note`, {
        sessionId: state.selectedSessionId,
        entityType: state.destType,
        entityId: state.entityId || null,
        entityName: this.getEntityName(state),
        notes: content
      }).subscribe({
        next: () => {
          this.http.delete(`${base}/api/campaigns/${cId}/quicknote-queue/${itemId}`)
            .subscribe({
              next: () => {
                this.items.update(list => list.filter(s => s.item.id !== itemId));
              },
              error: () => { state.routing = false; },
            });
        },
        error: () => { state.routing = false; },
      });
      return;
    }

    // Original player notes filing logic (when session is active)
    const afterRoute = () => {
      this.http.delete(`${base}/api/campaigns/${cId}/quicknote-queue/${itemId}`)
        .subscribe({
          next: () => {
            this.items.update(list => list.filter(s => s.item.id !== itemId));
          },
          error: () => { state.routing = false; },
        });
    };

    const fail = () => { state.routing = false; };

    if (state.destType === 'campaign') {
      this.http.get<CampaignPlayerNotes>(`${base}/api/campaigns/${cId}/campaign-player-notes`)
        .pipe(catchError(() => of({ id: '', campaignId: cId, notes: '' } as CampaignPlayerNotes)))
        .pipe(switchMap(existing => {
          const combined = this.appendNote(existing?.notes ?? '', content);
          return this.http.put(`${base}/api/campaigns/${cId}/campaign-player-notes`, { notes: combined });
        }))
        .subscribe({ next: afterRoute, error: fail });
      return;
    }

    if (state.destType === 'location') {
      this.http.get<{ notes: string }>(`${base}/api/campaigns/${cId}/location-player-notes/${eId}`)
        .pipe(catchError(() => of({ notes: '' })))
        .pipe(switchMap(existing => {
          const combined = this.appendNote(existing?.notes ?? '', content);
          return this.http.put(`${base}/api/campaigns/${cId}/location-player-notes/${eId}`, { notes: combined });
        }))
        .subscribe({ next: afterRoute, error: fail });
      return;
    }

    if (state.destType === 'sublocation') {
      this.http.get<{ notes: string }>(`${base}/api/campaigns/${cId}/sublocation-player-notes/${eId}`)
        .pipe(catchError(() => of({ notes: '' })))
        .pipe(switchMap(existing => {
          const combined = this.appendNote(existing?.notes ?? '', content);
          return this.http.put(`${base}/api/campaigns/${cId}/sublocation-player-notes/${eId}`, { notes: combined });
        }))
        .subscribe({ next: afterRoute, error: fail });
      return;
    }

    if (state.destType === 'cast') {
      this.http.get<CampaignCastPlayerNotes>(`${base}/api/campaigns/${cId}/cast-player-notes/${eId}`)
        .pipe(catchError(() => of(null)))
        .pipe(switchMap(existing => {
          const combined = this.appendNote(existing?.notes ?? '', content);
          return this.http.put(`${base}/api/campaigns/${cId}/cast-player-notes/${eId}`, {
            notes:       combined,
            connections: existing ? [...(existing.connections ?? [])] : [],
            alignment:   existing?.alignment ?? '',
            perception:  existing?.perception ?? 0,
            rating:      existing?.rating ?? 0,
          });
        }))
        .subscribe({ next: afterRoute, error: fail });
      return;
    }

    if (state.destType === 'faction') {
      this.http.get<{ notes: string; influence: number | null; perception: number | null }>(
        `${base}/api/campaigns/${cId}/faction-player-notes/${eId}`)
        .pipe(catchError(() => of({ notes: '', influence: null, perception: null })))
        .pipe(switchMap(existing => {
          const combined = this.appendNote(existing?.notes ?? '', content);
          return this.http.put(`${base}/api/campaigns/${cId}/faction-player-notes/${eId}`, {
            notes:      combined,
            influence:  existing?.influence ?? null,
            perception: existing?.perception ?? null,
          });
        }))
        .subscribe({ next: afterRoute, error: fail });
      return;
    }
  }

  deleteItem(state: QueueItemState) {
    if (state.deleting) return;
    state.deleting = true;
    const cId    = this.campaignId();
    const base   = environment.apiUrl;
    const itemId = state.item.id;

    this.http.delete(`${base}/api/campaigns/${cId}/quicknote-queue/${itemId}`)
      .subscribe({
        next:  () => this.items.update(list => list.filter(s => s.item.id !== itemId)),
        error: () => { state.deleting = false; },
      });
  }

  private appendNote(existing: string, newContent: string): string {
    const trimmed = (existing ?? '').trim();
    return trimmed ? `${trimmed}\n\n${newContent}` : newContent;
  }

  private getEntityName(state: QueueItemState): string {
    if (!state.entityId) return state.destType;

    switch (state.destType) {
      case 'location':
        const location = this.locations().find((l: CampaignLocationInstance) => l.instanceId === state.entityId);
        return location?.name || 'Location';
      case 'sublocation':
        const sublocation = this.sublocations().find((s: CampaignSublocationInstance) => s.instanceId === state.entityId);
        return sublocation?.name || 'Sublocation';
      case 'cast':
        const cast = this.casts().find((c: CampaignCastInstance) => c.instanceId === state.entityId);
        return cast?.name || 'Cast';
      case 'faction':
        const faction = this.factions().find((f: CampaignFactionInstance) => f.factionInstanceId === state.entityId);
        return faction?.name || 'Faction';
      case 'campaign':
        return this.campaign()?.name || 'Campaign';
      default:
        return state.destType;
    }
  }

  goBack() {
    this.router.navigate(['/player/campaign', this.campaignId()]);
  }

  startEdit(state: QueueItemState) {
    state.editing = true;
    state.editedContent = state.item.content;
  }

  cancelEdit(state: QueueItemState) {
    state.editing = false;
    state.editedContent = state.item.content;
  }

  saveEdit(state: QueueItemState) {
    const cId = this.campaignId();
    const base = environment.apiUrl;
    const itemId = state.item.id;

    this.http.put(`${base}/api/campaigns/${cId}/quicknote-queue/${itemId}`, { content: state.editedContent })
      .subscribe({
        next: () => {
          state.item.content = state.editedContent;
          state.editing = false;
        },
        error: () => {
          state.editedContent = state.item.content;
        },
      });
  }
}
