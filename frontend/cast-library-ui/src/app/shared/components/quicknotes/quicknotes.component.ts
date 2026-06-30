import {
  Component,
  Input,
  signal,
  inject,
  ViewChild,
  ElementRef,
  OnInit,
  OnDestroy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { catchError, switchMap, of } from 'rxjs';
import { Subscription } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { CampaignDetail, CampaignCastPlayerNotes, CampaignPlayerNotes } from '../../models/campaign.model';
import { CampaignLocationInstance } from '../../models/location.model';
import { CampaignSublocationInstance } from '../../models/sublocation.model';
import { CampaignCastInstance } from '../../models/cast.model';
import { CampaignFactionInstance } from '../../models/faction.model';
import { NoteDestinationPickerComponent } from '../note-destination-picker/note-destination-picker.component';
import { PlayerCampaignShellService } from '../../../core/player-campaign-shell.service';
import { CampaignHubService } from '../../../core/hub/campaign-hub.service';

type DestinationType = 'queue' | 'location' | 'sublocation' | 'cast' | 'faction' | 'campaign';

@Component({
  selector: 'app-quicknotes',
  standalone: true,
  imports: [CommonModule, FormsModule, NoteDestinationPickerComponent],
  templateUrl: './quicknotes.component.html',
  styleUrl: './quicknotes.component.scss',
})
export class QuicknotesComponent implements OnInit, OnDestroy {
  @Input() campaignId!: string;
  @Input() campaign: CampaignDetail | null = null;
  @Input() isPlayerComponent = false;

  @ViewChild('noteArea') noteArea!: ElementRef<HTMLTextAreaElement>;
  @ViewChild('saveBtn') saveBtn!: ElementRef<HTMLButtonElement>;

  private http   = inject(HttpClient);
  private router  = inject(Router);
  shellSvc        = inject(PlayerCampaignShellService);
  private hub     = inject(CampaignHubService);
  private hubSubscription: Subscription | null = null;

  isOpen      = signal(false);
  isClosing   = signal(false);
  isAnimating = signal(false);
  noteContent = signal('');
  destType    = signal<DestinationType>('queue');
  entityId    = signal<string>('');
  isSaving    = signal(false);
  saveSuccess = signal(false);

  private readonly SLIDE_DURATION = 260;

  ngOnInit() {
    this.hubSubscription = this.hub.quickNoteQueued$.subscribe(e => {
      if (e?.campaignId === this.campaignId) {
        this.refreshQueueCount();
      }
    });
  }

  ngOnDestroy() {
    this.hubSubscription?.unsubscribe();
  }

  private refreshQueueCount() {
    this.http
      .get<{ id: string }[]>(`${environment.apiUrl}/api/campaigns/${this.campaignId}/quicknote-queue`)
      .pipe(catchError(() => of([])))
      .subscribe(items => this.shellSvc.quicknoteQueueCount.set(items.length));
  }

  toggle() {
    if (this.isOpen() && !this.isClosing()) {
      this.isClosing.set(true);
      setTimeout(() => {
        this.isOpen.set(false);
        this.isClosing.set(false);
        this.noteContent.set('');
        this.destType.set('queue');
        this.entityId.set('');
        this.saveSuccess.set(false);
      }, this.SLIDE_DURATION);
    } else if (!this.isOpen()) {
      this.isOpen.set(true);
      this.isAnimating.set(true);
      setTimeout(() => {
        this.isAnimating.set(false);
        this.noteArea?.nativeElement?.focus();
      }, this.SLIDE_DURATION);
    }
  }

  get locations(): CampaignLocationInstance[] {
    if (this.isPlayerComponent) {
      return this.campaign?.locations ?? [];
    }
    return this.campaign?.locations?.filter(l => l.isVisibleToPlayers) ?? [];
  }

  get sublocations(): CampaignSublocationInstance[] {
    if (this.isPlayerComponent) {
      return this.campaign?.sublocations ?? [];
    }
    return this.campaign?.sublocations?.filter(s => s.isVisibleToPlayers) ?? [];
  }

  get casts(): CampaignCastInstance[] {
    if (this.isPlayerComponent) {
      return this.campaign?.casts ?? [];
    }
    return this.campaign?.casts?.filter(c => c.isVisibleToPlayers) ?? [];
  }

  get factions(): CampaignFactionInstance[] {
    if (this.isPlayerComponent) {
      return this.campaign?.factions ?? [];
    }
    return this.campaign?.factions?.filter(f => f.isVisibleToPlayers) ?? [];
  }

  get canSave(): boolean {
    const content = this.noteContent().trim();
    if (!content) return false;
    const t = this.destType();
    const needsEntity = t === 'location' || t === 'sublocation' || t === 'cast' || t === 'faction';
    if (needsEntity && !this.entityId()) return false;
    return true;
  }

  onDestTypeChange(value: string) {
    this.destType.set(value as DestinationType);
  }

  onPickerEnter(_type: string) {
    this.save();
  }

  trapTab(event: Event) {
    const ke = event as KeyboardEvent;
    if (!ke.shiftKey) {
      ke.preventDefault();
      this.noteArea?.nativeElement?.focus();
    }
  }

  save() {
    if (!this.canSave || this.isSaving()) return;

    const content = this.noteContent().trim();
    const type    = this.destType();
    const cId     = this.campaignId;
    const base    = environment.apiUrl;

    this.isSaving.set(true);
    this.saveSuccess.set(false);

    const done = () => {
      this.isSaving.set(false);
      this.saveSuccess.set(true);
      this.noteContent.set('');
      this.noteArea?.nativeElement?.focus();
      setTimeout(() => this.saveSuccess.set(false), 2500);
    };

    const fail = () => {
      this.isSaving.set(false);
    };

    if (type === 'queue') {
      this.http.post(`${base}/api/campaigns/${cId}/quicknote-queue`, { content })
        .subscribe({ next: done, error: fail });
      return;
    }

    if (type === 'campaign') {
      this.http.get<CampaignPlayerNotes>(`${base}/api/campaigns/${cId}/campaign-player-notes`)
        .pipe(catchError(() => of({ id: '', campaignId: cId, notes: '' } as CampaignPlayerNotes)))
        .pipe(switchMap(existing => {
          const combined = this.appendNote(existing?.notes ?? '', content);
          return this.http.put(`${base}/api/campaigns/${cId}/campaign-player-notes`, { notes: combined });
        }))
        .subscribe({ next: done, error: fail });
      return;
    }

    const eId = this.entityId();

    if (type === 'location') {
      this.http.get<{ notes: string }>(`${base}/api/campaigns/${cId}/location-player-notes/${eId}`)
        .pipe(catchError(() => of({ notes: '' })))
        .pipe(switchMap(existing => {
          const combined = this.appendNote(existing?.notes ?? '', content);
          return this.http.put(`${base}/api/campaigns/${cId}/location-player-notes/${eId}`, { notes: combined });
        }))
        .subscribe({ next: done, error: fail });
      return;
    }

    if (type === 'sublocation') {
      this.http.get<{ notes: string }>(`${base}/api/campaigns/${cId}/sublocation-player-notes/${eId}`)
        .pipe(catchError(() => of({ notes: '' })))
        .pipe(switchMap(existing => {
          const combined = this.appendNote(existing?.notes ?? '', content);
          return this.http.put(`${base}/api/campaigns/${cId}/sublocation-player-notes/${eId}`, { notes: combined });
        }))
        .subscribe({ next: done, error: fail });
      return;
    }

    if (type === 'cast') {
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
        .subscribe({ next: done, error: fail });
      return;
    }

    if (type === 'faction') {
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
        .subscribe({ next: done, error: fail });
      return;
    }
  }

  private appendNote(existing: string, newContent: string): string {
    const trimmed = (existing ?? '').trim();
    return trimmed ? `${trimmed}\n\n${newContent}` : newContent;
  }

  goToQueue() {
    this.isOpen.set(false);
    this.router.navigate(['/player/campaign', this.campaignId, 'quicknote-queue']);
  }
}
