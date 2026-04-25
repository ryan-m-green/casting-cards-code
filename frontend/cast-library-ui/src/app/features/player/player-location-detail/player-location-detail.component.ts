import { Component, OnInit, signal, computed, inject, effect, ViewChild, ElementRef } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { CampaignDetail } from '../../../shared/models/campaign.model';
import { CampaignLocationInstance } from '../../../shared/models/location.model';
import { CampaignSublocationInstance } from '../../../shared/models/sublocation.model';
import { CampaignSecret } from '../../../shared/models/secret.model';
import { CampaignHubService } from '../../../core/hub/campaign-hub.service';
import { PortalTransitionService } from '../../../core/portal-transition.service';
import { PlayerCampaignShellComponent } from '../player-campaign-shell/player-campaign-shell.component';
import { PlayerCampaignShellService } from '../../../core/player-campaign-shell.service';
import { PlayerLocationPoliticalNotesComponent } from '../player-location-political-notes/player-location-political-notes.component';
import { LocationCardComponent } from '../../../shared/components/location-card/location-card.component';
import { SublocationCardComponent } from '../../../shared/components/sublocation-card/sublocation-card.component';

@Component({
  selector: 'app-player-location-detail',
  standalone: true,
  imports: [CommonModule, PlayerLocationPoliticalNotesComponent, LocationCardComponent, SublocationCardComponent],
  templateUrl: './player-location-detail.component.html',
  styleUrl: './player-location-detail.component.scss'
})
export class PlayerLocationDetailComponent implements OnInit {
  private route      = inject(ActivatedRoute);
  private router     = inject(Router);
  private http       = inject(HttpClient);
  private hub        = inject(CampaignHubService);
  private transition = inject(PortalTransitionService);
  private shell      = inject(PlayerCampaignShellComponent);
  private shellSvc   = inject(PlayerCampaignShellService);

  @ViewChild('detailContent')   private detailContentRef!: ElementRef<HTMLElement>;
  @ViewChild('expandBtn')       private expandBtnRef!: ElementRef<HTMLElement>;
  @ViewChild('politicalNotes')  private politicalNotesRef!: ElementRef<HTMLElement>;

  campaignId     = signal('');
  locationInstanceId = signal('');
  detailExpanded = signal(false);
  panelHeight    = signal('220px');

  campaign = () => this.shell.campaign();
  portalColor = computed(() => this.campaign()?.spineColor ?? '#9ab0b8');

  location = computed<CampaignLocationInstance | null>(() => {
    const c = this.campaign();
    if (!c) return null;
    return c.locations.find(ci => ci.instanceId === this.locationInstanceId()) ?? null;
  });

  locationSecrets = computed<CampaignSecret[]>(() => {
    const c = this.campaign();
    if (!c) return [];
    return c.secrets.filter(s => s.locationInstanceId === this.locationInstanceId());
  });

  locationSublocations = computed<CampaignSublocationInstance[]>(() => {
    const c = this.campaign();
    if (!c) return [];
    return (c.sublocations ?? []).filter((l: CampaignSublocationInstance) => l.locationInstanceId === this.locationInstanceId());
  });

  locationCasts = computed(() => {
    const c = this.campaign();
    if (!c) return [];
    return c.casts.filter(cast => cast.locationInstanceId === this.locationInstanceId());
  });

  constructor() {
    // Shell handles secret reveal events and campaign updates
  }

  ngOnInit() {
    this.transition.hide();
    const id         = this.route.snapshot.paramMap.get('id')!;
    const locationInstId = this.route.snapshot.paramMap.get('locationInstanceId')!;
    this.campaignId.set(id);
    this.locationInstanceId.set(locationInstId);

    const loc = this.location();
    if (loc) {
      this.shellSvc.setTitle(loc.name);
      this.shellSvc.setCrumbs([{ label: '← Locations', action: () => this.goToCampaign() }]);
    }
  }

  toggleDetail() {
    const panel = this.detailContentRef.nativeElement.parentElement as HTMLElement;
    if (this.detailExpanded()) {
      this.panelHeight.set('220px');
      panel.style.marginLeft = '';
      panel.style.width = '';
      this.detailExpanded.set(false);
    } else {
      const contentH = this.detailContentRef.nativeElement.scrollHeight;
      const btnH     = this.expandBtnRef.nativeElement.offsetHeight;
      this.panelHeight.set(`${contentH + btnH}px`);
      if (window.innerWidth < 768) {
        const left = panel.getBoundingClientRect().left;
        panel.style.marginLeft = `${-(left - 20)}px`;
        panel.style.width      = `${window.innerWidth - 40}px`;
      }
      this.detailExpanded.set(true);
    }
  }

  goToSublocation(subLoc: CampaignSublocationInstance) {
    this.transition.quickCover();
    this.router.navigate(['/player/campaign', this.campaignId(), 'sublocations', subLoc.instanceId]);
  }

  goToCampaign() {
    this.transition.quickCover();
    this.router.navigate(['/player/campaign', this.campaignId()]);
  }

  scrollToNotes() {
    const el = this.politicalNotesRef?.nativeElement;
    if (!el) return;
    const targetScroll = window.scrollY + el.getBoundingClientRect().top - 20;
    window.scrollTo({ top: targetScroll, behavior: 'smooth' });
  }

  private tiltMap = new Map<string, number>();

  tiltFor(instanceId: string): number {
    if (!this.tiltMap.has(instanceId)) {
      this.tiltMap.set(instanceId, parseFloat((Math.random() * 4 - 2).toFixed(2)));
    }
    return this.tiltMap.get(instanceId)!;
  }

  initial(name: string) { return name.charAt(0).toUpperCase(); }
}
