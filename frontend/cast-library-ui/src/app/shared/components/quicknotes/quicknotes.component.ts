import {
  Component,
  Input,
  signal,
  inject,
  ViewChild,
  ElementRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { catchError, switchMap, of } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { CampaignDetail, CampaignCastPlayerNotes, CampaignPlayerNotes } from '../../models/campaign.model';
import { CampaignLocationInstance } from '../../models/location.model';
import { CampaignSublocationInstance } from '../../models/sublocation.model';
import { CampaignCastInstance } from '../../models/cast.model';
import { CampaignFactionInstance } from '../../models/faction.model';
import { NoteDestinationPickerComponent } from '../note-destination-picker/note-destination-picker.component';

type DestinationType = 'queue' | 'location' | 'sublocation' | 'cast' | 'faction' | 'campaign';

@Component({
  selector: 'app-quicknotes',
  standalone: true,
  imports: [CommonModule, FormsModule, NoteDestinationPickerComponent],
  templateUrl: './quicknotes.component.html',
  styleUrl: './quicknotes.component.scss',
})
export class QuicknotesComponent {
  @Input() campaignId!: string;
  @Input() campaign: CampaignDetail | null = null;

  @ViewChild('noteArea') noteArea!: ElementRef<HTMLTextAreaElement>;

  private http   = inject(HttpClient);
  private router  = inject(Router);

  isOpen      = signal(false);
  isClosing   = signal(false);
  noteContent = signal('');
  destType    = signal<DestinationType>('queue');
  entityId    = signal<string>('');
  isSaving    = signal(false);
  saveSuccess = signal(false);

  private readonly SLIDE_DURATION = 260;

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
      setTimeout(() => this.noteArea?.nativeElement?.focus(), 0);
    }
  }

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
