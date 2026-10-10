import { Component, ChangeDetectionStrategy, inject, signal, computed, AfterViewInit, ElementRef, ViewChild, Input, OnDestroy } from '@angular/core';
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
import { AuthService } from '../../../../../core/auth/auth.service';
import { V2CampaignShellService } from '../../../../../core/v2-campaign-shell.service';
import { V2GridLoadService } from '../../../../../core/v2-grid-load.service';
import { publishGridAreaMark } from '../../../../../core/v2-grid-area-mark.service';
import { V2AreaChangeService } from '../../../../../core/v2-area-change.service';
import { V2SpotlightService } from '../../../../../core/v2-spotlight.service';
import Swiper from 'swiper';
import { FreeMode, Mousewheel } from 'swiper/modules';

/**
 * Hierarchical card navigation for campaign factions.
 *
 * Mirrors the layout/behaviour of `CcCardNavigationComponent` (locations ->
 * sublocations -> casts) but for the two-level faction hierarchy:
 *
 *   - Middle row : faction cards (active)
 *   - Bottom row : cast stacks that are members of the focused faction
 *   - Top row    : the parent faction breadcrumb while browsing its casts
 *
 * Cast children are resolved from the parent's `castInstanceIds` membership
 * list, unlike locations which derive children from a foreign key on the child.
 * They are drawn in the campaign's own cast order (see `getCastsForFaction`),
 * which is the order the cast cards come in — the crowned leader is not lifted
 * out of it.
 */
@Component({
  selector: 'app-cc-card-faction-navigation',
  standalone: true,
  imports: [CommonModule, CcFactionCardComponent, CcSimpleFactionCardComponent, CcCastCardComponent, CcSimpleCastCardComponent, CcCardFadeDirective, CcCardSpotlightComponent],
  /**
   * OnPush, like the realm row's own (see cc-card-navigation): the row is redrawn when a card it
   * holds moves — a faction removed, a cast written, a lock worked — and not when a ticket is rung
   * for something else on the page. The faction and cast cards it draws are OnPush too.
   */
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './cc-card-faction-navigation.component.html',
  styleUrl: './cc-card-faction-navigation.component.scss'
})
export class CcCardFactionNavigationComponent implements AfterViewInit, OnDestroy {
  private http = inject(HttpClient);
  private hub = inject(CampaignHubService);
  private auth = inject(AuthService);
  private shellSvc = inject(V2CampaignShellService);
  private gridLoad = inject(V2GridLoadService);
  private areaChange = inject(V2AreaChangeService);
  private spotlight = inject(V2SpotlightService);
  private hubSubscriptions: Subscription[] = [];

  /** Whether the viewer is a GM: the only one the cards' delete controls are drawn for. */
  readonly isDm = this.auth.isDm;

  /** Whether the viewer is a player: the only one a changed area is lit for. */
  readonly isPlayer = this.auth.isPlayer;

  /**
   * What the middle-left area is known by — the heading over the faction row, and the mark it wears
   * on the radial navigator — published for as long as this row stands in the area (see
   * V2GridAreaMarkService).
   */
  private readonly mark = publishGridAreaMark('middle-left', 'content', {
    title: () => ['Factions'],
    icon: { path: '/factions.svg', width: 38, height: 38 },
  });

  /**
   * Whether the row is showing the party's own cast associations instead of the GM's — the GM's
   * own look over the party's shoulder, raised from the "Party view" side of the party switch
   * standing over the row (see `setPartyView`). Only ever raised for a GM.
   */
  readonly viewParty = signal(false);

  /**
   * Whether the row is the GM's own to work: their faction cards, their memberships, their
   * writes. False for a player's row (a player works only what is theirs — see `canAddCast` and
   * `canWorkMembership`) and false while the GM has the party's own row up (`viewParty`), which is
   * a look, not a place to write.
   */
  readonly isGmRow = computed(() => this.isDm() && !this.viewParty());

  @ViewChild('middleRow') middleRow!: ElementRef<HTMLElement>;

  // Swiper instance for middle row
  private swiper: Swiper | null = null;

