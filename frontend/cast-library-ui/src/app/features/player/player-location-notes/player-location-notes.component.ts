import {
  Component, Input, OnInit, OnChanges, OnDestroy, SimpleChanges,
  signal, inject, ViewChild, ElementRef, Injector, effect,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { catchError, of } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { CampaignLocationPlayerNotes } from '../../../shared/models/campaign.model';
import { CampaignHubService } from '../../../core/hub/campaign-hub.service';

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
  private injector = inject(Injector);

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

  ngOnInit() {
    this.load();
    effect(() => {
      const e = this.hub.noteUpdated();
      if (e?.entityType === 'location' && e.instanceId === this.locationInstanceId) {
        this.load();
      }
    }, { injector: this.injector });
  }

  ngOnDestroy() {
    if (this.saveDebounce) clearTimeout(this.saveDebounce);
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
    this.http.put<CampaignLocationPlayerNotes>(
      `${environment.apiUrl}/api/campaigns/${this.campaignId}/location-player-notes/${this.locationInstanceId}`,
      { notes: this.notesText }
    ).subscribe(updated => {
      this.notes.set(updated);
      this.saving.set(false);
    });
  }

  onNotesInput(value: string) {
    this.notesText = value;
    if (this.saveDebounce) clearTimeout(this.saveDebounce);
    this.saveDebounce = setTimeout(() => this.save(), 800);
  }
}
