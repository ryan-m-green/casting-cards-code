import { Component, ChangeDetectionStrategy, inject, signal, computed, OnInit, ElementRef, ViewChild, Input, OnDestroy, effect, untracked } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { environment } from '../../../../../../environments/environment';
import { CcFactionCardComponent } from '../../carddeck/cc-faction-card/cc-faction-card.component';
import { CcSimpleFactionCardComponent } from '../../carddeck/cc-simple-faction-card/cc-simple-faction-card.component';
import { CcCastCardComponent } from '../../carddeck/cc-cast-card/cc-cast-card.component';
import { CcSimpleCastCardComponent } from '../../carddeck/cc-simple-cast-card/cc-simple-cast-card.component';
import { CcCardFadeDirective, cardFadeWindowMs } from '../../../../directives/cc-card-fade.directive';
import { CcCardSpotlightComponent } from '../../Shared/cc-card-spotlight/cc-card-spotlight.component';
import { CampaignFactionInstance } from '../../../../models/faction.model';
import { CampaignCastInstance } from '../../../../models/cast.model';
import { CardVisibilityChangedEvent } from '../../../../models/secret.model';
import { setCardsVisibility } from '../../../../models/campaign-card-state';
import { CampaignHubService, FactionPartyCastChangedEvent } from '../../../../../core/hub/campaign-hub.service';
import { CampaignShellService } from '../../../../../core/campaign-shell.service';
import { CampaignGridLoadService } from '../../../../../core/campaign-grid-load.service';
import { publishGridAreaMark } from '../../../../../core/grid-area-mark.service';
import { GridAreaChangeService } from '../../../../../core/grid-area-change.service';
import { CardSpotlightService } from '../../../../../core/card-spotlight.service';
import Swiper from 'swiper';
import { FreeMode, Mousewheel } from 'swiper/modules';

