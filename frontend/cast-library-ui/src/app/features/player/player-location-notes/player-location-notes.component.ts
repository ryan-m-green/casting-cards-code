import {
  Component, Input, OnInit, OnChanges, OnDestroy, SimpleChanges,
  signal, inject, ViewChild, ElementRef,
} from '@angular/core';
import { Subscription } from 'rxjs';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { catchError, of } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { CampaignLocationPlayerNotes } from '../../../shared/models/campaign.model';
import { CampaignHubService } from '../../../core/hub/campaign-hub.service';
import { SessionContextService } from '../../../core/session-context.service';

@Component({
  selector: 'app-player-location-notes',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './player-location-notes.component.html',
  styleUrl: './player-location-notes.component.scss',
})
export class PlayerLocationNotesComponent implements OnInit, OnChanges, OnDestroy {
  @Input() campaignId!: string;
  @Input() locationInstanceId!: string;

  private http = inject(HttpClient);
  private hub  = inject(CampaignHubService);
  private sessionContext = inject(SessionContextService);

  isSessionActive = signal(false);

  @ViewChild('notesTextarea') private notesRef?: ElementRef<HTMLTextAreaElement>;

  notes = signal<CampaignLocationPlayerNotes>({
    id: '',
    campaignId: '',
    locationInstanceId: '',
    notes: '',
  });

  notesText = '';
  saving = signal(false);
  private saveDebounce: ReturnType<typeof setTimeout> | null = null;
  private hubSubscriptions: Subscription[] = [];

  ngOnInit() {
    this.load();
    this.hubSubscriptions.push(
      this.hub.noteUpdated$.subscribe(e => {
        if (e?.entityType === 'location' && e.instanceId === this.locationInstanceId) {
          this.load();
        }
      })
    );

    // Subscribe to session context
    this.hubSubscriptions.push(
      this.sessionContext.getActiveSession(this.campaignId).subscribe(session => {
        this.isSessionActive.set(session !== null);
      })
    );

    // Subscribe to session started event to reload notes and update active state
    this.hubSubscriptions.push(
      this.hub.sessionStarted$.subscribe(event => {
        if (event) {
          this.isSessionActive.set(true);
          this.load();
        }
      })
    );

    // Subscribe to session ended event to update active state and reload notes
    this.hubSubscriptions.push(
      this.hub.sessionEnded$.subscribe(event => {
        if (event) {
          this.isSessionActive.set(false);
          // Add delay to allow backend to complete note deletion
          setTimeout(() => this.load(), 500);
        }
      })
    );

    // Subscribe to session cancelled event to update active state and reload notes
    this.hubSubscriptions.push(
      this.hub.sessionCancelled$.subscribe(event => {
        if (event) {
          this.isSessionActive.set(false);
          // Add delay to allow backend to complete note deletion
          setTimeout(() => this.load(), 500);
        }
      })
    );
  }

  ngOnDestroy() {
    if (this.saveDebounce) clearTimeout(this.saveDebounce);
    this.hubSubscriptions.forEach(sub => sub.unsubscribe());
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['locationInstanceId'] && !changes['locationInstanceId'].firstChange) {
      this.load();
    }
  }

  private load() {
    const defaultNotes: CampaignLocationPlayerNotes = {
      id: '',
      campaignId: this.campaignId,
      locationInstanceId: this.locationInstanceId,
      notes: '',
    };
    this.http.get<CampaignLocationPlayerNotes>(
      `${environment.apiUrl}/api/campaigns/${this.campaignId}/location-player-notes/${this.locationInstanceId}`
    ).pipe(
      catchError(() => of(defaultNotes))
    ).subscribe(n => {
      this.notes.set(n);
      this.notesText = n.notes;
      setTimeout(() => {
        if (this.notesRef) this.notesRef.nativeElement.value = n.notes;
      }, 0);
    });
  }

  private save() {
    this.saving.set(true);
    const saveStartTime = Date.now();
    
    this.http.put<CampaignLocationPlayerNotes>(
      `${environment.apiUrl}/api/campaigns/${this.campaignId}/location-player-notes/${this.locationInstanceId}`,
      { notes: this.notesText }
    ).subscribe(updated => {
      this.notes.set(updated);
      
      // Ensure saving label shows for at least 1 second
      const elapsed = Date.now() - saveStartTime;
      const remainingTime = Math.max(0, 1000 - elapsed);
      
      setTimeout(() => {
        this.saving.set(false);
      }, remainingTime);
    });
  }

  onNotesInput(value: string) {
    this.notesText = value;
    if (this.saveDebounce) clearTimeout(this.saveDebounce);
    this.saveDebounce = setTimeout(() => this.save(), 800);
  }
}
