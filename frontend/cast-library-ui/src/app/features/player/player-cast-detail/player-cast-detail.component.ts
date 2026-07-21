import { Component, OnInit, OnDestroy, signal, computed, inject, ViewChild, ElementRef, effect, untracked } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { CampaignCastPlayerNotes } from '../../../shared/models/campaign.model';
import { CampaignCastInstance } from '../../../shared/models/cast.model';
import { CampaignSecret } from '../../../shared/models/secret.model';
import { PortalTransitionService } from '../../../core/portal-transition.service';
import { PlayerCastNotesComponent } from '../player-cast-notes/player-cast-notes.component';
import { CastCardComponent } from '../../../shared/components/cast-card/cast-card.component';
import { PlayerCampaignShellComponent } from '../player-campaign-shell/player-campaign-shell.component';
import { PlayerCampaignShellService } from '../../../core/player-campaign-shell.service';
import { CampaignHubService } from '../../../core/hub/campaign-hub.service';
import { catchError, EMPTY, Subscription } from 'rxjs';
import { FactionSymbolPickerComponent, FactionSymbolAssignment } from '../../../shared/components/faction-symbol-picker/faction-symbol-picker.component';
import { DetailPanelActionsComponent } from '../../../shared/components/detail-panel-actions/detail-panel-actions.component';

@Component({
  selector: 'app-player-cast-detail',
  standalone: true,
  imports: [CommonModule, PlayerCastNotesComponent, CastCardComponent, FactionSymbolPickerComponent, DetailPanelActionsComponent],
  templateUrl: './player-cast-detail.component.html',
  styleUrl: './player-cast-detail.component.scss'
})
export class PlayerCastDetailComponent implements OnInit, OnDestroy {
  private route      = inject(ActivatedRoute);
  private router     = inject(Router);
  private http       = inject(HttpClient);
  private transition = inject(PortalTransitionService);
  private shell       = inject(PlayerCampaignShellComponent);
  private shellService = inject(PlayerCampaignShellService);
  private hub          = inject(CampaignHubService);

  @ViewChild(PlayerCastNotesComponent) private notesComp?: PlayerCastNotesComponent;
  @ViewChild('detailContent') private detailContentRef!: ElementRef<HTMLElement>;
  @ViewChild('expandBtn')     private expandBtnRef!: ElementRef<HTMLElement>;

  detailExpanded = signal(false);
  panelHeight    = signal('220px');

  campaignId         = signal('');
  sublocationInstanceId = signal('');
  castInstanceId     = signal('');
  campaign           = () => this.shell.campaign();
  playerNotes        = signal<CampaignCastPlayerNotes | null>(null);
  playerRating       = computed(() => this.playerNotes()?.rating ?? 0);
  starAnimating      = signal(false);
  castOverride       = signal<CampaignCastInstance | null>(null);

  castFactionSymbols = signal<{ factionInstanceId: string; symbolPath: string }[]>([]);
  pendingFactionUpdate = signal(false);

  visibleFactions = computed(() =>
    (this.campaign()?.factions ?? []).filter(f => f.isVisibleToPlayers)
  );

  cast = computed<CampaignCastInstance | null>(() => {
    const c = this.campaign();
    const fromShell = c?.casts.find(ca => ca.instanceId === this.castInstanceId()) ?? null;
    return fromShell ?? this.castOverride();
  });

  castSecrets = computed<CampaignSecret[]>(() => {
    const c = this.campaign();
    if (!c) return [];
    return c.secrets.filter(s => s.castInstanceId === this.castInstanceId() && s.isRevealed);
  });

  parentSublocation = computed(() => {
    const c = this.campaign();
    if (!c) return null;
    return c.sublocations.find(l => l.instanceId === this.sublocationInstanceId()) ?? null;
  });

  parentLocation = computed(() => {
    const c = this.campaign();
    const parentSubLoc = this.parentSublocation();
    if (!c || !parentSubLoc) return null;
    return c.locations.find(l => l.instanceId === parentSubLoc.locationInstanceId) ?? null;
  });

  fromParty = false;
  private paramsSub?: Subscription;
  private hubSubscriptions: Subscription[] = [];

