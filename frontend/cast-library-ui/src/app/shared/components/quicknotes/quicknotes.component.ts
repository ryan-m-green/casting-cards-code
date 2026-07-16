import {
  Component,
  Input,
  signal,
  inject,
  ViewChild,
  ElementRef,
  OnInit,
  OnDestroy,
  HostBinding,
  HostListener,
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
import { SessionService } from '../../../core/session.service';
import { Session } from '../../models/session.model';

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
  @ViewChild('qnPanel') qnPanel!: ElementRef<HTMLDivElement>;

  @HostBinding('class.qn-animating')
  get isAnimatingClass() {
    return this.isOpen();
  }

  constructor(private elementRef: ElementRef) {
    // Clear inline styles on screen resize to ensure CSS media queries take effect
    window.addEventListener('resize', () => {
      const host = this.elementRef.nativeElement as HTMLElement;
      if (!this.isOpen()) {
        host.style.left = '';
        host.style.right = '';
        host.style.transform = '';
        host.style.width = '';
        host.style.maxWidth = '';
      }
    });
  }

  private http   = inject(HttpClient);
  private router  = inject(Router);
  shellSvc        = inject(PlayerCampaignShellService);
  private hub     = inject(CampaignHubService);
  private sessionService = inject(SessionService);
  private hubSubscription: Subscription | null = null;
  private sessionSubscription: Subscription | null = null;
  private hubSubscriptions: Subscription[] = [];

  isOpen      = signal(false);
  isClosing   = signal(false);
  isAnimating = signal(false);
  noteContent = signal('');
  destType    = signal<DestinationType>('queue');
  entityId    = signal<string>('');
  isSaving    = signal(false);
  saveSuccess = signal(false);
  showCloseWarning = signal(false);
  isSessionActive = signal(false);

  private warningTimeout: any = null;

  private readonly SLIDE_DURATION = 260;

  ngOnInit() {
    // Subscribe to session state
    this.sessionSubscription = this.sessionService.getActiveSession(this.campaignId).subscribe({
      next: (session: Session | null) => {
        this.isSessionActive.set(session !== null);
      },
      error: (err) => {
        console.error('Quicknotes - Error fetching session:', err);
      }
    });

    // Subscribe to SignalR events for session updates
    this.hubSubscriptions.push(
      this.hub.sessionStarted$.subscribe((event: any) => {
        if (event && event.campaignId === this.campaignId) {
          this.isSessionActive.set(true);
        }
      })
    );

    this.hubSubscriptions.push(
      this.hub.sessionEnded$.subscribe((event: any) => {
        if (event && event.campaignId === this.campaignId) {
          this.isSessionActive.set(false);
        }
      })
    );

    this.hubSubscriptions.push(
      this.hub.sessionCancelled$.subscribe((event: any) => {
        if (event && event.campaignId === this.campaignId) {
          this.isSessionActive.set(false);
          // Auto-save unsaved quicknotes to queue
          if (this.noteContent().trim()) {
            const originalDestType = this.destType();
            this.destType.set('queue');
            this.save();
            this.destType.set(originalDestType);
          }
        }
      })
    );

    this.hubSubscription = this.hub.quickNoteQueued$.subscribe(e => {
      if (e?.campaignId === this.campaignId) {
        this.refreshQueueCount();
      }
    });
  }

  ngOnDestroy() {
    this.hubSubscription?.unsubscribe();
    this.sessionSubscription?.unsubscribe();
    this.hubSubscriptions.forEach(sub => sub.unsubscribe());
  }

  private refreshQueueCount() {
    this.http
      .get<{ id: string }[]>(`${environment.apiUrl}/api/campaigns/${this.campaignId}/quicknote-queue`)
      .pipe(catchError(() => of([])))
      .subscribe(items => this.shellSvc.quicknoteQueueCount.set(items.length));
  }

  toggle() {
    if (this.isOpen() && !this.isClosing()) {
      // Check if there's unsaved content
      if (this.noteContent().trim() && !this.saveSuccess()) {
        this.showCloseWarning.set(true);
        // Auto-hide warning after 4 seconds
        if (this.warningTimeout) {
          clearTimeout(this.warningTimeout);
        }
        this.warningTimeout = setTimeout(() => {
          this.showCloseWarning.set(false);
        }, 4000);
        return;
      }
      // Reset mobile styles after slide-up animation completes (1s)
      if (window.innerWidth < 768) {
        setTimeout(() => {
          const host = this.elementRef.nativeElement as HTMLElement;
          host.style.left = '';
          host.style.right = '';
          host.style.transform = '';
          host.style.width = '';
          host.style.maxWidth = '';
        }, 40);
      }
      this.isClosing.set(true);
      setTimeout(() => {
        this.isOpen.set(false);
        this.isClosing.set(false);
        this.noteContent.set('');
        this.destType.set('queue');
        this.entityId.set('');
        this.saveSuccess.set(false);
        this.showCloseWarning.set(false);
      }, this.SLIDE_DURATION);
    } else if (!this.isOpen()) {
      this.isOpen.set(true);
      this.isAnimating.set(true);
      // Clear any inline styles to ensure CSS takes effect
      const host = this.elementRef.nativeElement as HTMLElement;
      host.style.left = '';
      host.style.right = '';
      host.style.transform = '';
      host.style.width = '';
      host.style.maxWidth = '';
      // Apply mobile expansion immediately (no animation)
      if (window.innerWidth < 540) {
        host.style.left = '12px';
        host.style.right = '12px';
        host.style.transform = 'none';
        host.style.width = 'auto';
        host.style.maxWidth = 'none';
      }
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

  dismissWarning() {
    this.showCloseWarning.set(false);
  }

  goToQueue() {
    this.isOpen.set(false);
    this.router.navigate(['/player/campaign', this.campaignId, 'quicknote-queue']);
  }
}
