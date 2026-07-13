import { Component, OnInit, signal, inject, computed } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { Cast } from '../../../shared/models/cast.model';
import { CastCardComponent } from '../../../shared/components/cast-card/cast-card.component';
import { JournalTitleComponent } from '../../../shared/components/journal-title/journal-title.component';
import { JournalWatermarkComponent } from '../../../shared/components/journal-watermark/journal-watermark.component';
import { UpgradeBadgeComponent } from '../../../shared/components/upgrade-badge/upgrade-badge.component';
import { StripeService, EntityLimitsResponse } from '../../../core/stripe.service';
import { SubscriptionDrawerService } from '../../../core/subscription-drawer.service';
import { AuthService } from '../../../core/auth/auth.service';
import { CampaignHubService } from '../../../core/hub/campaign-hub.service';

@Component({
  selector: 'app-cast-library',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, CastCardComponent, JournalTitleComponent, JournalWatermarkComponent, UpgradeBadgeComponent],
  templateUrl: './cast-library.component.html',
  styleUrl: './cast-library.component.scss'
})
export class CastLibraryComponent implements OnInit {
  private http       = inject(HttpClient);
  router             = inject(Router);
  private stripe     = inject(StripeService);
  private drawerService  = inject(SubscriptionDrawerService);
  auth = inject(AuthService);
  private hub        = inject(CampaignHubService);

  cast            = signal<Cast[]>([]);
  searchTerm      = signal('');
  pendingDeleteId = signal<string | null>(null);
  castLimitReached = signal(false);
  private tiltMap = new Map<string, number>();

  readonly isCreateDisabled = computed(() => {
    if (this.auth.isExempt()) return false;
    if (this.auth.isFreeTrial()) return false;
    const level = this.auth.lockLevel();
    return level !== 'FullAccess';
  });

  ngOnInit() {
    // Only connect to SignalR if user is authenticated to prevent 401 errors
    if (this.auth.isLoggedIn()) {
      this.hub.connect().catch((err: unknown) => {});
    }

    this.http.get<Cast[]>(`${environment.apiUrl}/api/cast`)
      .subscribe(n => this.cast.set(n));
    this.loadEntityLimits();
  }

  filtered() {
    const term = this.searchTerm().toLowerCase();
    if (!term) return this.cast();
    return this.cast().filter(n =>
      n.name.toLowerCase().includes(term) ||
      n.race.toLowerCase().includes(term) ||
      n.role.toLowerCase().includes(term)
    );
  }

  initial(name: string) { return name.charAt(0).toUpperCase(); }
  edit(id: string)      { this.router.navigate(['/gm/cast', id]); }

  confirmDelete(id: string) { this.pendingDeleteId.set(id); }
  cancelDelete()            { this.pendingDeleteId.set(null); }

  executeDelete() {
    const id = this.pendingDeleteId();
    if (!id) return;
    this.http.delete(`${environment.apiUrl}/api/cast/${id}`)
      .subscribe(() => {
        this.cast.set(this.cast().filter(n => n.id !== id));
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
        this.castLimitReached.set(limits.cast.limitReached);
      },
      error: () => {
        this.castLimitReached.set(false);
      }
    });
  }

  openUpgradeDrawer() {
    this.drawerService.open();
  }
}