  // Input for campaign ID (public property for Angular binding)
  @Input() campaignId: string = '';

  // Internal campaign ID signal
  internalCampaignId = signal<string>('');

  // Loading states
  loading = signal<boolean>(false);
  error = signal<string | null>(null);

  // Card data
  factions = signal<CampaignFactionInstance[]>([]);
  casts = signal<CampaignCastInstance[]>([]);

  // Navigation state for the 2-level system
  currentView = signal<'factions' | 'casts'>('factions');
  parentFaction = signal<CampaignFactionInstance | null>(null);

  // Row states
  topRowFactions = signal<CampaignFactionInstance[]>([]);
  middleRowFactions = signal<CampaignFactionInstance[]>([]);
  middleRowCasts = signal<CampaignCastInstance[]>([]);

  // Deleting a faction: the card whose write is in flight, and a delete that did not land.
  deletingFactionId = signal<string | null>(null);
  // Deleting a cast: the card whose write is in flight, sharing the error line above.
  deletingCastId = signal<string | null>(null);
  deleteError = signal<string>('');

  /**
   * Whether the row is taking its cards away before it swaps them for the new ones. Raised by
   * `beginTransition` and bound to every card as `ccCardFadeOut`, so each card fades where it
   * stands (see CcCardFadeDirective).
   */
  transitioning = signal<boolean>(false);

  /** The swap waiting on the cards to fade away, so that leaving can call it off. */
  private transitionTimer: ReturnType<typeof setTimeout> | null = null;

  // Faction tilt tracking
  private factionTilts = new Map<string, number>();

  // Cast tilt tracking
  private castTilts = new Map<string, number>();

  ngAfterViewInit() {
    // Set internal campaign ID from input
    this.internalCampaignId.set(this.campaignId);

    // Load card data
    this.loadCardData();

    // Subscribe to card instance updates
    this.setupHubSubscriptions();
  }

  ngOnDestroy() {
    // A swap still waiting on the cards to fade away goes with the row
    if (this.transitionTimer !== null) {
      clearTimeout(this.transitionTimer);
      this.transitionTimer = null;
    }

    // Destroy Swiper instance to prevent memory leaks
    if (this.swiper) {
      this.swiper.destroy(true, true);
      this.swiper = null;
    }

    // Clean up hub subscriptions
    this.hubSubscriptions.forEach(sub => sub.unsubscribe());
  }

