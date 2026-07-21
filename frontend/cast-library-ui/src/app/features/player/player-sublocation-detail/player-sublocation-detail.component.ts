import { Component, OnInit, OnDestroy, signal, computed, inject, ViewChild, ElementRef, effect, untracked } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { CampaignCastPlayerNotes, CampaignDetail } from '../../../shared/models/campaign.model';
import { CampaignSublocationInstance, ShopItem } from '../../../shared/models/sublocation.model';
import { CampaignCastInstance } from '../../../shared/models/cast.model';
import { CampaignSecret } from '../../../shared/models/secret.model';
import { Subscription } from 'rxjs';
import { PortalTransitionService } from '../../../core/portal-transition.service';

interface PurchaseResult {
  success: boolean;
  itemName: string;
  priceAmount: number;
  priceCurrencyType: string;
  playerDisplayName: string;
  denialReason: string;
}
import { SublocationCardComponent } from '../../../shared/components/sublocation-card/sublocation-card.component';
import { CastCardComponent } from '../../../shared/components/cast-card/cast-card.component';
import { PlayerCampaignShellComponent } from '../player-campaign-shell/player-campaign-shell.component';
import { PlayerCampaignShellService } from '../../../core/player-campaign-shell.service';
import { CampaignHubService } from '../../../core/hub/campaign-hub.service';
import { PlayerSublocationNotesComponent } from '../player-sublocation-notes/player-sublocation-notes.component';
import { FactionSymbolPickerComponent, FactionSymbolAssignment } from '../../../shared/components/faction-symbol-picker/faction-symbol-picker.component';
import { DetailPanelActionsComponent } from '../../../shared/components/detail-panel-actions/detail-panel-actions.component';
import { CardGridLayoutComponent } from '../../../shared/components/card-grid-layout/card-grid-layout.component';

@Component({
  selector: 'app-player-sublocation-detail',
  standalone: true,
  imports: [CommonModule, SublocationCardComponent, CastCardComponent, PlayerSublocationNotesComponent, FactionSymbolPickerComponent, DetailPanelActionsComponent, CardGridLayoutComponent],
  templateUrl: './player-sublocation-detail.component.html',
  styleUrl: './player-sublocation-detail.component.scss'
})
export class PlayerSublocationDetailComponent implements OnInit, OnDestroy {
  private route      = inject(ActivatedRoute);
  private router     = inject(Router);
  private http       = inject(HttpClient);
  private transition = inject(PortalTransitionService);
  private shell      = inject(PlayerCampaignShellComponent);
  private shellService = inject(PlayerCampaignShellService);
  private hub        = inject(CampaignHubService);

  @ViewChild('detailContent') private detailContentRef!: ElementRef<HTMLElement>;
  @ViewChild('expandBtn')     private expandBtnRef!: ElementRef<HTMLElement>;

  campaignId            = signal('');
  sublocationInstanceId = signal('');
  campaign              = () => this.shell.campaign();
  private paramsSub?: Subscription;
  private hubSubscriptions: Subscription[] = [];
  detailExpanded        = signal(false);
  panelHeight           = signal('220px');
  castRatings           = signal<Map<string, number>>(new Map());

  purchasingItemId     = signal<string | null>(null);
  purchaseResult       = signal<PurchaseResult | null>(null);
  purchasePopupVisible = signal(false);

  sublocationSymbolPath = signal<string | null>(null);
  sublocationFactionId  = signal<string | null>(null);

  visibleFactions = computed(() =>
    (this.campaign()?.factions ?? []).filter(f => f.isVisibleToPlayers)
  );

  private fadingOutIds = signal<Set<string>>(new Set());
  private localCasts   = signal<CampaignCastInstance[] | null>(null);

  sublocation = computed<CampaignSublocationInstance | null>(() => {
    const c = this.campaign();
    if (!c) return null;
    return c.sublocations.find(l => l.instanceId === this.sublocationInstanceId()) ?? null;
  });

  sublocationSecrets = computed<CampaignSecret[]>(() => {
    const c = this.campaign();
    if (!c) return [];
    return c.secrets.filter(s => 
      s.sublocationInstanceId === this.sublocationInstanceId() && s.isRevealed
    );
  });

  private baseCasts = computed<CampaignCastInstance[]>(() => {
    const override = this.localCasts();
    if (override !== null) return override;
    const c      = this.campaign();
    const subLoc = this.sublocation();
    if (!c || !subLoc) return [];
    return c.casts.filter(cast => cast.sublocationInstanceId === subLoc.instanceId);
  });

  sublocationCasts = computed<CampaignCastInstance[]>(() =>
    this.baseCasts().filter(cast => !this.fadingOutIds().has(cast.instanceId))
  );

  fadingOut = computed<CampaignCastInstance[]>(() =>
    this.baseCasts().filter(cast => this.fadingOutIds().has(cast.instanceId))
  );

  parentLocation = computed(() => {
    const c      = this.campaign();
    const subLoc = this.sublocation();
    if (!c || !subLoc) return null;
    return c.locations.find(ci => ci.instanceId === subLoc.locationInstanceId) ?? null;
  });

