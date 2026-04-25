import { Component, OnInit, signal, computed, inject, ViewChild, ElementRef } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { CampaignCastPlayerNotes } from '../../../shared/models/campaign.model';
import { CampaignSublocationInstance } from '../../../shared/models/sublocation.model';
import { CampaignCastInstance } from '../../../shared/models/cast.model';
import { CampaignSecret } from '../../../shared/models/secret.model';
import { PortalTransitionService } from '../../../core/portal-transition.service';
import { SublocationCardComponent } from '../../../shared/components/sublocation-card/sublocation-card.component';
import { CastCardComponent } from '../../../shared/components/cast-card/cast-card.component';
import { PlayerCampaignShellComponent } from '../player-campaign-shell/player-campaign-shell.component';
import { PlayerCampaignShellService } from '../../../core/player-campaign-shell.service';

@Component({
  selector: 'app-player-sublocation-detail',
  standalone: true,
  imports: [CommonModule, SublocationCardComponent, CastCardComponent],
  templateUrl: './player-sublocation-detail.component.html',
  styleUrl: './player-sublocation-detail.component.scss'
})
export class PlayerSublocationDetailComponent implements OnInit {
  private route      = inject(ActivatedRoute);
  private router     = inject(Router);
  private http       = inject(HttpClient);
  private transition = inject(PortalTransitionService);
  private shell      = inject(PlayerCampaignShellComponent);
  private shellService = inject(PlayerCampaignShellService);

  @ViewChild('detailContent') private detailContentRef!: ElementRef<HTMLElement>;
  @ViewChild('expandBtn')     private expandBtnRef!: ElementRef<HTMLElement>;

  campaignId         = signal('');
  sublocationInstanceId = signal('');
  campaign           = () => this.shell.campaign();
  detailExpanded     = signal(false);
  panelHeight        = signal('220px');
  castRatings        = signal<Map<string, number>>(new Map());

  sublocation = computed<CampaignSublocationInstance | null>(() => {
    const c = this.campaign();
    if (!c) return null;
    return c.sublocations.find(l => l.instanceId === this.sublocationInstanceId()) ?? null;
  });

  sublocationSecrets = computed<CampaignSecret[]>(() => {
    const c = this.campaign();
    if (!c) return [];
    return c.secrets.filter(s => s.sublocationInstanceId === this.sublocationInstanceId());
  });

  sublocationCasts = computed<CampaignCastInstance[]>(() => {
    const c   = this.campaign();
    const subLoc = this.sublocation();
    if (!c || !subLoc) return [];
    return c.casts.filter(cast => cast.sublocationInstanceId === subLoc.instanceId);
  });

  parentLocation = computed(() => {
    const c   = this.campaign();
    const subLoc = this.sublocation();
    if (!c || !subLoc) return null;
    return c.locations.find(ci => ci.instanceId === subLoc.locationInstanceId) ?? null;
  });

  constructor() {}

  ngOnInit() {
    this.transition.hide();
    const id    = this.route.snapshot.paramMap.get('id')!;
    const locId = this.route.snapshot.paramMap.get('sublocationInstanceId')!;
    this.campaignId.set(id);
    this.sublocationInstanceId.set(locId);

    const subLoc = this.sublocation();
    const parentLoc = this.parentLocation();
    if (subLoc && parentLoc) {
      this.shellService.setCrumbs([
        { label: '← Locations', action: () => this.goToCampaign() },
        { label: '← Sublocations', action: () => this.goToLocation() }
      ]);
      this.shellService.setTitle(subLoc.name);

      const c = this.campaign();
      if (c) {
        const castIds = c.casts
          .filter(ca => ca.sublocationInstanceId === subLoc.instanceId)
          .map(ca => ca.instanceId);
        if (castIds.length) {
          const params = castIds.map(cid => `castInstanceId=${cid}`).join('&');
          this.http.get<CampaignCastPlayerNotes[]>(
            `${environment.apiUrl}/api/campaigns/${id}/cast-player-notes/by-cast-instances?${params}`
          ).subscribe(notes => {
            const map = new Map<string, number>();
            notes.forEach(n => map.set(n.castInstanceId, n.rating));
            this.castRatings.set(map);
          });
        }
      }
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

  goToCast(cast: CampaignCastInstance) {
    this.transition.quickCover();
    this.router.navigate([
      '/player/campaign', this.campaignId(),
      'sublocations', this.sublocationInstanceId(),
      'cast', cast.instanceId
    ]);
  }

  goToLocation() {
    const locationId = this.sublocation()?.locationInstanceId;
    if (locationId) {
      this.transition.quickCover();
      this.router.navigate(['/player/campaign', this.campaignId(), 'locations', locationId]);
    }
  }

  goToMyCharacter() {
    this.transition.quickCover();
    this.router.navigate(['/player/campaign', this.campaignId(), 'my-character']);
  }

  goToCampaign() {
    this.transition.quickCover();
    this.router.navigate(['/player/campaign', this.campaignId()]);
  }

  castRating(instanceId: string): number {
    return this.castRatings().get(instanceId) ?? 0;
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
