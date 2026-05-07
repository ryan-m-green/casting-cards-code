import { Component, OnInit, signal, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { CampaignPlayer } from '../../shared/models/campaign.model';
import { JournalTitleComponent } from '../../shared/components/journal-title/journal-title.component';

@Component({
  selector: 'app-player-invites',
  standalone: true,
  imports: [CommonModule, RouterLink, ReactiveFormsModule, JournalTitleComponent],
  templateUrl: './player-invites.component.html',
  styleUrl: './player-invites.component.scss'
})
export class PlayerInvitesComponent implements OnInit {
  private http = inject(HttpClient);
  private fb   = inject(FormBuilder);

  players      = signal<CampaignPlayer[]>([]);
  inviteCode   = signal('');
  loading      = signal(false);

  form = this.fb.group({
    email:        ['', [Validators.required, Validators.email]],
    startingGold: [50, Validators.required],
    campaignId:   ['', Validators.required],
  });

  ngOnInit() {}

  generateInvite() {
    if (this.form.invalid) return;
    this.loading.set(true);
    this.http.post<{ inviteCode: string }>(`${environment.apiUrl}/api/campaigns/invite`, this.form.value)
      .subscribe({
        next: r => { this.inviteCode.set(r.inviteCode); this.loading.set(false); },
        error: () => this.loading.set(false),
      });
  }
}
