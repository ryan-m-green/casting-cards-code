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
import { PlayerLocationPoliticalNotesComponent } from '../player-location-political-notes/player-location-political-notes.component'; // updated
import { TimeOfDayBarComponent } from '../../../shared/components/time-of-day-bar/time-of-day-bar.component';

@Component({
  selector: 'app-player-location-detail',
  standalone: true,
  imports: [CommonModule, PlayerLocationPoliticalNotesComponent, TimeOfDayBarComponent],
  templateUrl: './player-location-detail.component.html',
  styleUrl: './player-location-detail.component.scss'
})
export class PlayerLocationDetailComponent implements OnInit {
  private route      = inject(ActivatedRoute);
  private router     = inject(Router);
  private http       = inject(HttpClient);
  private hub        = inject(CampaignHubService);
  private transition = inject(PortalTransitionService);

  @ViewChild('detailContent')   private detailContentRef!: ElementRef<HTMLElement>;
  @ViewChild('expandBtn')       private expandBtnRef!: ElementRef<HTMLElement>;
  @ViewChild('politicalNotes')  private politicalNotesRef!: ElementRef<HTMLElement>;

  campaignId     = signal('');
  locationInstanceId = signal('');
  campaign       = signal<CampaignDetail | null>(null);
  detailExpanded = signal(false);
  panelHeight    = signal('220px');

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

  timeOfDay = computed(() => this.campaign()?.timeOfDay ?? null);

  locationCasts = computed(() => {
    const c = this.campaign();
    if (!c) return [];
    return c.casts.filter(cast => cast.locationInstanceId === this.locationInstanceId());
  });

  constructor() {
    effect(() => {
      const event = this.hub.secretRevealed();
      if (!event || event.campaignId !== this.campaignId()) return;
      this.campaign.update(c => {
        if (!c) return c;
        const exists = c.secrets.some(s => s.id === event.secretId);
        if (exists) {
          return { ...c, secrets: c.secrets.map(s => s.id === event.secretId ? { ...s, isRevealed: true } : s) };
        }
         const newSecret: CampaignSecret = {
          id: event.secretId,
          campaignId: event.campaignId,
          castInstanceId: event.castInstanceId,
          locationInstanceId: event.locationInstanceId,
          sublocationInstanceId: event.sublocationInstanceId,
          content: event.secretContent,
          sortOrder: 0,
          isRevealed: true,
          revealedAt: new Date().toISOString(),
        };
        return { ...c, secrets: [...c.secrets, newSecret] };
      });
    });

    effect(() => {
      const event = this.hub.secretResealed();
      if (!event || event.campaignId !== this.campaignId()) return;
      this.campaign.update(c => {
        if (!c) return c;
        return { ...c, secrets: c.secrets.map(s => s.id === event.secretId ? { ...s, isRevealed: false } : s) };
      });
    });

    effect(() => {
      const event = this.hub.cardVisibilityChanged();
      if (!event || event.campaignId !== this.campaignId()) return;
      if (event.isVisible) {
        this.http.get<CampaignDetail>(`${environment.apiUrl}/api/campaigns/${this.campaignId()}/player`)
          .subscribe(c => { this.campaign.set(c); this.transition.spineColor = c.spineColor; });
      } else {
        this.campaign.update(c => {
          if (!c) return c;
          return {
            ...c,
            locations:    c.locations.filter((x: any) => x.instanceId !== event.instanceId),
            sublocations: c.sublocations.filter((x: any) => x.instanceId !== event.instanceId),
            casts:     c.casts.filter((x: any) => x.instanceId !== event.instanceId),
          };
        });
      }
    });

    effect(() => {
      const event = this.hub.bulkCardVisibilityChanged();
      if (!event || event.campaignId !== this.campaignId()) return;
      this.http.get<CampaignDetail>(`${environment.apiUrl}/api/campaigns/${this.campaignId()}/player`)
        .subscribe(c => { this.campaign.set(c); this.transition.spineColor = c.spineColor; });
    });
  }

  ngOnInit() {
    this.transition.hide();
    const id         = this.route.snapshot.paramMap.get('id')!;
    const locationInstId = this.route.snapshot.paramMap.get('locationInstanceId')!;
    this.campaignId.set(id);
    this.locationInstanceId.set(locationInstId);
    this.http.get<CampaignDetail>(`${environment.apiUrl}/api/campaigns/${id}/player`)
      .subscribe(c => {
        this.campaign.set(c);
        this.transition.spineColor = c.spineColor;
      });
  }

  toggleDetail() {
    if (this.detailExpanded()) {
      this.panelHeight.set('220px');
      this.detailExpanded.set(false);
    } else {
      const contentH = this.detailContentRef.nativeElement.scrollHeight;
      const btnH     = this.expandBtnRef.nativeElement.offsetHeight;
      this.panelHeight.set(`${contentH + btnH}px`);
      this.detailExpanded.set(true);
    }
  }

  goToSublocation(subLoc: CampaignSublocationInstance) {
    this.transition.quickCover();
    this.router.navigate(['/player/campaign', this.campaignId(), 'sublocations', subLoc.instanceId]);
  }

  goToMyCharacter() {
    this.transition.quickCover();
    this.router.navigate(['/player/campaign', this.campaignId(), 'my-character']);
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

  initial(name: string) { return name.charAt(0).toUpperCase(); }
}