  private setupHubSubscriptions() {
    // Subscribe to faction instance updates (re-fetch the faction list)
    this.hubSubscriptions.push(
      this.hub.factionInstanceUpdated$.subscribe(event => {
        if (!event || event.campaignId !== this.internalCampaignId()) return;
        this.refreshFactions();
      })
    );

    // The faction picker added factions to this campaign: re-fetch the list so the new
    // cards are in the row.
    this.hubSubscriptions.push(
      this.shellSvc.factionsChanged.subscribe(campaignId => {
        if (!campaignId || campaignId !== this.internalCampaignId()) return;
        this.refreshFactions();
      })
    );

    // The party's own cast cards in a faction have moved — a player's crown, or a member added or
    // taken off: the faction comes out with the event as the party's read now holds it, so the
    // rows drawn from that read take the change on from what they are handed (see
    // `applyPartyCastChanged`).
    this.hubSubscriptions.push(
      this.hub.factionPartyCastChanged$.subscribe(event => {
        if (!event || event.campaignId !== this.internalCampaignId()) return;
        this.applyPartyCastChanged(event);
      })
    );

    // A faction was taken out of this campaign — by this row's own delete button, or by
    // someone else's screen: re-fetch so the card leaves the row here too.
    this.hubSubscriptions.push(
      this.hub.factionRemoved$.subscribe(event => {
        if (!event || event.campaignId !== this.internalCampaignId()) return;
        this.refreshFactions();
      })
    );

    // The party's own record for a faction moved — a player set its perception, its influence or
    // its hiding state, here or on another screen (see FactionDetailContentComponent, which writes
    // it and the controller that rings this): re-fetch, so a card the party now reads differently
    // turns good or evil where it stands, since a faction card's alignment *is* its perception
    // (see cc-faction-card).
    //
    // Both the party's own row and the GM's look at it are drawn from that record, so both move
    // with it; the GM's own row is drawn from the campaign's own read and is left as it stands.
    this.hubSubscriptions.push(
      this.hub.noteUpdated$.subscribe(event => {
        if (!event || event.entityType !== 'faction') return;
        if (event.campaignId !== this.internalCampaignId()) return;
        this.refreshFactions();
      })
    );

    // A card's own lock was worked — a cast card revealed or sealed again, a faction unlocked or
    // locked: the rows here take the new state on, which is what each row is drawn from. A player is
    // handed the cast cards the DM has revealed to them and nothing else, and a faction the DM has
    // not unlocked is not on their row at all (see the API's read for the party), so a reveal or a
    // lock has to reach this row as it happens (see `writeCardVisibility`). The campaign the shell
    // holds is written by the shell (see its own subscription).
    this.hubSubscriptions.push(
      this.hub.cardVisibilityChanged$.subscribe(event => {
        if (!event || event.campaignId !== this.internalCampaignId()) return;
        this.writeCardVisibility(event);
      })
    );

    // A cast of the campaign was written, here or elsewhere: the card travels with the event now,
    // so the rows behind the faction stacks take the server's copy of it straight from the payload
    // and the card's own redraw is all it costs. An older server sends the id alone, and the card
    // is read back the way it always was.
    this.hubSubscriptions.push(
      this.hub.castInstanceUpdated$.subscribe(event => {
        if (!event || event.campaignId !== this.internalCampaignId()) return;

        if (event.cast) {
          this.writeCastUpdate(event.cast);
          return;
        }

        this.http.get<CampaignCastInstance>(
          `${environment.apiUrl}/api/campaign/${event.campaignId}/castinstances/${event.castInstanceId}`
        ).subscribe(updatedCast => this.writeCastUpdate(updatedCast));
      })
    );

    // The campaign's card rows changed elsewhere — a cast deleted in the locations row,
    // say: re-read the cast collection so a card that has gone leaves the rows here (and
    // stops being counted in a faction's membership).
    this.hubSubscriptions.push(
      this.hub.campaignNavChanged$.subscribe(event => {
        if (!event || event.campaignId !== this.internalCampaignId()) return;
        this.refreshCasts();
      })
    );
  }

  /**
   * Re-fetch the campaign's cast collection and settle it into the rows: an entry a row
   * already holds takes the server's copy of it, and one that has gone leaves the row. The
   * faction rows need no change of their own — their cast stacks and their own delete control
   * are both resolved through `getCastsForFaction`, which reads this collection.
   */
  private refreshCasts() {
    this.http.get<CampaignCastInstance[]>(
      `${environment.apiUrl}/api/campaign/${this.internalCampaignId()}/castinstances`
    ).subscribe(castsData => {
      const casts = this.offeredCasts(castsData ?? []);
      const byId = new Map(casts.map(c => [c.instanceId, c]));

      // The row's own order is kept: what is on it stays where it is, in the server's version.
      const sync = (list: CampaignCastInstance[]) =>
        list.flatMap(c => {
          const current = byId.get(c.instanceId);
          return current ? [current] : [];
        });

      this.casts.set(casts);
      this.middleRowCasts.update(list => this.offeredCasts(sync(list)));
    });
  }

  /**
   * The campaign's cast cards this row is drawn from: the GM's every cast card the campaign holds,
   * and a player's the cards the DM has revealed to them. A player's row therefore never stands a
   * card they cannot see — not in a faction's stack, not in the row of its cast — and the drawer
   * that adds members to a faction offers the same cards (see cc-faction-cast-picker). A list with
   * nothing hidden is handed back as it stands, so no signal is rung for a filter that hid nothing.
   */
  private offeredCasts(casts: CampaignCastInstance[]): CampaignCastInstance[] {
    if (this.isDm()) return casts;

    const offered = casts.filter(cast => cast.isVisibleToPlayers);
    return offered.length === casts.length ? casts : offered;
  }

