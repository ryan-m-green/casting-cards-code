import { Component, OnInit, OnDestroy, signal, computed, inject, HostBinding, viewChild, TemplateRef } from '@angular/core';
import { Subscription } from 'rxjs';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { environment } from '../../../environments/environment';
import { CampaignDetail } from '../../shared/models/campaign.model';
import { AuthService } from '../../core/auth/auth.service';
import { CampaignHubService } from '../../core/hub/campaign-hub.service';
import { PortalAnimationService } from '../../core/portal-animation.service';
import { V2CampaignShellService } from '../../core/v2-campaign-shell.service';
import { V2CampaignPlaceholderComponent } from '../../features/campaign/v2-campaign-placeholder/v2-campaign-placeholder.component';
import { CcStorylineComponent } from '../../shared/components/cc-storyline/cc-storyline.component';
import { CcStorylineViewComponent, StorylineViewItem } from '../../shared/components/cc-storyline-view/cc-storyline-view.component';
import { CcStorylineContentComponent, StorylineContentEdit } from '../../shared/components/cc-storyline-content/cc-storyline-content.component';
import { CcCardNavigationComponent } from '../../shared/components/cc-card-navigation/cc-card-navigation.component';
import { CcCardFactionNavigationComponent } from '../../shared/components/cc-card-faction-navigation/cc-card-faction-navigation.component';
import { CcDayCounterComponent } from '../../shared/components/cc-day-counter/cc-day-counter.component';
import { CcRadialNavComponent } from '../../shared/components/cc-radial-nav/cc-radial-nav.component';
import { CcPartyPanelComponent } from '../../shared/components/cc-party-panel/cc-party-panel.component';
import { RightDrawerComponent } from '../../shared/components/right-drawer/right-drawer.component';
import { CcPlayerSecretsContentComponent } from '../../shared/components/cc-player-secrets-content/cc-player-secrets-content.component';
import { CcPartyGoldContentComponent } from '../../shared/components/cc-party-gold-content/cc-party-gold-content.component';
import { CcGridAreaTitleComponent } from '../../shared/components/v2/cc-grid-area-title/cc-grid-area-title.component';
import { CcWorldMapComponent } from '../../shared/components/cc-world-map/cc-world-map.component';
import { CcWorldmapContentComponent } from '../../shared/components/cc-worldmap-content/cc-worldmap-content.component';
import { CcCampaignChronicleContentComponent } from '../../shared/components/cc-campaign-chronicle-content/cc-campaign-chronicle-content.component';
import { CcSoundtracksComponent } from '../../shared/components/cc-soundtracks/cc-soundtracks.component';
import { AmbianceBuilderContentComponent } from '../../shared/components/right-drawer/ambiance-builder-content.component';

