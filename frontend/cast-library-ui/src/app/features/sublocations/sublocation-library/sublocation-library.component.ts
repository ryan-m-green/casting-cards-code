import { Component, OnInit, signal, inject, computed } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { Sublocation } from '../../../shared/models/sublocation.model';
import { SublocationCardComponent } from '../../../shared/components/sublocation-card/sublocation-card.component';
import { JournalTitleComponent } from '../../../shared/components/journal-title/journal-title.component';
import { JournalWatermarkComponent } from '../../../shared/components/journal-watermark/journal-watermark.component';
import { UpgradeBadgeComponent } from '../../../shared/components/upgrade-badge/upgrade-badge.component';
import { StripeService, EntityLimitsResponse } from '../../../core/stripe.service';
import { SubscriptionService } from '../../../core/subscription.service';
import { SubscriptionDrawerService } from '../../../core/subscription-drawer.service';
import { AuthService } from '../../../core/auth/auth.service';
import { CampaignHubService } from '../../../core/hub/campaign-hub.service';

@Component({
  selector: 'app-sublocation-library',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, SublocationCardComponent, JournalTitleComponent, JournalWatermarkComponent, UpgradeBadgeComponent],
  templateUrl: './sublocation-library.component.html',
  styleUrl: './sublocation-library.component.scss'
})
export class SublocationLibraryComponent implements OnInit {
  private http       = inject(HttpClient);
  router             = inject(Router);
  private stripe     = inject(StripeService);
  subscription       = inject(SubscriptionService);
  private drawerService  = inject(SubscriptionDrawerService);
  private auth       = inject(AuthService);
  private hub        = inject(CampaignHubService);
  sublocations    = signal<Sublocation[]>([]);
  searchTerm      = signal('');
  pendingDeleteId = signal<string | null>(null);
  sublocationLimitReached = signal(false);
  private tiltMap = new Map<string, number>();

  readonly isCreateDisabled = computed(() => {
    if (this.auth.isExempt()) return false;
    if (this.subscription.isFreeTrial()) return false;
    const level = this.auth.lockLevel();
    return level !== 'FullAccess';
  });

  ngOnInit() {
    console.log('SublocationLibrary: Initializing SignalR connection...');
    const token = this.auth.getToken();
    if (token && token.length > 0) {
      this.hub.connect(token).catch((err: unknown) => console.error('SublocationLibrary: SignalR connection failed:', err));
    } else {
      console.log('SublocationLibrary: No token found, skipping SignalR connection');
    }

    this.http.get<Sublocation[]>(`${environment.apiUrl}/api/sublocations`).subscribe(l => this.sublocations.set(l));
    this.loadEntityLimits();
  }

  filtered() {
    const term = this.searchTerm().toLowerCase();
    if (!term) return this.sublocations();
    return this.sublocations().filter(s =>
      s.name.toLowerCase().includes(term) ||
      s.description.toLowerCase().includes(term)
    );
  }

  edit(id: string) { this.router.navigate(['/dm/sublocations', id]); }

  confirmDelete(id: string) { this.pendingDeleteId.set(id); }
  cancelDelete()            { this.pendingDeleteId.set(null); }

  executeDelete() {
    const id = this.pendingDeleteId();
    if (!id) return;
    this.http.delete(`${environment.apiUrl}/api/sublocations/${id}`)
      .subscribe(() => {
        this.sublocations.set(this.sublocations().filter(l => l.id !== id));
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
        this.sublocationLimitReached.set(limits.sublocations.limitReached);
      },
      error: () => {
        this.sublocationLimitReached.set(false);
      }
    });
  }

  openUpgradeDrawer() {
    this.drawerService.open();
  }
}
