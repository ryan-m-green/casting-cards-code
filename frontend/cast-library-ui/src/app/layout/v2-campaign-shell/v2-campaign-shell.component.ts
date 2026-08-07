import { Component, OnInit, OnDestroy, signal, computed, inject, HostBinding } from '@angular/core';
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
import { CcCardNavigationComponent } from '../../shared/components/cc-card-navigation/cc-card-navigation.component';

@Component({
  selector: 'app-v2-campaign-shell',
  standalone: true,
  imports: [CommonModule, V2CampaignPlaceholderComponent, CcCardNavigationComponent],
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
  
  // Role detection - computed based on campaign data and auth service
  isDm = computed(() => {
    const camp = this.campaign();
    if (!camp) return false;
    return camp.dmUserId === this.auth.currentUser()?.id;
  });
  
  private hubSubscriptions: Subscription[] = [];
  
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
}