@Component({
  selector: 'app-v2-campaign-shell',
  standalone: true,
  imports: [CommonModule, V2CampaignPlaceholderComponent, CcStorylineComponent, CcStorylineViewComponent, CcStorylineContentComponent, CcCardNavigationComponent, CcCardFactionNavigationComponent, CcDayCounterComponent, CcRadialNavComponent, CcPartyPanelComponent, RightDrawerComponent, CcPlayerSecretsContentComponent, CcPartyGoldContentComponent, CcGridAreaTitleComponent, CcWorldMapComponent, CcWorldmapContentComponent, CcCampaignChronicleContentComponent, CcSoundtracksComponent, AmbianceBuilderContentComponent],
  templateUrl: './v2-campaign-shell.component.html',
  styleUrl: './v2-campaign-shell.component.scss',
})
export class V2CampaignShellComponent implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private http = inject(HttpClient);
  private hub = inject(CampaignHubService);
  private animationService = inject(PortalAnimationService);
  auth = inject(AuthService);
  shellSvc = inject(V2CampaignShellService);
  
  @HostBinding('class.portal-entry') portalEntry = false;
  @HostBinding('style.--portal-color') get portalColor() { return this.safeColor(this.campaign()?.spineColor); }
  
  campaignId = signal('');
  campaign = signal<CampaignDetail | null>(null);
  
  // Getter for campaign ID to pass to child component
  get campaignIdValue(): string {
    return this.campaignId();
  }
  
  // Viewport positioning state
  viewportPosition = signal({ x: -100, y: -100 }); // Current viewport offset (start in middle middle)
  currentArea = signal('middle-middle'); // Track current area name
  isViewportMoved = signal(false); // Track if viewport has moved from center
  
  showRolodexBlockers = computed(() => this.currentArea() === 'middle-middle');

  // Role detection - computed based on campaign data and auth service
  isDm = computed(() => {
    const camp = this.campaign();
    if (!camp) return false;
    return camp.dmUserId === this.auth.currentUser()?.id;
  });
  
  private hubSubscriptions: Subscription[] = [];

  // ── Right drawer state ─────────────────────────────────────────────────────
  rightDrawer = viewChild.required<RightDrawerComponent>('rightDrawer');
  playerSecretsContentTemplate = viewChild.required<TemplateRef<any>>('playerSecretsContentTemplate');
  partyGoldContentTemplate = viewChild.required<TemplateRef<any>>('partyGoldContentTemplate');
  ambianceEditorContentTemplate = viewChild.required<TemplateRef<any>>('ambianceEditorContentTemplate');
  storylineCreateContentTemplate = viewChild.required<TemplateRef<any>>('storylineCreateContentTemplate');
  storylineEditContentTemplate = viewChild.required<TemplateRef<any>>('storylineEditContentTemplate');
  storylineViewContentTemplate = viewChild.required<TemplateRef<any>>('storylineViewContentTemplate');
  worldMapContentTemplate = viewChild.required<TemplateRef<any>>('worldMapContentTemplate');
  chroniclesContentTemplate = viewChild.required<TemplateRef<any>>('chroniclesContentTemplate');

  storylineRefreshTick = signal(0);
  storylineEditItem = signal<StorylineContentEdit | null>(null);
  storylineViewItem = signal<StorylineViewItem | null>(null);

  drawerTitle = signal('');
  currentContentTemplate = signal<TemplateRef<any> | null>(null);
  currentContentContext = signal<any>(null);

  constructor() {
    // Set up campaign data updates from hub
    this.hubSubscriptions.push(
      this.hub.campaignNavChanged$.subscribe(ev => {
        if (!ev || ev.campaignId !== this.campaignId()) return;
        this.http.get<CampaignDetail>(`${environment.apiUrl}/api/campaigns/${ev.campaignId}`)
          .subscribe(c => { 
            this.campaign.set(c); 
            this.shellSvc.setCampaign(c);
            // Update role in service
            this.shellSvc.setIsDm(this.isDm());
          });
      })
    );
    
    // Listen for player secrets drawer requests from child components
    this.hubSubscriptions.push(
      this.shellSvc.openPlayerSecrets.subscribe(request => {
        this.drawerTitle.set(request.member.name);
        this.currentContentTemplate.set(this.playerSecretsContentTemplate());
        this.currentContentContext.set({
          member: request.member,
          campaignId: request.campaignId,
          mode: 'dm',
          portalColor: request.portalColor,
        });
        this.rightDrawer().open();
      })
    );

    // Listen for party gold drawer requests
    this.hubSubscriptions.push(
      this.shellSvc.openPartyGold.subscribe(() => {
        this.openPartyGoldDrawer();
      })
    );

    // Listen for ambiance editor drawer requests
    this.hubSubscriptions.push(
      this.shellSvc.openAmbianceEditor.subscribe(request => {
        this.drawerTitle.set(request.ambiance.title);
        this.currentContentTemplate.set(this.ambianceEditorContentTemplate());
        this.currentContentContext.set({
          ambiance: request.ambiance,
          campaignId: request.campaignId,
          portalColor: request.portalColor
        });
        this.rightDrawer().open();
      })
    );

    // Update cast's sublocation in campaign when a cast travels
    this.hubSubscriptions.push(
      this.hub.castTravel$.subscribe(event => {
        if (!event || event.campaignId !== this.campaignId()) return;
        
        const update = (c: CampaignDetail | null): CampaignDetail | null => {
          if (!c) return c;
          return {
            ...c,
            casts: c.casts.map(ca => {
              if (ca.instanceId === event.castInstanceId) {
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
  }
  
  safeColor(color: string | undefined): string {
    return color && /^#[0-9a-fA-F]{6}$/.test(color) ? color : '#6e28d0';
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

  openStorylineCreate() {
    this.drawerTitle.set('New Storyline Content');
    this.currentContentTemplate.set(this.storylineCreateContentTemplate());
    this.currentContentContext.set(null);
    this.rightDrawer().open();
  }

  onStorylineCreated() {
    this.storylineRefreshTick.update(tick => tick + 1);
  }

  openStorylineEdit(item: StorylineContentEdit) {
    this.storylineEditItem.set(item);
    this.drawerTitle.set('Edit Storyline Content');
    this.currentContentTemplate.set(this.storylineEditContentTemplate());
    this.currentContentContext.set(null);
    this.rightDrawer().open();
  }

  openStorylineView(item: StorylineViewItem) {
    this.storylineViewItem.set(item);
    this.drawerTitle.set('Storyline Content');
    this.currentContentTemplate.set(this.storylineViewContentTemplate());
    this.currentContentContext.set(null);
    this.rightDrawer().open();
  }

  onPartyGoldAwarded(response: { currency: string; playerAwards: { playerUserId: string; amount: number }[] }) {
    this.shellSvc.partyGoldAwarded.next(response);
  }

  openChroniclesDrawer() {
    this.drawerTitle.set('Campaign Chronicles');
    this.currentContentTemplate.set(this.chroniclesContentTemplate());
    this.currentContentContext.set(null);
    this.rightDrawer().open();
  }

  openWorldMapDrawer() {
    this.drawerTitle.set('World Map');
    this.currentContentTemplate.set(this.worldMapContentTemplate());
    this.currentContentContext.set(null);
    this.rightDrawer().open();
  }

  onWorldMapUploaded(url: string) {
    const update = (c: CampaignDetail | null): CampaignDetail | null =>
      c ? { ...c, worldMapImageUrl: url } : c;
    this.campaign.update(update);
    this.shellSvc.updateCampaign(update);
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
        this.shellSvc.setIsDm(this.isDm());
        this.animationService.spineColor = c.spineColor;
      });
    
    // Connect to hub for real-time updates
    const connectAndJoin = !this.hub.isConnected()
      ? this.hub.connect().then(() => this.hub.joinCampaign(id))
      : this.hub.joinCampaign(id);
    connectAndJoin.catch(() => {});
  }
  
  ngOnDestroy() {
    this.hub.leaveCampaign(this.campaignId()).catch(() => {});
    this.hubSubscriptions.forEach(sub => sub.unsubscribe());
  }
  
  // Move viewport to top-right area (diagonal movement)
  moveToTopRight() {
    this.viewportPosition.set({ x: -200, y: 0 });
    this.currentArea.set('top-right');
    this.isViewportMoved.set(true);
  }
  
  // Return viewport to center
  moveToCenter() {
    this.viewportPosition.set({ x: -100, y: -100 });
    this.currentArea.set('middle-middle');
    this.isViewportMoved.set(false);
  }
  
  // Navigation methods for each area
  moveToTopLeft() {
    this.viewportPosition.set({ x: 0, y: 0 });
    this.currentArea.set('top-left');
    this.isViewportMoved.set(true);
  }
  
  moveToTopMiddle() {
    this.viewportPosition.set({ x: -100, y: 0 });
    this.currentArea.set('top-middle');
    this.isViewportMoved.set(true);
  }
  
  moveToMiddleLeft() {
    this.viewportPosition.set({ x: 0, y: -100 });
    this.currentArea.set('middle-left');
    this.isViewportMoved.set(true);
  }
  
  moveToMiddleRight() {
    this.viewportPosition.set({ x: -200, y: -100 });
    this.currentArea.set('middle-right');
    this.isViewportMoved.set(true);
  }
  
  moveToBottomLeft() {
    this.viewportPosition.set({ x: 0, y: -200 });
    this.currentArea.set('bottom-left');
    this.isViewportMoved.set(true);
  }
  
  moveToBottomMiddle() {
    this.viewportPosition.set({ x: -100, y: -200 });
    this.currentArea.set('bottom-middle');
    this.isViewportMoved.set(true);
  }
  
  moveToBottomRight() {
    this.viewportPosition.set({ x: -200, y: -200 });
    this.currentArea.set('bottom-right');
    this.isViewportMoved.set(true);
  }

  // ── Radial grid navigation dispatcher ───────────────────────────────────────
  onRadialNav(area: string) {
    switch (area) {
      case 'top-left':      this.moveToTopLeft();      break;
      case 'top-middle':    this.moveToTopMiddle();    break;
      case 'top-right':     this.moveToTopRight();     break;
      case 'middle-left':   this.moveToMiddleLeft();   break;
      case 'middle-middle': this.moveToCenter();       break;
      case 'middle-right':  this.moveToMiddleRight();  break;
      case 'bottom-left':   this.moveToBottomLeft();   break;
      case 'bottom-middle': this.moveToBottomMiddle(); break;
      case 'bottom-right':  this.moveToBottomRight();  break;
    }
  }
}