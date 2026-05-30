import {
  Component, OnInit, OnDestroy, signal, inject,
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
import { QuicknoteQueueItem } from '../../../shared/models/quicknote-queue.model';
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

type DestinationType = 'location' | 'sublocation' | 'cast' | 'faction' | 'campaign';

interface QueueItemState {
  item: QuicknoteQueueItem;
  destType: DestinationType;
  entityId: string;
  routing: boolean;
  deleting: boolean;
  success: boolean;
  editing: boolean;
  editedContent: string;
}

@Component({
  selector: 'app-player-quicknote-queue',
  standalone: true,
  imports: [CommonModule, FormsModule, NoteDestinationPickerComponent],
  templateUrl: './player-quicknote-queue.component.html',
  styleUrl: './player-quicknote-queue.component.scss',
})
export class PlayerQuicknoteQueueComponent implements OnInit, OnDestroy {
  private route    = inject(ActivatedRoute);
  private router   = inject(Router);
  private http     = inject(HttpClient);
  private shellSvc = inject(PlayerCampaignShellService);
  private hub      = inject(CampaignHubService);
  private hubSubscriptions: Subscription[] = [];

  campaignId = signal('');
  items      = signal<QueueItemState[]>([]);
  loading    = signal(true);

  get campaign(): CampaignDetail | null { return this.shellSvc.campaign(); }

  get locations(): CampaignLocationInstance[] {
    return this.campaign?.locations?.filter(l => l.isVisibleToPlayers) ?? [];
  }
  get sublocations(): CampaignSublocationInstance[] {
    return this.campaign?.sublocations?.filter(s => s.isVisibleToPlayers) ?? [];
  }
  get casts(): CampaignCastInstance[] {
    return this.campaign?.casts?.filter(c => c.isVisibleToPlayers) ?? [];
  }
  get factions(): CampaignFactionInstance[] {
    return this.campaign?.factions?.filter(f => f.isVisibleToPlayers) ?? [];
  }

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id')!;
    this.campaignId.set(id);
    this.shellSvc.setTitle('Quicknote Queue');
    this.loadQueue(id);
    this.hubSubscriptions.push(
      this.hub.quickNoteQueued$.subscribe(e => {
        if (e?.campaignId === this.campaignId()) {
          this.loadQueue(this.campaignId());
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
          routing:  false,
          deleting: false,
          success:  false,
          editing: false,
          editedContent: item.content,
        })));
        this.loading.set(false);
      });
  }

  canRoute(state: QueueItemState): boolean {
    const needsEntity = state.destType === 'location' || state.destType === 'sublocation'
      || state.destType === 'cast' || state.destType === 'faction';
    if (needsEntity && !state.entityId) return false;
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
