import { Component, OnInit, signal, inject, computed } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { Location } from '../../../shared/models/location.model';
import { LocationCardComponent } from '../../../shared/components/location-card/location-card.component';
import { JournalTitleComponent } from '../../../shared/components/journal-title/journal-title.component';
import { JournalWatermarkComponent } from '../../../shared/components/journal-watermark/journal-watermark.component';
import { UpgradeBadgeComponent } from '../../../shared/components/upgrade-badge/upgrade-badge.component';
import { StripeService, EntityLimitsResponse } from '../../../core/stripe.service';
import { SubscriptionService } from '../../../core/subscription.service';
import { SubscriptionDrawerService } from '../../../core/subscription-drawer.service';
import { AuthService } from '../../../core/auth/auth.service';
import { CampaignHubService } from '../../../core/hub/campaign-hub.service';

@Component({
  selector: 'app-location-library',
  standalone: true,
  imports: [CommonModule, FormsModule, LocationCardComponent, RouterLink, JournalTitleComponent, JournalWatermarkComponent, UpgradeBadgeComponent],
  templateUrl: './location-library.component.html',
  styleUrl: './location-library.component.scss'
})
export class LocationLibraryComponent implements OnInit {
  private http       = inject(HttpClient);
  router             = inject(Router);
  private stripe     = inject(StripeService);
  subscription       = inject(SubscriptionService);
  private drawerService  = inject(SubscriptionDrawerService);
  private auth       = inject(AuthService);
  private hub        = inject(CampaignHubService);
  locations          = signal<Location[]>([]);
  searchTerm      = signal('');
  pendingDeleteId = signal<string | null>(null);
  locationLimitReached = signal(false);
  private tiltMap = new Map<string, number>();

  readonly isCreateDisabled = computed(() => {
    if (this.auth.isExempt()) return false;
    if (this.subscription.isFreeTrial()) return false;
    const level = this.auth.lockLevel();
    return level !== 'FullAccess';
  });

  ngOnInit() {
    console.log('LocationLibrary: Initializing SignalR connection...');
    const token = this.auth.getToken();
    if (token && token.length > 0) {
      this.hub.connect(token).catch((err: unknown) => console.error('LocationLibrary: SignalR connection failed:', err));
    } else {
      console.log('LocationLibrary: No token found, skipping SignalR connection');
    }

    this.http.get<Location[]>(`${environment.apiUrl}/api/locations`).subscribe(c => this.locations.set(c));
    this.loadEntityLimits();
  }

  filtered() {
    const term = this.searchTerm().toLowerCase();
    if (!term) return this.locations();
    return this.locations().filter(c => c.name.toLowerCase().includes(term) || c.classification.toLowerCase().includes(term));
  }

  edit(id: string) { this.router.navigate(['/dm/locations', id]); }

  confirmDelete(id: string) { this.pendingDeleteId.set(id); }
  cancelDelete()            { this.pendingDeleteId.set(null); }

  executeDelete() {
    const id = this.pendingDeleteId();
    if (!id) return;
    this.http.delete(`${environment.apiUrl}/api/locations/${id}`)
      .subscribe(() => {
        this.locations.set(this.locations().filter(c => c.id !== id));
        this.pendingDeleteId.set(null);
      });
  }

  private loadEntityLimits() {
    this.stripe.getUserEntityLimits().subscribe({
      next: (limits: EntityLimitsResponse) => {
        this.locationLimitReached.set(limits.locations.limitReached);
      },
      error: () => {
        this.locationLimitReached.set(false);
      }
    });
  }

  tiltFor(id: string): number {
    if (!this.tiltMap.has(id)) {
      this.tiltMap.set(id, parseFloat((Math.random() * 4 - 2).toFixed(2)));
    }
    return this.tiltMap.get(id)!;
  }

  openUpgradeDrawer() {
    this.drawerService.open();
  }
}
