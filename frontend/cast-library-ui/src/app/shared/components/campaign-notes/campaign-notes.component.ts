import { Component, Input, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { CampaignNote } from '../../models/campaign.model';
import { AuthService } from '../../../core/auth/auth.service';

@Component({
  selector: 'app-campaign-notes',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './campaign-notes.component.html',
  styleUrl: './campaign-notes.component.scss'
})
export class CampaignNotesComponent implements OnInit {
  @Input() campaignId!: string;
  @Input() entityType!: 'Cast' | 'City' | 'Sublocation';
  @Input() instanceId!: string;

  private http = inject(HttpClient);
  auth = inject(AuthService);

  notes   = signal<CampaignNote[]>([]);
  newNote = '';
  saving  = false;

  ngOnInit() { this.loadNotes(); }

  loadNotes() {
    this.http.get<CampaignNote[]>(
      `${environment.apiUrl}/api/campaigns/${this.campaignId}/notes?entityType=${this.entityType}&instanceId=${this.instanceId}`
    ).subscribe(n => this.notes.set(n));
  }

  addNote() {
    if (!this.newNote.trim()) return;
    this.saving = true;
    this.http.post<CampaignNote>(
      `${environment.apiUrl}/api/campaigns/${this.campaignId}/notes`,
      { entityType: this.entityType, instanceId: this.instanceId, content: this.newNote }
    ).subscribe(note => {
      this.notes.update(n => [note, ...n]);
      this.newNote = '';
      this.saving = false;
    });
  }
}