  constructor() {
    effect(() => {
      const subLoc    = this.sublocation();
      const parentLoc = this.parentLocation();
      if (!subLoc) return;
      this.sublocationSymbolPath.set(subLoc.symbolPath ?? null);
      this.sublocationFactionId.set(subLoc.factionInstanceId ?? null);
      const id = this.campaignId();
      this.shellService.setTitleContext({
        pageType: 'sublocation',
        campaignId: id,
        campaignName: this.campaign()?.name,
        baseRoute: '/player/campaign',
        location: parentLoc,
      });
    });

    this.hubSubscriptions.push(
      this.hub.castTravelled$.subscribe(event => {
        if (!event) return;
        const currentSub = this.sublocationInstanceId();
        if (!currentSub) return;

        const isLeaving  = event.fromSublocationInstanceId === currentSub;
        const isArriving = event.toSublocationInstanceId   === currentSub;

        if (isLeaving) {
          this.fadingOutIds.update(s => new Set([...s, event.castInstanceId]));
          setTimeout(() => {
            // Initialise local override from base if not yet set
            if (this.localCasts() === null) {
              this.localCasts.set([...this.baseCasts()]);
            }
            this.localCasts.update(list => (list ?? []).filter(c => c.instanceId !== event.castInstanceId));
            this.fadingOutIds.update(s => { const n = new Set(s); n.delete(event.castInstanceId); return n; });
          }, 500);
        }

        if (isArriving) {
          this.http.get<CampaignCastInstance>(
            `${environment.apiUrl}/api/campaigns/${event.campaignId}/casts/${event.castInstanceId}`
          ).subscribe(cast => {
            if (this.localCasts() === null) {
              this.localCasts.set([...this.baseCasts()]);
            }
          this.localCasts.update(list => {
            const existing = (list ?? []).find(c => c.instanceId === cast.instanceId);
            return existing ? (list ?? []) : [...(list ?? []), cast];
          });
        });
      }
      })
    );

    this.hubSubscriptions.push(
      this.hub.cardVisibilityChanged$.subscribe(event => {
        if (!event || event.cardType !== 'sublocation') return;
        const sublocId   = untracked(() => this.sublocationInstanceId());
        const campaignId = untracked(() => this.campaignId());
        if (!sublocId || !campaignId || event.instanceId !== sublocId) return;
        if (!event.isVisible) {
          this.transition.quickCover();
          this.router.navigate(['/player/campaign', campaignId]);
        }
      })
    );

    this.hubSubscriptions.push(
      this.hub.factionSymbolAssigned$.subscribe(event => {
        if (!event || event.campaignId !== untracked(() => this.campaignId())) {
          return;
        }
        if (event.entityType !== 'sublocation' || event.instanceId !== untracked(() => this.sublocationInstanceId())) {
          return;
        }
        const sublocId = untracked(() => this.sublocationInstanceId());
        const campaignId = untracked(() => this.campaignId());
        this.http.get<CampaignDetail>(
          `${environment.apiUrl}/api/campaigns/${campaignId}/player`
        ).subscribe(c => {
          this.shellService.setCampaign(c);
        });
      })
    );
  }

  ngOnInit() {
    this.transition.hide();
    this.paramsSub = this.route.paramMap.subscribe(params => {
      const id    = params.get('id')!;
      const locId = params.get('sublocationInstanceId')!;
      this.campaignId.set(id);
      this.sublocationInstanceId.set(locId);
      this.castRatings.set(new Map());
      this.localCasts.set(null);
      this.fadingOutIds.set(new Set());

      const subLoc = this.sublocation();
      if (subLoc) {
        const c = this.campaign();
        if (c) {
          const castIds = c.casts
            .filter(ca => ca.sublocationInstanceId === subLoc.instanceId)
            .map(ca => ca.instanceId);
          if (castIds.length) {
            const queryParams = castIds.map(cid => `castInstanceId=${cid}`).join('&');
            this.http.get<CampaignCastPlayerNotes[]>(
              `${environment.apiUrl}/api/campaigns/${id}/cast-player-notes/by-cast-instances?${queryParams}`
            ).subscribe(notes => {
              const map = new Map<string, number>();
              notes.forEach(n => map.set(n.castInstanceId, n.rating));
              this.castRatings.set(map);
            });
          }
        }
      }
    });
  }

  ngOnDestroy() {
    this.paramsSub?.unsubscribe();
    this.hubSubscriptions.forEach(sub => sub.unsubscribe());
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

  onCardClick(instanceId: string) {
    const cast = this.sublocationCasts().find(c => c.instanceId === instanceId);
    if (cast) {
      this.goToCast(cast);
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
    this.router.navigate(['/player/campaign', this.campaignId(), 'the-party']);
  }

  goToCampaign() {
    this.transition.quickCover();
    this.router.navigate(['/player/campaign', this.campaignId()]);
  }

  buyItem(item: ShopItem) {
    if (this.purchasingItemId()) return;
    this.purchasingItemId.set(item.id);
    this.http.post<PurchaseResult>(
      `${environment.apiUrl}/api/campaigns/${this.campaignId()}/sublocations/${this.sublocationInstanceId()}/shop-items/${item.id}/purchase`,
      {}
    ).subscribe({
      next: result => {
        this.purchaseResult.set(result);
        this.purchasePopupVisible.set(true);
        this.purchasingItemId.set(null);
        if (result.success) {
          this.shell.refreshPurse();
        }
      },
      error: () => this.purchasingItemId.set(null),
    });
  }

  closeReceipt() {
    this.purchasePopupVisible.set(false);
    this.purchaseResult.set(null);
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

  onFactionAssigned(symbols: FactionSymbolAssignment[]): void {
    const factionInstanceId = symbols.length ? symbols[0].factionInstanceId : null;
    const symbolPath        = symbols.length ? symbols[0].symbolPath        : null;

    this.sublocationSymbolPath.set(symbolPath);
    this.sublocationFactionId.set(factionInstanceId);

    const instanceId = this.sublocationInstanceId();
    this.shell.campaign.update(c => c ? {
      ...c,
      sublocations: c.sublocations.map(sl =>
        sl.instanceId === instanceId
          ? { ...sl, factionInstanceId: factionInstanceId ?? undefined, symbolPath: symbolPath ?? undefined }
          : sl
      )
    } : c);
  }
}
