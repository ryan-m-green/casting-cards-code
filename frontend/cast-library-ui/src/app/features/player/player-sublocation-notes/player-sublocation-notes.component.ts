import {
  Component, Input, OnInit, OnChanges, OnDestroy, SimpleChanges,
  signal, inject, Injector, effect,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { catchError, of } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { CampaignSublocationPlayerNotes } from '../../../shared/models/campaign.model';
import { CampaignHubService } from '../../../core/hub/campaign-hub.service';

@Component({
  selector: 'app-player-sublocation-notes',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './player-sublocation-notes.component.html',
  styleUrl: './player-sublocation-notes.component.scss',
})
export class PlayerSublocationNotesComponent implements OnInit, OnChanges, OnDestroy {
  @Input() campaignId!: string;
  @Input() sublocationInstanceId!: string;

  private http = inject(HttpClient);
  private hub  = inject(CampaignHubService);
  private injector = inject(Injector);

  notes = signal<CampaignSublocationPlayerNotes>({
    id: '',
    campaignId: '',
    sublocationInstanceId: '',
    notes: '',
  });

  notesText = signal('');
  saving = signal(false);
  private saveDebounce: ReturnType<typeof setTimeout> | null = null;

  ngOnInit() {
    this.load();
    effect(() => {
      const e = this.hub.noteUpdated();
      if (e?.entityType === 'sublocation' && e.instanceId === this.sublocationInstanceId) {
        this.load();
      }
    }, { injector: this.injector });
  }

  ngOnDestroy() {
    if (this.saveDebounce) clearTimeout(this.saveDebounce);
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['sublocationInstanceId'] && !changes['sublocationInstanceId'].firstChange) {
      this.load();
    }
  }

  private load() {
    const defaultNotes: CampaignSublocationPlayerNotes = {
      id: '',
      campaignId: this.campaignId,
      sublocationInstanceId: this.sublocationInstanceId,
      notes: '',
    };
    this.http.get<CampaignSublocationPlayerNotes>(
      `${environment.apiUrl}/api/campaigns/${this.campaignId}/sublocation-player-notes/${this.sublocationInstanceId}`
    ).pipe(
      catchError(() => of(defaultNotes))
    ).subscribe(n => {
      this.notes.set(n);
      this.notesText.set(n.notes);
    });
  }

  private save() {
    this.saving.set(true);
    this.http.put<CampaignSublocationPlayerNotes>(
      `${environment.apiUrl}/api/campaigns/${this.campaignId}/sublocation-player-notes/${this.sublocationInstanceId}`,
      { notes: this.notesText() }
    ).subscribe(updated => {
      this.notes.set(updated);
      this.saving.set(false);
    });
  }

  onNotesInput(value: string) {
    this.notesText.set(value);
    if (this.saveDebounce) clearTimeout(this.saveDebounce);
    this.saveDebounce = setTimeout(() => this.save(), 800);
  }
}