@Component({
  selector: 'app-cc-card-faction-navigation',
  standalone: true,
  imports: [CommonModule, CcFactionCardComponent, CcSimpleFactionCardComponent, CcCastCardComponent, CcSimpleCastCardComponent, CcCardFadeDirective, CcCardSpotlightComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './cc-card-faction-navigation.component.html',
  styleUrl: './cc-card-faction-navigation.component.scss'
})
export class CcCardFactionNavigationComponent implements OnInit, OnDestroy {
  private http = inject(HttpClient);
  private hub = inject(CampaignHubService);
  private shellSvc = inject(CampaignShellService);
  private gridLoad = inject(CampaignGridLoadService);
  private areaChange = inject(GridAreaChangeService);
  private spotlight = inject(CardSpotlightService);
  private hubSubscriptions: Subscription[] = [];

  readonly isDm = this.shellSvc.isDm;

  /**
   * Whether this viewer is a player at this table — read from the campaign, not the global role, so
   * a DM sitting at another's table as a player still gets the light a reveal throws (see the
   * shell's `isPlayer` and GridAreaChangeService).
   */
  readonly isPlayer = this.shellSvc.isPlayer;

  private readonly mark = publishGridAreaMark('middle-left', 'content', {
    title: () => ['Factions'],
    icon: { path: '/factions.svg', width: 38, height: 38 },
  });

  readonly viewParty = signal(false);

  readonly isGmRow = computed(() => this.isDm() && !this.viewParty());

  @ViewChild('middleRow') middleRow!: ElementRef<HTMLElement>;

  private swiper: Swiper | null = null;

  @Input() campaignId: string = '';

  internalCampaignId = signal<string>('');

  private readonly loadOnRole = effect(() => {
    const id = this.internalCampaignId();
    this.isDm();
    if (!id) return;
    untracked(() => this.loadCardData());
  });

  loading = signal<boolean>(false);
  error = signal<string | null>(null);

  factions = signal<CampaignFactionInstance[]>([]);
  casts = signal<CampaignCastInstance[]>([]);

  currentView = signal<'factions' | 'casts'>('factions');
  parentFaction = signal<CampaignFactionInstance | null>(null);

  topRowFactions = signal<CampaignFactionInstance[]>([]);
  middleRowFactions = signal<CampaignFactionInstance[]>([]);
  middleRowCasts = signal<CampaignCastInstance[]>([]);

  deletingFactionId = signal<string | null>(null);
  deletingCastId = signal<string | null>(null);
  deleteError = signal<string>('');

  transitioning = signal<boolean>(false);

  private transitionTimer: ReturnType<typeof setTimeout> | null = null;

  private factionTilts = new Map<string, number>();

  private castTilts = new Map<string, number>();

  ngOnInit() {
    this.internalCampaignId.set(this.campaignId);

    this.setupHubSubscriptions();
  }

  ngOnDestroy() {
    if (this.transitionTimer !== null) {
      clearTimeout(this.transitionTimer);
      this.transitionTimer = null;
    }

    if (this.swiper) {
      this.swiper.destroy(true, true);
      this.swiper = null;
    }

    this.hubSubscriptions.forEach(sub => sub.unsubscribe());
  }

  private setupHubSubscriptions() {
    this.hubSubscriptions.push(
      this.hub.on('FactionInstanceUpdated', 'cc-card-faction-navigation', event => {
        if (!event || event.campaignId !== this.internalCampaignId()) return;
        this.refreshFactions();
      })
    );

    this.hubSubscriptions.push(
      this.shellSvc.factionsChanged.subscribe(campaignId => {
        if (!campaignId || campaignId !== this.internalCampaignId()) return;
        this.refreshFactions();
      })
    );

    this.hubSubscriptions.push(
      this.hub.on('FactionPartyCastChanged', 'cc-card-faction-navigation', event => {
        if (!event || event.campaignId !== this.internalCampaignId()) return;
        this.applyPartyCastChanged(event);
      })
    );

    this.hubSubscriptions.push(
      this.hub.on('FactionRemoved', 'cc-card-faction-navigation', event => {
        if (!event || event.campaignId !== this.internalCampaignId()) return;
        this.refreshFactions();
      })
    );

    this.hubSubscriptions.push(
      this.hub.on('NoteUpdated', 'cc-card-faction-navigation', event => {
        if (!event || event.entityType !== 'faction') return;
        if (event.campaignId !== this.internalCampaignId()) return;
        this.refreshFactions();
      })
    );

    this.hubSubscriptions.push(
      this.hub.on('CardVisibilityChanged', 'cc-card-faction-navigation', event => {
        if (!event || event.campaignId !== this.internalCampaignId()) return;
        this.writeCardVisibility(event);
      })
    );

    this.hubSubscriptions.push(
      this.hub.on('CastInstanceUpdated', 'cc-card-faction-navigation', event => {
        if (!event || event.campaignId !== this.internalCampaignId()) return;

        if (event.cast) {
          this.writeCastUpdate(event.cast);
          return;
        }

        this.http.get<CampaignCastInstance>(
          `${environment.apiUrl}/api/campaign/${event.campaignId}/castinstances/${event.castInstanceId}`
        ).subscribe({
          next: updatedCast => this.writeCastUpdate(updatedCast),
          error: () => this.refreshCasts(),
        });
      })
    );

    this.hubSubscriptions.push(
      this.hub.on('CampaignNavChanged', 'cc-card-faction-navigation', event => {
        if (!event || event.campaignId !== this.internalCampaignId()) return;
        this.refreshCasts();
      })
    );
  }

  private refreshCasts() {
    this.http.get<CampaignCastInstance[]>(
      `${environment.apiUrl}/api/campaign/${this.internalCampaignId()}/castinstances`
    ).subscribe(castsData => {
      const casts = this.offeredCasts(castsData ?? []);
      const byId = new Map(casts.map(c => [c.instanceId, c]));

      const sync = (list: CampaignCastInstance[]) =>
        list.flatMap(c => {
          const current = byId.get(c.instanceId);
          return current ? [current] : [];
        });

      this.casts.set(casts);
      this.middleRowCasts.update(list => this.offeredCasts(sync(list)));
    });
  }

  private offeredCasts(casts: CampaignCastInstance[]): CampaignCastInstance[] {
    if (this.isDm()) return casts;

    const offered = casts.filter(cast => cast.isVisibleToPlayers);
    return offered.length === casts.length ? casts : offered;
  }

  private writeCastUpdate(updated: CampaignCastInstance) {
    const write = (list: CampaignCastInstance[]) =>
      this.offeredCasts(list.map(c => c.instanceId === updated.instanceId ? updated : c));

    this.casts.update(write);
    this.middleRowCasts.update(write);
  }

  private writeCardVisibility(event: CardVisibilityChangedEvent) {
    const { instanceId, isVisible } = event;

    if (event.cardType === 'cast') {
      const write = (list: CampaignCastInstance[]) =>
        this.offeredCasts(setCardsVisibility(list, c => c.instanceId === instanceId, isVisible));

      this.casts.update(write);
      this.middleRowCasts.update(write);
      return;
    }

    if (event.cardType !== 'faction') return;

    if (!this.isGmRow()) {
      if (isVisible) {
        this.refreshFactions();
        if (this.isPlayer()) {
          this.areaChange.notify('middle-left');
          this.spotlight.reveal(instanceId);
        }
        return;
      }

      const drop = (list: CampaignFactionInstance[]) =>
        list.filter(f => f.factionInstanceId !== instanceId);

      this.factions.update(drop);
      this.middleRowFactions.update(drop);
      this.topRowFactions.update(drop);

      if (this.parentFaction()?.factionInstanceId === instanceId) this.navigateToFactions();
      return;
    }

    const write = (list: CampaignFactionInstance[]) =>
      setCardsVisibility(list, f => f.factionInstanceId === instanceId, isVisible);

    this.factions.update(write);
    this.middleRowFactions.update(write);
    this.topRowFactions.update(write);
    this.parentFaction.update(f =>
      f && f.factionInstanceId === instanceId ? { ...f, isVisibleToPlayers: isVisible } : f);
  }

  private refreshFactions() {
    this.http.get<CampaignFactionInstance[]>(this.factionsUrl()).subscribe(factions => {
      const byId = new Map(factions.map(f => [f.factionInstanceId, f]));

      const sync = (list: CampaignFactionInstance[]) =>
        list.flatMap(f => {
          const current = byId.get(f.factionInstanceId);
          return current ? [current] : [];
        });

      const syncRow = (list: CampaignFactionInstance[]) => {
        const kept = sync(list);
        const known = new Set(kept.map(f => f.factionInstanceId));
        return [...kept, ...factions.filter(f => !known.has(f.factionInstanceId))];
      };

      this.factions.set(factions);
      this.middleRowFactions.update(syncRow);
      this.topRowFactions.update(sync);
      this.parentFaction.update(p =>
        p ? (byId.get(p.factionInstanceId) ?? p) : p);

      this.settleCastsRow();
    });
  }

  private settleCastsRow() {
    if (this.currentView() !== 'casts') return;

    const parent = this.parentFaction();
    if (!parent) return;

    const members = this.getCastsForFaction(parent);
    const memberById = new Map(members.map(c => [c.instanceId, c]));

    const current = this.middleRowCasts();
    const kept = current.flatMap(c => {
      const member = memberById.get(c.instanceId);
      return member ? [member] : [];
    });
    const known = new Set(kept.map(c => c.instanceId));
    const next = [...kept, ...members.filter(c => !known.has(c.instanceId))];

    const sameRow = next.length === current.length &&
      next.every((c, i) => c.instanceId === current[i].instanceId);
    if (sameRow) return;

    this.middleRowCasts.set(next);

    setTimeout(() => this.initializeSwiper(), 50);
  }

  private initializeSwiper() {
    if (!this.middleRow) {
      console.error('cc-card-faction-navigation - middleRow element not found');
      return;
    }

    if (this.swiper) {
      this.swiper.destroy(true, true);
    }

    this.swiper = new Swiper(this.middleRow.nativeElement, {
      modules: [FreeMode, Mousewheel],
      slidesPerView: 'auto',
      spaceBetween: 0,
      centeredSlides: true,
      freeMode: {
        enabled: true,
        momentum: true,
        momentumRatio: 1,
        momentumBounceRatio: 1,
        sticky: false,
      },
      mousewheel: {
        enabled: true,
        forceToAxis: true,
        sensitivity: 1,
        releaseOnEdges: false,
      },
      grabCursor: true,
      resistance: true,
      resistanceRatio: 0.85,
      speed: 300,
      observer: true,
      observeParents: true,
      watchOverflow: true,
      watchSlidesProgress: true,
    });
  }

  loadCardData() {
    if (!this.internalCampaignId()) {
      console.error('No campaign ID provided');
      this.error.set('No campaign ID provided');
      return;
    }

    this.loading.set(true);
    this.error.set(null);

    Promise.all([
      this.http.get<CampaignFactionInstance[]>(this.factionsUrl()).toPromise(),
      this.http.get<CampaignCastInstance[]>(`${environment.apiUrl}/api/campaign/${this.internalCampaignId()}/castinstances`).toPromise()
    ]).then(([factionsData, castsData]) => {
      this.factions.set(factionsData || []);
      this.casts.set(this.offeredCasts(castsData || []));

      this.middleRowFactions.set(factionsData || []);

      this.loading.set(false);
      this.gridLoad.report('middle-left', 'content');

      setTimeout(() => {
        this.initializeSwiper();
      }, 100);
    }).catch(err => {
      console.error('Error loading faction data:', err);
      this.error.set('Failed to load faction data. Please try again.');
      this.loading.set(false);
      this.gridLoad.report('middle-left', 'content');
    });
  }

  private factionsUrl(): string {
    const base = `${environment.apiUrl}/api/campaign/${this.internalCampaignId()}/factions`;
    return this.isGmRow() ? base : `${base}/party`;
  }

  setPartyView(party: boolean) {
    if (!this.isDm() || party === this.viewParty()) return;

    this.viewParty.set(party);

    this.beginTransition(() => {
      this.middleRowCasts.set([]);
      this.topRowFactions.set([]);
      this.parentFaction.set(null);
      this.currentView.set('factions');
    });

    this.refreshFactions();
  }

  isOpen(faction: CampaignFactionInstance): boolean {
    return this.isDm() || faction.isVisibleToPlayers;
  }

  canAddCast(faction: CampaignFactionInstance | null | undefined): boolean {
    return !this.viewParty() && !!faction;
  }

  canWorkMembership(): boolean {
    if (this.viewParty()) return false;
    return !!this.parentFaction();
  }

  private applyPartyCastChanged(event: FactionPartyCastChangedEvent) {
    if (this.isGmRow()) return;

    const faction = event.faction;
    if (!faction) {
      this.refreshFactions();
      return;
    }

    const apply = (list: CampaignFactionInstance[]) =>
      list.map(f => f.factionInstanceId === faction.factionInstanceId ? faction : f);

    this.factions.update(apply);
    this.middleRowFactions.update(apply);
    this.topRowFactions.update(apply);
    this.parentFaction.update(f =>
      f && f.factionInstanceId === faction.factionInstanceId ? faction : f);

    this.settleCastsRow();
  }

  getCastsForFaction(faction: CampaignFactionInstance): CampaignCastInstance[] {
    const memberIds = new Set(faction.castInstanceIds ?? []);
    return this.casts().filter(cast => memberIds.has(cast.instanceId));
  }

  abs(value: number): number {
    return Math.abs(value);
  }

  factionTilt(instanceId: string): number {
    if (!this.factionTilts.has(instanceId)) {
      const magnitude = 2;
      this.factionTilts.set(instanceId, Math.random() < 0.5 ? -magnitude : magnitude);
    }
    return this.factionTilts.get(instanceId)!;
  }

  castTilt(instanceId: string): number {
    if (!this.castTilts.has(instanceId)) {
      this.castTilts.set(instanceId, Math.random() < 0.5 ? -2 : 2);
    }
    return this.castTilts.get(instanceId)!;
  }

  toggleFactionVisibility(faction: CampaignFactionInstance) {
    if (!this.isGmRow()) return;
    const next = !faction.isVisibleToPlayers;
    this.http.patch(
      `${environment.apiUrl}/api/campaign/${this.internalCampaignId()}/factions/${faction.factionInstanceId}/visibility`,
      { isVisibleToPlayers: next }
    ).subscribe(() => {
      const apply = (list: CampaignFactionInstance[]) =>
        list.map(f => f.factionInstanceId === faction.factionInstanceId ? { ...f, isVisibleToPlayers: next } : f);
      this.factions.update(apply);
      this.middleRowFactions.update(apply);
      this.topRowFactions.update(apply);
      this.parentFaction.update(p =>
        p && p.factionInstanceId === faction.factionInstanceId ? { ...p, isVisibleToPlayers: next } : p);
    });
  }

  isPrimaryCast(instanceId: string): boolean {
    return this.parentFaction()?.primaryCastInstanceId === instanceId;
  }

  hasPrimaryCast(): boolean {
    return !!this.parentFaction()?.primaryCastInstanceId;
  }

  setPrimaryCast(cast: CampaignCastInstance) {
    if (!this.canWorkMembership()) return;
    const faction = this.parentFaction();
    if (!faction) return;

    const factionInstanceId = faction.factionInstanceId;
    const castInstanceId = cast.instanceId;
    const party = this.isDm() ? '' : 'party/';

    if (this.isPrimaryCast(castInstanceId)) {
      this.http.delete(
        `${environment.apiUrl}/api/campaign/${this.internalCampaignId()}/factions/${factionInstanceId}/${party}cast/primary`
      ).subscribe(() => this.applyPrimaryCast(factionInstanceId, undefined));
    } else {
      this.http.patch(
        `${environment.apiUrl}/api/campaign/${this.internalCampaignId()}/factions/${factionInstanceId}/${party}cast/${castInstanceId}/primary`,
        {}
      ).subscribe(() => this.applyPrimaryCast(factionInstanceId, castInstanceId));
    }
  }

  private applyPrimaryCast(factionInstanceId: string, primaryCastInstanceId: string | undefined) {
    const apply = (list: CampaignFactionInstance[]) =>
      list.map(f => f.factionInstanceId === factionInstanceId
        ? { ...f, primaryCastInstanceId }
        : f);

    this.factions.update(apply);
    this.middleRowFactions.update(apply);
    this.topRowFactions.update(apply);
    this.parentFaction.update(f =>
      f && f.factionInstanceId === factionInstanceId ? { ...f, primaryCastInstanceId } : f);

    this.settleCastsRow();
    this.shellSvc.publishFactionsChanged(this.internalCampaignId());
  }

  deleteCast(cast: CampaignCastInstance) {
    if (!this.canWorkMembership()) return;
    const faction = this.parentFaction();
    if (!faction) return;
    if (this.deletingCastId()) return;

    this.deletingCastId.set(cast.instanceId);
    this.deleteError.set('');

    const party = this.isDm() ? '' : 'party/';

    this.http.delete(
      `${environment.apiUrl}/api/campaign/${this.internalCampaignId()}/factions/${faction.factionInstanceId}/${party}cast/${cast.instanceId}`
    ).subscribe({
      next: () => {
        const trim = (list: CampaignFactionInstance[]) =>
          list.map(f => f.factionInstanceId === faction.factionInstanceId
            ? this.withoutCastMember(f, cast.instanceId)
            : f);

        this.factions.update(trim);
        this.middleRowFactions.update(trim);
        this.topRowFactions.update(trim);
        this.parentFaction.update(f =>
          f && f.factionInstanceId === faction.factionInstanceId
            ? this.withoutCastMember(f, cast.instanceId)
            : f);
        this.middleRowCasts.update(
          list => list.filter(c => c.instanceId !== cast.instanceId));

        this.deletingCastId.set(null);
        this.shellSvc.publishFactionsChanged(this.internalCampaignId());
      },
      error: () => {
        this.deletingCastId.set(null);
        this.deleteError.set(`Could not remove ${cast.name} from ${faction.name}.`);
      },
    });
  }

  private withoutCastMember(
    faction: CampaignFactionInstance,
    castInstanceId: string
  ): CampaignFactionInstance {
    return {
      ...faction,
      castInstanceIds: (faction.castInstanceIds ?? []).filter(id => id !== castInstanceId),
      primaryCastInstanceId: faction.primaryCastInstanceId === castInstanceId
        ? undefined
        : faction.primaryCastInstanceId,
    };
  }

  navigateToCasts(faction: CampaignFactionInstance) {
    if (this.getCastsForFaction(faction).length === 0) return;

    this.beginTransition(() => {
      this.topRowFactions.set([faction]);
      this.middleRowFactions.set([]);
      this.middleRowCasts.set(this.getCastsForFaction(faction));
      this.parentFaction.set(faction);
      this.currentView.set('casts');
    });
  }

  openFactionPicker() {
    if (!this.isGmRow()) return;
    this.shellSvc.openFactionPickerDrawer(this.internalCampaignId());
  }

  openCastPicker(faction: CampaignFactionInstance) {
    if (!this.canAddCast(faction)) return;
    this.shellSvc.openFactionCastPickerDrawer(
      this.internalCampaignId(), faction.factionInstanceId, faction.name);
  }

  deleteFaction(faction: CampaignFactionInstance) {
    if (!this.isGmRow()) return;
    if (this.getCastsForFaction(faction).length) return;
    if (this.deletingFactionId()) return;

    this.deletingFactionId.set(faction.factionInstanceId);
    this.deleteError.set('');

    this.http.delete(
      `${environment.apiUrl}/api/campaign/${this.internalCampaignId()}/factions/${faction.factionInstanceId}`
    ).subscribe({
      next: () => {
        const drop = (list: CampaignFactionInstance[]) =>
          list.filter(f => f.factionInstanceId !== faction.factionInstanceId);

        this.factions.update(drop);
        this.middleRowFactions.update(drop);
        this.topRowFactions.update(drop);
        this.parentFaction.update(p =>
          p && p.factionInstanceId === faction.factionInstanceId ? null : p);

        this.deletingFactionId.set(null);
        this.shellSvc.publishFactionsChanged(this.internalCampaignId());
      },
      error: () => {
        this.deletingFactionId.set(null);
        this.deleteError.set(`Could not delete ${faction.name}.`);
      },
    });
  }

  navigateToFactions() {
    this.beginTransition(() => {
      this.middleRowFactions.set(this.factions());
      this.middleRowCasts.set([]);
      this.topRowFactions.set([]);
      this.parentFaction.set(null);
      this.currentView.set('factions');
    });
  }

  private beginTransition(swap: () => void) {
    if (this.transitioning()) return;

    const fadeWindow = cardFadeWindowMs();
    if (fadeWindow === 0) {
      this.swapped(swap);
      return;
    }

    this.transitioning.set(true);
    this.transitionTimer = setTimeout(() => {
      this.transitionTimer = null;
      this.transitioning.set(false);
      this.swapped(swap);
    }, fadeWindow);
  }

  private swapped(swap: () => void) {
    swap();

    setTimeout(() => {
      this.initializeSwiper();
    }, 50);
  }
}
