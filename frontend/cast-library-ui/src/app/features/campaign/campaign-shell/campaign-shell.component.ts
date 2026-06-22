import { Component, OnInit, OnDestroy, signal, computed, inject, HostBinding } from '@angular/core';
import { Subscription } from 'rxjs';
import { ActivatedRoute, Router, RouterLink, RouterOutlet } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { CampaignDetail } from '../../../shared/models/campaign.model';
import { AuthService } from '../../../core/auth/auth.service';
import { CampaignHubService } from '../../../core/hub/campaign-hub.service';
import { PortalTransitionService } from '../../../core/portal-transition.service';
import { CampaignShellService } from '../../../core/campaign-shell.service';
import { SubscriptionDrawerService } from '../../../core/subscription-drawer.service';
import { TimeOfDayBarComponent } from '../../../shared/components/time-of-day-bar/time-of-day-bar.component';
import { VoidNavDrawerComponent } from '../../../shared/components/void-nav-drawer/void-nav-drawer.component';
import { VoidTitleSegmentsComponent } from '../../../shared/components/void-title-segments/void-title-segments.component';
import { UpgradeBadgeComponent } from '../../../shared/components/upgrade-badge/upgrade-badge.component';

@Component({
  selector: 'app-campaign-shell',
  standalone: true,
  imports: [RouterOutlet, TimeOfDayBarComponent, VoidNavDrawerComponent, VoidTitleSegmentsComponent, UpgradeBadgeComponent],
  templateUrl: './campaign-shell.component.html',
  styleUrl: './campaign-shell.component.scss',
})
export class CampaignShellComponent implements OnInit, OnDestroy {
  private route          = inject(ActivatedRoute);
  private router         = inject(Router);
  private http           = inject(HttpClient);
  private hub            = inject(CampaignHubService);
  private transition     = inject(PortalTransitionService);
  auth = inject(AuthService);
  private drawerService  = inject(SubscriptionDrawerService);
  private hubSubscriptions: Subscription[] = [];
  shellSvc           = inject(CampaignShellService);

  @HostBinding('class.portal-entry') portalEntry = false;
  @HostBinding('style.--portal-color') get portalColor() { return this.safeColor(this.campaign()?.spineColor); }

  campaignId = signal('');
  campaign   = signal<CampaignDetail | null>(null);

  isDm = computed(() => this.campaign()?.dmUserId === this.auth.currentUser()?.id);

  constructor() {
    this.hubSubscriptions.push(
      this.hub.campaignNavChanged$.subscribe(ev => {
        if (!ev || ev.campaignId !== this.campaignId()) return;
        this.http.get<CampaignDetail>(`${environment.apiUrl}/api/campaigns/${ev.campaignId}`)
          .subscribe(c => { this.campaign.set(c); this.shellSvc.setCampaign(c); });
      })
    );
  }

  safeColor(color: string | undefined): string {
    return color && /^#[0-9a-fA-F]{6}$/.test(color) ? color : '#6e28d0';
  }

  ngOnInit() {
    if (history.state?.portalEntry) {
      this.portalEntry = true;
      setTimeout(() => this.transition.hide(), 300);
    } else {
      this.transition.hide();
    }

    const id = this.route.snapshot.paramMap.get('id')!;
    this.campaignId.set(id);

    this.http.get<CampaignDetail>(`${environment.apiUrl}/api/campaigns/${id}`)
      .subscribe(c => {
        this.campaign.set(c);
        this.shellSvc.setCampaign(c);
        this.transition.spineColor = c.spineColor;
      });

    const connectAndJoin = !this.hub.isConnected()
      ? this.hub.connect().then(() => this.hub.joinCampaign(id))
      : this.hub.joinCampaign(id);
    connectAndJoin.catch(() => {});
  }

  ngOnDestroy() {
    this.hub.leaveCampaign(this.campaignId()).catch(() => {});
    this.hubSubscriptions.forEach(sub => sub.unsubscribe());
  }

  goToTheParty() {
    this.router.navigate(['/campaign', this.campaignId(), 'the-party']);
  }

  goToFactions() {
    this.router.navigate(['/campaign', this.campaignId(), 'factions']);
  }

  openUpgradeDrawer() {
    this.drawerService.open();
  }
}
