import { Component, OnInit, OnDestroy, signal, computed, inject, HostBinding, viewChild, TemplateRef } from '@angular/core';
import { Subscription } from 'rxjs';
import { ActivatedRoute, Router, RouterLink, RouterOutlet } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { CampaignDetail } from '../../../shared/models/campaign.model';
import { AuthService } from '../../../core/auth/auth.service';
import { CampaignHubService } from '../../../core/hub/campaign-hub.service';
import { PortalAnimationService } from '../../../core/portal-animation.service';
import { CampaignShellService } from '../../../core/campaign-shell.service';
import { TimeOfDayBarComponent } from '../../../shared/components/time-of-day-bar/time-of-day-bar.component';
import { VoidNavDrawerComponent } from '../../../shared/components/void-nav-drawer/void-nav-drawer.component';
import { VoidTitleSegmentsComponent } from '../../../shared/components/void-title-segments/void-title-segments.component';
import { UpgradeBadgeComponent } from '../../../shared/components/upgrade-badge/upgrade-badge.component';
import { RightDrawerComponent } from '../../../shared/components/right-drawer/right-drawer.component';
import { ChronicleContentComponent } from '../../../shared/components/right-drawer/chronicle-content.component';
import { PlayerSecretsContentComponent } from '../../../shared/components/right-drawer/player-secrets-content.component';
import { PartyGoldContentComponent } from '../../../shared/components/right-drawer/party-gold-content.component';
import { SubscriptionContentComponent } from '../../../shared/components/right-drawer/subscription-content.component';
import { SoundtrackContentComponent } from '../../../shared/components/right-drawer/soundtrack-content.component';
import { PlayerCardWithDetails } from '../../../shared/models/player-card.model';

@Component({
  selector: 'app-campaign-shell',
  standalone: true,
  imports: [RouterOutlet, TimeOfDayBarComponent, VoidNavDrawerComponent, VoidTitleSegmentsComponent, UpgradeBadgeComponent, RightDrawerComponent, ChronicleContentComponent, PlayerSecretsContentComponent, PartyGoldContentComponent, SubscriptionContentComponent, SoundtrackContentComponent],
  templateUrl: './campaign-shell.component.html',
  styleUrl: './campaign-shell.component.scss',
})
export class CampaignShellComponent implements OnInit, OnDestroy {
  private route          = inject(ActivatedRoute);
  private router         = inject(Router);
  private http           = inject(HttpClient);
  private hub            = inject(CampaignHubService);
  private animationService = inject(PortalAnimationService);
  auth = inject(AuthService);
  private hubSubscriptions: Subscription[] = [];
  shellSvc           = inject(CampaignShellService);

  @HostBinding('class.portal-entry') portalEntry = false;
  @HostBinding('style.--portal-color') get portalColor() { return this.safeColor(this.campaign()?.spineColor); }

  campaignId = signal('');
  campaign   = signal<CampaignDetail | null>(null);

  isDm = computed(() => this.campaign()?.dmUserId === this.auth.currentUser()?.id);

  // ── Right drawer state ─────────────────────────────────────────────────────
  rightDrawer = viewChild.required<RightDrawerComponent>('rightDrawer');
  chronicleContentTemplate = viewChild.required<TemplateRef<any>>('chronicleContentTemplate');
  playerSecretsContentTemplate = viewChild.required<TemplateRef<any>>('playerSecretsContentTemplate');
  partyGoldContentTemplate = viewChild.required<TemplateRef<any>>('partyGoldContentTemplate');
  subscriptionContentTemplate = viewChild.required<TemplateRef<any>>('subscriptionContentTemplate');
  soundtrackContentTemplate = viewChild.required<TemplateRef<any>>('soundtrackContentTemplate');

  drawerTitle = signal('');
  currentContentTemplate = signal<TemplateRef<any> | null>(null);
  currentContentContext = signal<any>(null);