  /** The server's copy of one cast, written into the collections this row keeps. */
  private writeCastUpdate(updated: CampaignCastInstance) {
    const write = (list: CampaignCastInstance[]) =>
      this.offeredCasts(list.map(c => c.instanceId === updated.instanceId ? updated : c));

    this.casts.update(write);
    this.middleRowCasts.update(write);
  }

  /**
   * One card's lock, written into the collections this row keeps (see the subscription): a cast
   * card takes the new state on, and a player's rows then hold it only while it stays revealed (see
   * `offeredCasts`).
   *
   * A faction's lock shows and hides the card itself (see the API's read for the party), so the rows
   * drawn from that read — a player's own, and the GM's look at the party's row — take it the way
   * they take a faction leaving: a card being locked leaves them, and one being unlocked is not
   * there to write into, so the row is read again (the way it is when a faction is added, see
   * `refreshFactions`). The GM's own row carries every faction the campaign holds, so the lock only
   * writes its own flag down there — it is what the card's own lock reads back.
   *
   * The card types this row does not draw — locations, sublocations — are left to the realm row.
   */
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
        // The DM just unlocked a faction for this viewer: the middle-left button is lit for the
        // players alone — the DM and the Admin wrote the lock and have nothing to be shown — and
        // the faction's own card takes the reveal's light (see cc-card-spotlight). Its cast cards
        // are left alone: a membership is not a reveal, so nothing points down from one.
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

      // A card that has left the row takes the cast row with it: a viewer standing in the locked
      // faction's cast is put back on the factions (see `navigateToFactions`).
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

  /**
   * Re-fetch the faction list (there is no single-faction GET endpoint) and settle it
   * into the rows: an entry a row already holds takes the server's copy of it, one that
   * has gone leaves the row, and one the campaign has gained — a faction added from the
   * picker — joins the end of the middle row.
   */
  private refreshFactions() {
    this.http.get<CampaignFactionInstance[]>(this.factionsUrl()).subscribe(factions => {
      const byId = new Map(factions.map(f => [f.factionInstanceId, f]));

      // The row's own order is kept: what is on it stays where it is, in the server's version.
      const sync = (list: CampaignFactionInstance[]) =>
        list.flatMap(f => {
          const current = byId.get(f.factionInstanceId);
          return current ? [current] : [];
        });

      // The middle row also takes what the campaign has gained, at the end.
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

      // The casts row is resolved through its parent's membership, so a card added to the
      // faction while its casts are on screen joins the row here (see settleCastsRow).
      this.settleCastsRow();
    });
  }

  /**
   * With the faction rows just re-read, the drilled-in casts row (the full cast cards) is put
   * back in step with its parent's membership — and only with its membership. The row keeps
   * the order it is already showing: a card that is still a member stays exactly where it
   * stands, a card gained joins the end, and one taken off leaves. That is deliberate, because
   * the parent's own order reads the leader first (`getCastsForFaction`): adopting that order
   * here would shuffle the row under the GM's hand every time a crown moved to another card.
   *
   * Nothing happens unless that row is the one on screen, and it is left alone when the run it
   * holds is already the run the parent has, so a settle that changed nothing never disturbs
   * the row's scroll or its Swiper.
   */
  private settleCastsRow() {
    if (this.currentView() !== 'casts') return;

    const parent = this.parentFaction();
    if (!parent) return;

    // The parent's members, resolved and leader first — the order a gained card joins in.
    const members = this.getCastsForFaction(parent);
    const memberById = new Map(members.map(c => [c.instanceId, c]));

    // The row keeps its own order: what is still a member stays where it is, in the version
    // the parent just handed us.
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

    // The row gained or lost a slide: Swiper is rebuilt over the new ones.
    setTimeout(() => this.initializeSwiper(), 50);
  }

