import {
  Component, Input, OnInit, OnDestroy,
  signal, inject, ViewChild, ElementRef,
} from '@angular/core';
import { Subscription } from 'rxjs';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { catchError, of } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { CampaignPlayerNotes } from '../../../shared/models/campaign.model';
import { CampaignHubService } from '../../../core/hub/campaign-hub.service';

@Component({
  selector: 'app-player-campaign-notes',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './player-campaign-notes.component.html',
  styleUrl: './player-campaign-notes.component.scss',
})
export class PlayerCampaignNotesComponent implements OnInit, OnDestroy {
  @Input() campaignId!: string;

  private http = inject(HttpClient);
  private hub      = inject(CampaignHubService);

  @ViewChild('notesTextarea') private notesRef?: ElementRef<HTMLTextAreaElement>;

  notes = signal<CampaignPlayerNotes>({
    id: '',
    campaignId: '',
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
        if (e?.entityType === 'campaign' && e.campaignId === this.campaignId) {
          this.load();
        }
      })
    );
  }

  ngOnDestroy() {
    if (this.saveDebounce) clearTimeout(this.saveDebounce);
    this.hubSubscriptions.forEach(sub => sub.unsubscribe());
  }

  private load() {
    const defaultNotes: CampaignPlayerNotes = {
      id: '',
      campaignId: this.campaignId,
      notes: '',
    };
    this.http.get<CampaignPlayerNotes>(
      `${environment.apiUrl}/api/campaigns/${this.campaignId}/campaign-player-notes`
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
    this.http.put<CampaignPlayerNotes>(
      `${environment.apiUrl}/api/campaigns/${this.campaignId}/campaign-player-notes`,
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
