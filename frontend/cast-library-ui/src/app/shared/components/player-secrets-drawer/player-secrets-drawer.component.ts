import { Component, inject, signal, computed, HostListener, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { PlayerCardSecret, PlayerCardWithDetails } from '../../models/player-card.model';

@Component({
  selector: 'app-player-secrets-drawer',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './player-secrets-drawer.component.html',
  styleUrl: './player-secrets-drawer.component.scss'
})
export class PlayerSecretsDrawerComponent {
  private http = inject(HttpClient);

  isOpen = signal(false);
  isClosing = signal(false);
  loading = signal(false);
  member = signal<PlayerCardWithDetails | null>(null);
  secrets = signal<PlayerCardSecret[]>([]);
  campaignId = signal('');

  open(member: PlayerCardWithDetails, campaignId: string) {
    this.member.set(member);
    this.campaignId.set(campaignId);
    this.isOpen.set(true);
    this.loading.set(true);
    this.secrets.set([]);

    this.http.get<PlayerCardSecret[]>(
      `${environment.apiUrl}/api/campaigns/${campaignId}/player-cards/${member.id}/secrets/shared`
    ).subscribe({
      next: s => { this.secrets.set(s); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  close() {
    this.isClosing.set(true);
    setTimeout(() => {
      this.isOpen.set(false);
      this.member.set(null);
      this.secrets.set([]);
      this.isClosing.set(false);
    }, 240);
  }

  @HostListener('document:keydown.escape')
  onEscape() {
    if (this.isOpen()) {
      this.close();
    }
  }
}