  private initializeSwiper() {
    if (!this.middleRow) {
      console.error('cc-card-faction-navigation - middleRow element not found');
      return;
    }

    // Destroy existing swiper if any
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

    // Load faction and cast data in parallel
    Promise.all([
      this.http.get<CampaignFactionInstance[]>(this.factionsUrl()).toPromise(),
      this.http.get<CampaignCastInstance[]>(`${environment.apiUrl}/api/campaign/${this.internalCampaignId()}/castinstances`).toPromise()
    ]).then(([factionsData, castsData]) => {
      this.factions.set(factionsData || []);
      this.casts.set(this.offeredCasts(castsData || []));

      // Initialize row states
      this.middleRowFactions.set(factionsData || []);

      this.loading.set(false);
      this.gridLoad.report('middle-left', 'content');

      // Initialize Swiper after data is loaded and DOM is rendered
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

  /**
   * The faction read this row is drawn from: the GM's own membership, or the party's own — for a
   * player, who has no GM read to make, and for the GM's party view. It is one route either way,
   * and the two are separate memberships of the same faction instances (see the API's `party`
   * read), so what changes is whose cast cards and whose leader come back with them.
   */
  private factionsUrl(): string {
    const base = `${environment.apiUrl}/api/campaign/${this.internalCampaignId()}/factions`;
    return this.isGmRow() ? base : `${base}/party`;
  }

  /**
   * Hands the row over to the party's own, or back to the GM's own — the two sides of the party
   * switch standing over the row (see the template). The party's associations are read from their
   * own memberships, so the row is read again from that side; the faction being browsed is put back
   * with the row, since a faction whose cast are on screen may hold none of the party's — or none
   * the party can see. A press on the side already showing changes nothing.
   */
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

  /**
   * Whether a faction's own content is open to this viewer: the GM's own cards always are, and a
   * player's only once the DM has unlocked them — and an unlocked card is the only kind a player's
   * row is handed at all (the lock shows and hides the card itself, see the API's read for the
   * party), so this is the rule the ✦ Details hangs on rather than a second gate behind that read.
   * What the lock seals is the DM's content: the party's own records on a card (see `canAddCast` and
   * `canWorkMembership`) are theirs to keep wherever their card stands.
   */
  isOpen(faction: CampaignFactionInstance): boolean {
    return this.isDm() || faction.isVisibleToPlayers;
  }

  /**
   * Whether the way to give a faction its cast is offered: the ＋ under its card, and the one at the
   * end of its row. One rule for both roles: it stands wherever the viewer's own membership does —
   * the GM's own cards, a player's the cards they are handed — and is written for them alone, a
   * player's picks landing in the party's membership and the GM's in their own (see `openCastPicker`).
   * The GM's look at the party's row (`viewParty`) is a look and offers nothing; the lock is not a
   * gate here, since what it seals is the DM's content and not the party's own records.
   */
  canAddCast(faction: CampaignFactionInstance | null | undefined): boolean {
    return !this.viewParty() && !!faction;
  }

  /**
   * Whether the viewer may work the cast row's own controls — the crown on a card, and the way off a
   * membership. What is worked is the viewer's own membership: the GM's own row, or the party's where
   * a player is looking at theirs (see the API), which is why one hand never lands on the other's. It
   * follows `canAddCast`: the viewer's own records, on the cards they are handed, and the GM's look
   * at the party's row writes nothing.
   */
  canWorkMembership(): boolean {
    if (this.viewParty()) return false;
    return !!this.parentFaction();
  }

  /**
   * Takes the party's own cast cards in a faction on from the event that carried them: the faction
   * as the party's read now holds it, settled into the rows drawn from that read — a player's own
   * row, and the GM's look at the party's row (see `viewParty`), where the cast cards of the
   * faction on screen wear the crown the party has just moved.
   *
   * A GM looking at their own row is left alone: that row is drawn from the GM's memberships, which
   * the party's write never touched, so the party's members and leader are none of its business. A
   * faction the read no longer holds — the campaign has lost it — sends the row back to the server
   * for the list it does hold, the way a removal does.
   */
  private applyPartyCastChanged(event: FactionPartyCastChangedEvent) {
    if (this.isGmRow()) return;

    const faction = event.faction;
    if (!faction) {
      this.refreshFactions();
      return;
    }

    // The rows this read feeds take the server's copy of the faction, as every other settle here
    // does: the membership it wears is the party's, and so is the crown on it.
    const apply = (list: CampaignFactionInstance[]) =>
      list.map(f => f.factionInstanceId === faction.factionInstanceId ? faction : f);

    this.factions.update(apply);
    this.middleRowFactions.update(apply);
    this.topRowFactions.update(apply);
    this.parentFaction.update(f =>
      f && f.factionInstanceId === faction.factionInstanceId ? faction : f);

    // The casts row, if it is the one on screen, is put back in step with the membership it has
    // just been handed: a card the party took off leaves it, and the crown moves to the card that
    // took it (see `settleCastsRow`).
    this.settleCastsRow();
  }

  /**
   * Cast members of a faction, in the campaign's own cast order — the order the cast cards
   * come in (`casts`, which the server reads name-first), narrowed to the faction's
   * membership. Membership is expressed as an id list on the faction (`castInstanceIds`)
   * rather than a foreign key on the child, so we resolve against the campaign cast
   * collection.
   *
   * The crowned leader is deliberately not lifted to the front: the crown marks who leads,
   * it does not order the row. A card therefore keeps the place the cast list gives it, both
   * while the row is on screen (see `settleCastsRow`) and across a refresh, where the row is
   * built fresh from here.
   */
  getCastsForFaction(faction: CampaignFactionInstance): CampaignCastInstance[] {
    const memberIds = new Set(faction.castInstanceIds ?? []);
    return this.casts().filter(cast => memberIds.has(cast.instanceId));
  }

  // Helper method for Math.abs() to use in templates
  abs(value: number): number {
    return Math.abs(value);
  }

  // Faction tilt for visual variation
  factionTilt(instanceId: string): number {
    if (!this.factionTilts.has(instanceId)) {
      const magnitude = 2;
      this.factionTilts.set(instanceId, Math.random() < 0.5 ? -magnitude : magnitude);
    }
    return this.factionTilts.get(instanceId)!;
  }

  // Cast tilt for visual variation
  castTilt(instanceId: string): number {
    if (!this.castTilts.has(instanceId)) {
      this.castTilts.set(instanceId, Math.random() < 0.5 ? -2 : 2);
    }
    return this.castTilts.get(instanceId)!;
  }

  // Toggle faction visibility
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

  /** Whether the faction being browsed wears its crown on this card. */
  isPrimaryCast(instanceId: string): boolean {
    return this.parentFaction()?.primaryCastInstanceId === instanceId;
  }

  /** Whether the faction being browsed already has a leader (a crowned card). */
  hasPrimaryCast(): boolean {
    return !!this.parentFaction()?.primaryCastInstanceId;
  }

  /**
   * Sets or clears the faction's leader — the cast card wearing the crown. It is the faction
   * detail page's rule kept on the card (see the template): one card wears the crown at a
   * time, so the crowned card gives it up before another can take it (the caller passes that
   * as `primaryLocked`), exactly as that page's checkbox is held until the current leader's
   * is cleared.
   */
  setPrimaryCast(cast: CampaignCastInstance) {
    if (!this.canWorkMembership()) return;
    const faction = this.parentFaction();
    if (!faction) return;

    const factionInstanceId = faction.factionInstanceId;
    const castInstanceId = cast.instanceId;
    // Whose crown it is follows whose row it is: a player's hand writes the party's own
    // membership, the GM's their own, and the two are separate rows of the same table (see the
    // API). The party's own routes wear the same shape under `party`.
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

  /**
   * Writes the leader onto the faction wherever the rows hold it, then re-settles the casts
   * row. The crown moves no card's place in that row (see `settleCastsRow`): the card that
   * takes it stays exactly where it stands, so nothing shifts under the GM's hand. The shell
   * is told so the campaign it holds agrees.
   */
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

  /**
   * Takes a cast card off the faction it was opened under — the card's own back-face delete
   * control, whose dagger asks before anything is written (see the card), and which is drawn for
   * the hand that holds the membership: the GM's own, or the party's (see the template).
   *
   * Only the faction ↔ cast membership is broken, and only the viewer's own side of it: this row
   * is the faction's own list, not the campaign's cast collection, so the card stays in the
   * campaign — and in any other faction it belongs to — and only leaves this one. A player's
   * removal breaks the party's row and leaves the GM's standing, as the GM's leaves the party's
   * (see the API). The row drops the card as soon as the write lands, and the faction's
   * membership is trimmed to match, which also brings that faction's own delete control back if
   * this was its last member.
   */
  deleteCast(cast: CampaignCastInstance) {
    if (!this.canWorkMembership()) return;
    const faction = this.parentFaction();
    if (!faction) return;
    if (this.deletingCastId()) return;

    this.deletingCastId.set(cast.instanceId);
    this.deleteError.set('');

    // Whose membership is broken follows whose row it is, as the crown does: the party's own
    // route wears the same shape under `party` (see the API).
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
        // The membership this broke is the campaign's: tell the shell, so the campaign it
        // holds (what the cast picker reads to see who is still free to add) re-reads too.
        this.shellSvc.publishFactionsChanged(this.internalCampaignId());
      },
      error: () => {
        this.deletingCastId.set(null);
        this.deleteError.set(`Could not remove ${cast.name} from ${faction.name}.`);
      },
    });
  }

  /** A faction without the given cast in its membership, its primary cleared if it held it. */
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

  // Navigate to casts for a specific faction
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

  // Open the right drawer with the faction picker: the library's cards to add, or a
  // brand new faction. The GM's own row alone — a faction is not a player's to add (see
  // the template).
  openFactionPicker() {
    if (!this.isGmRow()) return;
    this.shellSvc.openFactionPickerDrawer(this.internalCampaignId());
  }

  /**
   * Opens the right drawer with the cast picker for a faction holding none yet or asking for
   * more: the campaign's own cast cards, to make them members of it (see the shell). Offered
   * wherever `canAddCast` says so, and the cards the drawer offers are the ones the viewer is
   * handed — the GM's every card in the campaign, a player's the ones revealed to them — so the
   * membership list never needs a library. Whose membership the picks land in follows whose row it
   * is — a player's land in the party's, the GM's in their own (see cc-faction-cast-picker).
   */
  openCastPicker(faction: CampaignFactionInstance) {
    if (!this.canAddCast(faction)) return;
    this.shellSvc.openFactionCastPickerDrawer(
      this.internalCampaignId(), faction.factionInstanceId, faction.name);
  }

  /**
   * Takes a faction out of the campaign — the card's own back-face delete button, whose
   * dagger asks before anything is written (see the card), and which is only drawn for a GM
   * (see the template) and for a faction holding no cast cards. A faction with cast in it is
   * left alone: those cards hang off it, so it has to be emptied first.
   *
   * The row drops the card as soon as the write lands, and both the campaign and the row are
   * told the factions changed, so the picker behind the drawer offers the faction again.
   */
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

  // Navigate back to factions
  navigateToFactions() {
    this.beginTransition(() => {
      // Move factions back to middle row
      this.middleRowFactions.set(this.factions());
      this.middleRowCasts.set([]);
      // Clear top row
      this.topRowFactions.set([]);
      // Update state
      this.parentFaction.set(null);
      this.currentView.set('factions');
    });
  }

  /**
   * Takes this row's cards away, then swaps them: every card fades where it stands, and only
   * once they have gone (or nearly, at `cardFadeWindowMs`) does `swap` put the new cards in, so
   * the cards arriving are laid out in a row the old ones have already left, and the Swiper
   * re-initialized just after counts only the new cards.
   *
   * `swap` is the state change the row would have made on the spot. A second click while the
   * cards are fading away is not a second move, and a viewer who has asked for less movement has
   * no fades to wait for: they are swapped straight away.
   */
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

  /** The new cards going in, and the Swiper re-initialized once they are in the DOM. */
  private swapped(swap: () => void) {
    swap();

    // Re-initialize Swiper after DOM update
    setTimeout(() => {
      this.initializeSwiper();
    }, 50);
  }
}