  constructor() {

    this.hubSubscriptions.push(
      this.hub.cardVisibilityChanged$.subscribe(event => {
        if (!event || event.cardType !== 'cast') return;
        const castId    = untracked(() => this.castInstanceId());
        const campaignId = untracked(() => this.campaignId());
        if (!castId || !campaignId) return;
        if (event.instanceId !== castId) return;

        if (event.isVisible) {
          this.http.get<CampaignCastInstance>(
            `${environment.apiUrl}/api/campaigns/${campaignId}/casts/${castId}`
          ).subscribe(ca => {
            this.castOverride.set(ca);
            if (!this.pendingFactionUpdate()) {
              this.castFactionSymbols.set(ca.factionSymbols ?? []);
            }
          });
        } else {
          this.transition.quickCover();
          this.router.navigate(['/player/campaign', campaignId]);
        }
      })
    );

    this.hubSubscriptions.push(
      this.hub.factionRemoved$.subscribe(event => {
        if (!event) return;
        const castId     = untracked(() => this.castInstanceId());
        const campaignId = untracked(() => this.campaignId());
        if (!castId || !campaignId || event.campaignId !== campaignId) return;

        this.http.get<CampaignCastInstance>(
          `${environment.apiUrl}/api/campaigns/${campaignId}/casts/${castId}`
        ).subscribe(ca => {
          this.castOverride.set(ca);
          if (!this.pendingFactionUpdate()) {
            this.castFactionSymbols.set(ca.factionSymbols ?? []);
          }
        });
      })
    );

    effect(() => {
      const ca = this.cast();
      if (!ca) return;

      const parentSubLoc = this.parentSublocation();
      const parentLoc = this.parentLocation();

      if (parentSubLoc?.isPartyAnchor) {
        this.shellService.setTitleContext({
          pageType:   'cast-party',
          campaignId: this.campaignId(),
          baseRoute:  '/player/campaign',
          location:   null,
          partyRoute: ['/player/campaign', this.campaignId(), 'the-party'],
        });
        return;
      }

      this.shellService.setTitleContext({
        pageType: 'cast',
        campaignId: this.campaignId(),
        campaignName: this.campaign()?.name,
        baseRoute: '/player/campaign',
        location: parentLoc,
        sublocation: parentSubLoc,
      });
    });

    this.hubSubscriptions.push(
      this.hub.castTravelled$.subscribe(event => {
        if (!event || event.castInstanceId !== untracked(() => this.castInstanceId())) return;
        this.sublocationInstanceId.set(event.toSublocationInstanceId);
      })
    );

    this.hubSubscriptions.push(
      this.hub.factionSymbolAssigned$.subscribe(event => {
        if (!event || event.campaignId !== untracked(() => this.campaignId())) {
          return;
        }
        if (event.entityType !== 'cast' || event.instanceId !== untracked(() => this.castInstanceId())) {
          return;
        }
        if (this.pendingFactionUpdate()) {
          return;
        }
        const castId = untracked(() => this.castInstanceId());
        const campaignId = untracked(() => this.campaignId());
        this.http.get<CampaignCastInstance>(
          `${environment.apiUrl}/api/campaigns/${campaignId}/casts/${castId}`
        ).subscribe(ca => {
          this.castOverride.set(ca);
          this.castFactionSymbols.set(ca.factionSymbols ?? []);
        });
      })
    );
  }

  ngOnInit() {
    this.transition.hide();
    this.paramsSub = this.route.paramMap.subscribe(params => {
      const id     = params.get('id')!;
      const locId  = params.get('sublocationInstanceId')!;
      const castId = params.get('castInstanceId')!;
      this.fromParty = this.route.snapshot.queryParamMap.get('from') === 'party';
      this.campaignId.set(id);
      this.sublocationInstanceId.set(locId);
      this.castInstanceId.set(castId);
      this.castOverride.set(null);
      this.playerNotes.set(null);
      this.castFactionSymbols.set([]);
      this.pendingFactionUpdate.set(true);

      this.http.get<CampaignCastPlayerNotes>(
        `${environment.apiUrl}/api/campaigns/${id}/cast-player-notes/${castId}`
      ).pipe(catchError(() => EMPTY)).subscribe(n => this.playerNotes.set(n));

      this.http.get<CampaignCastInstance>(
        `${environment.apiUrl}/api/campaigns/${id}/casts/${castId}`
      ).subscribe(ca => {
        console.log('[PlayerCastDetail] Cast loaded from API:', ca);
        console.log('[PlayerCastDetail] Faction symbols from API:', ca.factionSymbols);
        this.castOverride.set(ca);
        this.castFactionSymbols.set(ca.factionSymbols ?? []);
        console.log('[PlayerCastDetail] castFactionSymbols set to:', this.castFactionSymbols());
        setTimeout(() => this.pendingFactionUpdate.set(false), 500);
      });
    });
  }

  ngOnDestroy() {
    this.paramsSub?.unsubscribe();
    this.hubSubscriptions.forEach(sub => sub.unsubscribe());
  }

  goToSublocation() {
    this.transition.quickCover();
    this.router.navigate(['/player/campaign', this.campaignId(), 'sublocations', this.sublocationInstanceId()]);
  }

  goToLocation() {
    const locationId = this.parentSublocation()?.locationInstanceId;
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

  setRating(stars: number) {
    const newRating = this.playerRating() === stars ? 0 : stars;
    const notes = this.playerNotes();
    this.playerNotes.update(n => n ? { ...n, rating: newRating } : n);
    this.notesComp?.syncRating(newRating);
    this.starAnimating.set(true);
    setTimeout(() => this.starAnimating.set(false), 700);
    this.http.put<CampaignCastPlayerNotes>(
      `${environment.apiUrl}/api/campaigns/${this.campaignId()}/cast-player-notes/${this.castInstanceId()}`,
      {
        notes:       notes?.notes       ?? '',
        connections: notes?.connections ?? [],
        alignment:   notes?.alignment   ?? '',
        perception:  notes?.perception  ?? 0,
        rating:      newRating,
      }
    ).subscribe(updated => this.playerNotes.set(updated));
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

  initial(name: string) { return name.charAt(0).toUpperCase(); }

  onFactionAssigned(symbols: FactionSymbolAssignment[]): void {
    this.castFactionSymbols.set(
      symbols.map(s => ({ factionInstanceId: s.factionInstanceId, symbolPath: s.symbolPath }))
    );
    this.pendingFactionUpdate.set(true);
    setTimeout(() => this.pendingFactionUpdate.set(false), 2000);
  }

}