  constructor() {
    this.hubSubscriptions.push(
      this.hub.campaignNavChanged$.subscribe(ev => {
        if (!ev || ev.campaignId !== this.campaignId()) return;
        this.http.get<CampaignDetail>(`${environment.apiUrl}/api/campaigns/${ev.campaignId}`)
          .subscribe(c => { this.campaign.set(c); this.shellSvc.setCampaign(c); });
      })
    );

    // Update cast's sublocation in campaign when a cast travels — keeps the nav drawer in sync
    this.hubSubscriptions.push(
      this.hub.castTravel$.subscribe(event => {
        if (!event || event.campaignId !== this.campaignId()) return;

        const update = (c: CampaignDetail | null): CampaignDetail | null => {
          if (!c) return c;
          return {
            ...c,
            casts: c.casts.map(ca => {
              if (ca.instanceId === event.castInstanceId) {
                // When hiding, move back to fromSublocationInstanceId
                // When revealing, move to toSublocationInstanceId
                const targetSublocationId = event.isVisible
                  ? event.toSublocationInstanceId
                  : event.fromSublocationInstanceId;
                return {
                  ...ca,
                  sublocationInstanceId: targetSublocationId,
                  locationInstanceId: event.toLocationInstanceId
                };
              }
              return ca;
            }),
          };
        };

        this.campaign.update(update);
        this.shellSvc.updateCampaign(update);
      })
    );

    this.hubSubscriptions.push(
      this.shellSvc.openChronicleWithSearch.subscribe(query => {
        this.openChronicleDrawer(query);
      })
    );

    // Listen for drawer requests from child components
    this.hubSubscriptions.push(
      this.shellSvc.openDrawerRequest.subscribe(request => {
        this.drawerTitle.set(request.title);
        this.currentContentTemplate.set(request.template);
        this.currentContentContext.set(request.context);
        this.rightDrawer().open();
      })
    );

    // Listen for party gold drawer requests
    this.hubSubscriptions.push(
      this.shellSvc.openPartyGold.subscribe(() => {
        this.openPartyGoldDrawer();
      })
    );
  }

  safeColor(color: string | undefined): string {
    return color && /^#[0-9a-fA-F]{6}$/.test(color) ? color : '#6e28d0';
  }

  ngOnInit() {
    if (history.state?.portalEntry) {
      this.portalEntry = true;
      setTimeout(() => this.animationService.hide(), 300);
    } else {
      this.animationService.hide();
    }

    const id = this.route.snapshot.paramMap.get('id')!;
    this.campaignId.set(id);

    this.http.get<CampaignDetail>(`${environment.apiUrl}/api/campaigns/${id}`)
      .subscribe(c => {
        this.campaign.set(c);
        this.shellSvc.setCampaign(c);
        this.animationService.spineColor = c.spineColor;
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
    this.openSubscriptionDrawer();
  }

  openChronicleDrawer(query?: string) {
    this.drawerTitle.set('Campaign Chronicles');
    this.currentContentTemplate.set(this.chronicleContentTemplate());
    this.currentContentContext.set({
      campaignId: this.campaignId(),
      isDmMode: true,
      portalColor: this.safeColor(this.campaign()?.spineColor),
      initialSearchQuery: query
    });
    this.rightDrawer().open();
  }

  openPlayerSecretsDrawer(member: PlayerCardWithDetails) {
    this.drawerTitle.set(member.name);
    this.currentContentTemplate.set(this.playerSecretsContentTemplate());
    this.currentContentContext.set({
      member: member,
      campaignId: this.campaignId(),
      mode: 'dm',
      portalColor: this.safeColor(this.campaign()?.spineColor)
    });
    this.rightDrawer().open();
  }

  openPartyGoldDrawer() {
    this.drawerTitle.set('Award Treasure to Party');
    this.currentContentTemplate.set(this.partyGoldContentTemplate());
    this.currentContentContext.set({
      campaignId: this.campaignId(),
      portalColor: this.safeColor(this.campaign()?.spineColor)
    });
    this.rightDrawer().open();
  }

  openSubscriptionDrawer() {
    this.drawerTitle.set('Upgrade Your Plan');
    this.currentContentTemplate.set(this.subscriptionContentTemplate());
    this.currentContentContext.set({});
    this.rightDrawer().open();
  }

  openSoundtrackDrawer() {
    this.drawerTitle.set('Soundtrack Control');
    this.currentContentTemplate.set(this.soundtrackContentTemplate());
    this.currentContentContext.set({
      campaignId: this.campaignId(),
      portalColor: this.safeColor(this.campaign()?.spineColor)
    });
    this.rightDrawer().open();
  }

  onPartyGoldAwarded(response: { currency: string; playerAwards: { playerUserId: string; amount: number }[] }) {
    this.shellSvc.partyGoldAwarded.next(response);
  }

  goToEvents() {
    this.router.navigate(['/campaign', this.campaignId(), 'plot']);
  }
}
