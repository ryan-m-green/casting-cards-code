import { Component, OnInit, signal, inject, computed } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { Faction } from '../../../shared/models/faction.model';
import { FactionCardComponent } from '../../../shared/components/faction-card/faction-card.component';
import { JournalTitleComponent } from '../../../shared/components/journal-title/journal-title.component';
import { JournalWatermarkComponent } from '../../../shared/components/journal-watermark/journal-watermark.component';
import { UpgradeBadgeComponent } from '../../../shared/components/upgrade-badge/upgrade-badge.component';
import { StripeService, EntityLimitsResponse } from '../../../core/stripe.service';
import { SubscriptionDrawerService } from '../../../core/subscription-drawer.service';
import { AuthService } from '../../../core/auth/auth.service';
import { CampaignHubService } from '../../../core/hub/campaign-hub.service';

@Component({
  selector: 'app-faction-library',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, FactionCardComponent, JournalTitleComponent, JournalWatermarkComponent, UpgradeBadgeComponent],
  templateUrl: './faction-library.component.html',
  styleUrl: './faction-library.component.scss'
})
export class FactionLibraryComponent implements OnInit {
  private http       = inject(HttpClient);
  router             = inject(Router);
  private stripe     = inject(StripeService);
  private drawerService  = inject(SubscriptionDrawerService);
  auth = inject(AuthService);
  private hub        = inject(CampaignHubService);

  factions        = signal<Faction[]>([]);
  searchTerm      = signal('');
  pendingDeleteId = signal<string | null>(null);
  factionLimitReached = signal(false);
  private tiltMap = new Map<string, number>();

  readonly isCreateDisabled = computed(() => {
    if (this.auth.isExempt()) return false;
    if (this.auth.isFreeTrial()) return false;
    const level = this.auth.lockLevel();
    return level !== 'FullAccess';
  });

  ngOnInit() {
    this.hub.connect().catch((err: unknown) => {});

    this.http.get<Faction[]>(`${environment.apiUrl}/api/factions`)
      .subscribe(f => this.factions.set(f));
    this.loadEntityLimits();
  }

  filtered() {
    const term = this.searchTerm().toLowerCase();
    if (!term) return this.factions();
    return this.factions().filter(f =>
      f.name.toLowerCase().includes(term) ||
      f.type.toLowerCase().includes(term)
    );
  }

  edit(id: string)          { this.router.navigate(['/gm/faction', id]); }
  confirmDelete(id: string) { this.pendingDeleteId.set(id); }
  cancelDelete()            { this.pendingDeleteId.set(null); }

  executeDelete() {
    const id = this.pendingDeleteId();
    if (!id) return;
    this.http.delete(`${environment.apiUrl}/api/factions/${id}`)
      .subscribe(() => {
        this.factions.set(this.factions().filter(f => f.id !== id));
        this.pendingDeleteId.set(null);
      });
  }

  tiltFor(id: string): number {
    if (!this.tiltMap.has(id)) {
      this.tiltMap.set(id, parseFloat((Math.random() * 4 - 2).toFixed(2)));
    }
    return this.tiltMap.get(id)!;
  }

  private loadEntityLimits() {
    this.stripe.getUserEntityLimits().subscribe({
      next: (limits: EntityLimitsResponse) => {
        this.factionLimitReached.set(limits.factions.limitReached);
      },
      error: () => {
        this.factionLimitReached.set(false);
      }
    });
  }

  openUpgradeDrawer() {
    this.drawerService.open();
  }
}
