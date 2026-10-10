import { Component, ElementRef, Injector, OnDestroy, afterNextRender, computed, effect, inject, input, signal, viewChildren } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import Swiper from 'swiper';
import { FreeMode, Mousewheel } from 'swiper/modules';
import { environment } from '../../../../../../environments/environment';
import { CampaignCastInstance } from '../../../../models/cast.model';
import { CampaignDetail } from '../../../../models/campaign.model';
import { CampaignLocationInstance } from '../../../../models/location.model';
import { CampaignSublocationInstance } from '../../../../models/sublocation.model';
import { CampaignShellService } from '../../../../../core/campaign-shell.service';
import { V2CampaignShellService } from '../../../../../core/v2-campaign-shell.service';
import { CcSimpleLocationCardComponent } from '../../carddeck/cc-simple-location-card/cc-simple-location-card.component';
import { CcSimpleSublocationCardComponent } from '../../carddeck/cc-simple-sublocation-card/cc-simple-sublocation-card.component';
import { CcPlayerIconComponent } from '../cc-player-icon/cc-player-icon.component';
import { CcTextboxComponent } from '../cc-textbox/cc-textbox.component';

/** One row of the drawer: a location, and the sublocations that stand in it. */
interface TravelRow {
  location: CampaignLocationInstance;
  sublocations: CampaignSublocationInstance[];
}

/** Whether a location answers a search term, which is handed over lower-cased and trimmed. */
function matchesLocation(location: CampaignLocationInstance, term: string): boolean {
  return location.name.toLowerCase().includes(term)
    || (location.classification ?? '').toLowerCase().includes(term)
    || (location.description ?? '').toLowerCase().includes(term)
    || (location.keywords ?? []).some(keyword => keyword.toLowerCase().includes(term));
}

/**
 * Whether a sublocation answers a search term, which is handed over lower-cased and trimmed. Read
 * the way the other pickers read their cards: the name first, then what the card says about itself.
 */
function matchesSublocation(sublocation: CampaignSublocationInstance, term: string): boolean {
  return sublocation.name.toLowerCase().includes(term)
    || (sublocation.description ?? '').toLowerCase().includes(term)
    || (sublocation.keywords ?? []).some(keyword => keyword.toLowerCase().includes(term));
}

/** What stands between two cards of a row, in px — Swiper's to hold once the row is mounted. */
const ROW_GAP = 12;

/**
 * How long after a row last moved under the hand a click is read as that drag's own tail rather
 * than as a pick, in ms. A drag that starts and ends on the same card still ends with a click on
 * it: Swiper cancels the click's default action, and only throws the event away while the row is
 * animating (its momentum), so a slow drag's tail is a click on a card the DM never picked.
 *
 * The window is short enough that an ordinary pick — made once the hand has come to rest on a card
 * — is never swallowed, and it cannot stick: it is a time, not a flag, so a gesture that ends
 * without saying so (a pointer lost outside the window) leaves nothing behind.
 */
const DRAG_TAIL_MS = 200;

/**
 * What the drawer says where the party's own anchor is passed over: the rule, and the way out of it.
 * Worn by the ⚔ card itself (its title, and its name to a screen reader) and said at the head of the
 * drawer, so a card that answers nothing is never left unexplained (see `castLocked`).
 */
const LOCKED_PARTY_NOTE = 'Locked cards cannot join the party — reveal this card to the players first.';

/**
 * cc-cast-travel-picker
 *
 * The right drawer's content for moving a cast card (see `cc-cast-travel`, the button on the card
 * that asks the shell for this drawer).
 *
 * The drawer is a stack of swipable rows, one per location: the location's own card leads its row
 * and the sublocations standing in it follow along the same row, so everything that stands in a
 * place is one drag away from its card. The location the cast stood in when the drawer was opened
 * leads the stack — with the party's own location next, so "send the cast back to the party" is
 * never far down it, and the ⚔ card among that location's sublocations is the anchor itself. The
 * drawer's cards say where things stand: the location the cast is in wears the Here flag, the room
 * it is in wears the purple tick, the room picked here waits with the same tick in green, and the
 * location card leading that pick's row wears the campaign's travel art — all of them until the
 * travel button under the line at the head of the drawer is pressed. A search box over the top of
 * the drawer narrows the rows to the cards that answer to it.
 *
 * Picking a room is a pick, not a move: its card is ringed and the place it stands in is named on
 * the travel button under the line at the head of the drawer, and the cast is only moved when that
 * button is pressed — so a card picked by mistake, or picked to look at, leaves the cast where it
 * stands. The move itself is the write `cc-cast-travel`'s own panel used to make,
 * `PATCH api/campaigns/{id}/casts/{id}/travel`, carrying where the cast is going and where it came
 * from, which the server broadcasts to the campaign group as `CastTraveled`. The campaign is
 * brought into step with the answer at once, in whichever shell is holding it, and the v2 shell is
 * told the cards changed so a row that draws its cards from its own collection (see the realm row)
 * re-reads and moves the card. A travel that does not land says so beside the button and leaves the
 * cast where it stands.
 *
 * One room is closed to the card being moved: the party's own anchor, while that card's lock stands
 * closed (see `castLocked`). A locked card is sealed from the players, and the party's anchor is
 * their own room, so the ⚔ card stands dimmed, answers no pick, and says why — on itself, and at the
 * head of the drawer. Every other place is still the DM's to send the cast to, and unlocking the card
 * frees the anchor with it. A card already standing with the party is let be: it is not on its way in.
 *
 * The drawer stays open over a travel: the markers follow the cast — never the rows, which hold
 * still while a DM moves a card about, so the DM keeps their place in the drawer — and the line at
 * the head of it names the place the cast is in. As the drawer shuts, a cast left in another
 * location is handed to the realm row (see `V2CampaignShellService.publishCastTraveledFromDrawer`),
 * which shows the place it is now in.
 *
 * The campaign is read from whichever shell holds it — `V2CampaignShellService` in the v2 shell,
 * `CampaignShellService` on the campaign and player pages — as the card's own travel control reads
 * it, the two told apart by the id the drawer was handed.
 */
@Component({
  selector: 'cc-cast-travel-picker',
  standalone: true,
  imports: [CommonModule, FormsModule, CcSimpleLocationCardComponent, CcSimpleSublocationCardComponent, CcPlayerIconComponent, CcTextboxComponent],
  templateUrl: './cc-cast-travel-picker.component.html',
  styleUrl: './cc-cast-travel-picker.component.scss'
})
export class CcCastTravelPickerComponent implements OnDestroy {
  private http = inject(HttpClient);
  private injector = inject(Injector);
  private shell = inject(CampaignShellService);
  private v2Shell = inject(V2CampaignShellService);

  /** The campaign the drawer is for, and the card being moved. */
  readonly campaignId = input.required<string>();
  readonly castInstanceId = input.required<string>();
  readonly castName = input('');

  /** The sublocation the card stands in, as the card knows it; `''` when it knows of none. */
  readonly sublocationInstanceId = input('');

  readonly portalColor = input('#6e28d0');

  /**
   * The search box over the rows: what the DM is looking for, matched against the locations' and
   * the sublocations' own cards (see `rows`).
   */
  readonly search = signal('');

  /** Whether the search is leaving anything out, for the drawer's own empty state. */
  readonly searching = computed(() => !!this.search().trim());

  /** The travel in flight; the cards are held while it lands. */
  readonly traveling = signal(false);

  /** A travel that did not land. Cleared on the next pick. */
  readonly error = signal<string | null>(null);

  /** Where the card has travelled to here, until the campaign it reads catches up. */
  private readonly travelledTo = signal<string | null>(null);

  /**
   * The room picked in the rows below and not yet travelled to: ringed on its own card, named on
   * the travel button, and the cast's place only once that button is pressed (see `travel`). A pick
   * is the DM's, not the cast's: nothing moves until they say so.
   */
  readonly pending = signal<CampaignSublocationInstance | null>(null);

  /** The rows' tracks, in the order they are drawn: one per location. */
  private readonly rowTracks = viewChildren<ElementRef<HTMLElement>>('travelRow');

  /**
   * One Swiper per row, keyed by the location the row is about rather than by its place in the
   * stack: the rows are re-cut under the DM as they search (see `rows`), so a row that has merely
   * moved down the stack must keep the instance it was already holding — the drag position along
   * it, and its listeners, with it.
   */
  private readonly swipers = new Map<string, Swiper>();

  /** When a row last moved under the hand, for telling a drag's tail click from a pick. */
  private rowMovedAt = 0;

  /** A row moved under the hand: raised by every row's Swiper (see DRAG_TAIL_MS). */
  private readonly rowMoved = () => { this.rowMovedAt = Date.now(); };

  /**
   * The campaign the card belongs to, read from whichever shell is holding it. The two are told
   * apart by the id the drawer was handed, so a stale campaign left behind by the other shell (a
   * v2 visit from a campaign page, say) is never the one the drawer draws.
   */
  readonly campaign = computed<CampaignDetail | null>(() => {
    const id = this.campaignId();
    const v2 = this.v2Shell.campaign();
    if (v2 && v2.id === id) return v2;

    const legacy = this.shell.campaign();
    if (legacy && legacy.id === id) return legacy;

    return v2 ?? legacy;
  });

  /** The party's own anchor: the sublocation the ⚔ card in the drawer stands for. */
  readonly partyAnchor = computed<CampaignSublocationInstance | null>(() =>
    this.campaign()?.sublocations?.find(s => s.isPartyAnchor) ?? null);

  /**
   * The card the drawer is moving, read off the campaign: the lock below is the card's own, and the
   * campaign is where the drawer reads everything else it draws.
   */
  private readonly movingCast = computed<CampaignCastInstance | null>(() =>
    this.campaign()?.casts?.find(cast => cast.instanceId === this.castInstanceId()) ?? null);

  /**
   * Whether the card being moved is locked: its own lock stands closed, so the card is sealed from
   * the players — the state the lock control on the card wears (`isVisibleToPlayers`).
   *
   * A locked card cannot be moved to the party. The party's own anchor is the players' room, and a
   * card they are never shown cannot join them there: the DM would be putting a card on the party
   * that stands on none of the players' rows. Every other place is still the DM's to send it to, and
   * a locked card is one lock away from being free to go anywhere — the lock is the card's own
   * (see cc-cast-card, and ✦ Details for the same control in the cast drawer).
   *
   * The card is read off the campaign rather than handed in with the drawer's target: the drawer
   * already reads the campaign for its rows, and the card is the campaign's own copy of itself.
   */
  readonly castLocked = computed(() => this.movingCast()?.isVisibleToPlayers === false);

  /**
   * Why a room's card may not be picked, where it may not be — the party's own anchor, with the card
   * locked — and null for every room the card is free to go to. The same line is worn by the ⚔ card
   * (its title, and its name to a screen reader) and said at the head of the drawer, so the rule is
   * explained rather than left as a card that answers nothing.
   *
   * A card already standing with the party is let be: the rule is about the way *in*, and the anchor
   * it stands on is a card it is not being moved to — a locked companion the DM is travelling out of
   * the party is not read the way in every time the drawer is opened over it.
   */
  partyLockNote(sublocation: CampaignSublocationInstance): string | null {
    if (!sublocation.isPartyAnchor || !this.castLocked()) return null;
    if (sublocation.instanceId === this.currentSublocationId()) return null;

    return LOCKED_PARTY_NOTE;
  }

  /** Whether a room's card is on offer to the card being moved (see `partyLockNote`). */
  isOffered(sublocation: CampaignSublocationInstance): boolean {
    return this.partyLockNote(sublocation) === null;
  }

  /** Every location the campaign holds, in the campaign's own order. */
  private readonly locations = computed<CampaignLocationInstance[]>(() => this.campaign()?.locations ?? []);

  /**
   * The location the cast stood in when the drawer was opened: read off the place the card was
   * handed, never off where it has been sent since. It leads the drawer's stack (see `rowLocations`)
   * and it is what "the location has changed" is measured against when the drawer shuts (see
   * ngOnDestroy).
   */
  private readonly openedLocationId = computed<string | null>(() => {
    const id = this.sublocationInstanceId();
    if (!id) return null;
    return this.campaign()?.sublocations?.find(s => s.instanceId === id)?.locationInstanceId ?? null;
  });

  /**
   * The locations the rows are built from: the one the cast stood in when the drawer was opened
   * leads, then the party's own location, then the rest in the campaign's order.
   *
   * The stack is read off the place the card was handed rather than off where it now stands, so it
   * holds still however many rooms the DM moves the cast through — the markers on the cards are
   * what say where the cast is, not the order of the rows.
   */
  private readonly rowLocations = computed<CampaignLocationInstance[]>(() => {
    const all = this.locations();
    const leading: CampaignLocationInstance[] = [];

    for (const id of [this.openedLocationId(), this.partyAnchor()?.locationInstanceId]) {
      if (!id || leading.some(loc => loc.instanceId === id)) continue;
      const location = all.find(loc => loc.instanceId === id);
      if (location) leading.push(location);
    }

    const atHead = new Set(leading.map(loc => loc.instanceId));
    return [...leading, ...all.filter(loc => !atHead.has(loc.instanceId))];
  });

  /**
   * The drawer's rows, narrowed by the search box: one location each, its own card leading the row
   * and the sublocations that stand in it following it along the same row.
   *
   * The search reads the cards the way the other pickers read theirs — a card answers to its name
   * and to what it says about itself — and a location that answers on its own account brings its
   * whole row with it: a DM asking for a place is asking what stands in it. A row that answers
   * nothing, in itself and in its rooms, is not drawn at all.
   */
  readonly rows = computed<TravelRow[]>(() => {
    const term = this.search().trim().toLowerCase();

    return this.rowLocations().flatMap(location => {
      const sublocations = this.sublocationsByLocation()[location.instanceId] ?? [];
      if (!term || matchesLocation(location, term)) return [{ location, sublocations }];

      const answering = sublocations.filter(sublocation => matchesSublocation(sublocation, term));
      return answering.length ? [{ location, sublocations: answering }] : [];
    });
  });

  onSearchChange(term: string) {
    this.search.set(term);
  }

  /** The sublocations on offer, grouped under the location each one stands in, the anchor first. */
  readonly sublocationsByLocation = computed<Record<string, CampaignSublocationInstance[]>>(() => {
    const grouped: Record<string, CampaignSublocationInstance[]> = {};

    for (const sublocation of this.campaign()?.sublocations ?? []) {
      const key = sublocation.locationInstanceId;
      const held = grouped[key] ?? [];
      grouped[key] = sublocation.isPartyAnchor ? [sublocation, ...held] : [...held, sublocation];
    }

    return grouped;
  });

  /** Where the cast stands: what the card said, or where it has just been sent. */
  readonly currentSublocationId = computed(() =>
    this.travelledTo() ?? (this.sublocationInstanceId() || null));

  /** The sublocation the cast stands in, read off the campaign. */
  private readonly currentSublocation = computed<CampaignSublocationInstance | null>(() => {
    const id = this.currentSublocationId();
    if (!id) return null;
    return this.campaign()?.sublocations?.find(s => s.instanceId === id) ?? null;
  });

  /** The location the cast stands in, read off the sublocation it stands in. */
  readonly currentLocationId = computed(() => this.currentSublocation()?.locationInstanceId ?? null);

  /** The location the cast stands in, named: the head of the line about where it is. */
  readonly currentLocationName = computed(() => this.nameOfLocation(this.currentLocationId()));

  /** The room the cast stands in, named. */
  readonly currentSublocationName = computed(() => this.currentSublocation()?.name ?? '');

  /** The location the room picked here stands in, named: what the travel button is about to do. */
  readonly pendingLocationName = computed(() =>
    this.nameOfLocation(this.pending()?.locationInstanceId ?? null));

  /** The room picked here, named. */
  readonly pendingSublocationName = computed(() => this.pending()?.name ?? '');

  /** A location's own name, read off the campaign. */
  private nameOfLocation(locationInstanceId: string | null): string {
    if (!locationInstanceId) return '';
    return this.locations().find(loc => loc.instanceId === locationInstanceId)?.name ?? '';
  }

  /** Whether the row's location is the one the cast stands in. */
  isCurrentLocation(location: CampaignLocationInstance): boolean {
    return this.currentLocationId() === location.instanceId;
  }

  /** Whether the sublocation is where the cast stands now. */
  isCurrent(sublocation: CampaignSublocationInstance): boolean {
    return this.currentSublocationId() === sublocation.instanceId;
  }

  /**
   * A card asked for by hand — and only by hand: a click that is the tail of a row's drag is not a
   * pick (see DRAG_TAIL_MS). Asking for the room already picked takes the pick back off.
   */
  onTileClick(sublocation: CampaignSublocationInstance) {
    if (Date.now() - this.rowMovedAt < DRAG_TAIL_MS) return;
    this.pick(sublocation);
  }

  /**
   * The party's own button, first in the rows: the same pick the ⚔ card in the party's own row
   * takes, and the same destination — the party's anchor — so the two ring together and the travel
   * button under the head carries whichever of them asked. A cast that may not be sent to the party
   * is not a pick here either (see `isOffered`), which the button wears in its own title.
   */
  onPartyClick() {
    const anchor = this.partyAnchor();
    if (anchor) this.pick(anchor);
  }

  /**
   * Picks the room the cast is to be sent to: on the card's own ring and on the travel button, and
   * no further. The cast is not moved here — a card picked by mistake, or picked to look at, leaves
   * it where it stands (see `travel`). A room the card may not be sent to is not a pick: the party's
   * own anchor is passed over while the card is locked (see `isOffered`), and its card says so
   * rather than answering a click.
   */
  pick(sublocation: CampaignSublocationInstance) {
    if (!this.isOffered(sublocation)) return;

    this.pending.update(current =>
      current?.instanceId === sublocation.instanceId ? null : sublocation);
    this.error.set(null);
  }

  /** Whether the room is the one picked here and not yet travelled to. */
  isPending(sublocation: CampaignSublocationInstance): boolean {
    return this.pending()?.instanceId === sublocation.instanceId;
  }

  /**
   * Whether a room picked here stands in this location: the location card that leads that row wears
   * the campaign's travel art while its pick waits, so the row the pick is in is findable as well
   * as the card that was picked (which wears the green tick — see the view).
   */
  isPendingLocation(location: CampaignLocationInstance): boolean {
    return this.pending()?.locationInstanceId === location.instanceId;
  }

  /**
   * Sends the cast to the room picked here — the party's own anchor included, where the card's own
   * lock is open (see `isOffered`) — and settles the campaign. This is the only way the cast is
   * moved, and it moves only what is picked: the markers are read off where the cast is (see
   * `currentSublocationId`), so the Here flag, the tick and the line at the head of the drawer move to
   * the room that was picked and to its location with it.
   *
   * The drawer stays open where it stands. A travel that does not land leaves the card where it is
   * and says so beside the button: the failure is the DM's to see, not something to swallow while
   * the card silently stays put.
   */
  travel() {
    const sublocation = this.pending();
    if (!sublocation || this.traveling()) return;

    // The rule is read again at the write, not only where the pick was taken: a card can be locked
    // from another screen while this drawer stands open, and a locked card is not sent to the party.
    // The pick goes with it — it was never one the drawer could carry out — and the rule takes the
    // error's place, which is where the DM is looking.
    if (!this.isOffered(sublocation)) {
      this.pending.set(null);
      this.error.set(this.partyLockNote(sublocation));
      return;
    }

    const locationInstanceId = sublocation.locationInstanceId;
    const sublocationInstanceId = sublocation.instanceId;

    this.traveling.set(true);
    this.error.set(null);

    this.http.patch(
      `${environment.apiUrl}/api/campaigns/${this.campaignId()}/casts/${this.castInstanceId()}/travel`,
      {
        locationInstanceId,
        sublocationInstanceId,
        fromSublocationInstanceId: this.currentSublocationId(),
      }
    ).subscribe({
      next: () => {
        this.traveling.set(false);
        this.travelledTo.set(sublocationInstanceId);
        this.pending.set(null);

        this.settleCampaign(locationInstanceId, sublocationInstanceId);
      },
      error: () => {
        this.traveling.set(false);
        this.error.set(`Could not move ${this.castName() || 'this cast'}. Try again.`);
      },
    });
  }

  // ── The rows ─────────────────────────────────────────────────────────────────

  /**
   * Shared set-up for every row, as the encounter builder's rows carry it (see cc-encounter-builder):
   * free-form sideways dragging — the cards follow the hand and keep their momentum — with the wheel
   * turned along the row rather than down the page. ROW_GAP between two cards lives here, so Swiper
   * keeps it while a row is dragged (see the view's own fallback for the moment before a row has its
   * instance).
   */
  private static readonly SWIPER_OPTIONS = {
    modules: [FreeMode, Mousewheel],
    slidesPerView: 'auto' as const,
    spaceBetween: ROW_GAP,
    freeMode: { enabled: true, momentum: true, momentumRatio: 1, momentumBounceRatio: 1, sticky: false },
    mousewheel: { enabled: true, forceToAxis: true, sensitivity: 1, releaseOnEdges: false },
    grabCursor: true,
    resistance: true,
    resistanceRatio: 0.85,
    speed: 300,
    observer: true,
    watchOverflow: true,
    watchSlidesProgress: true,
  };

  constructor() {
    // Keeps one Swiper alive per row: a row that enters the DOM gets its own, a row that leaves gives
    // its own up, and the deck is read too so a row that gained or lost a card is measured again. The
    // mounting is left to `afterNextRender`, so a row is never measured before its cards are laid out
    // (a Swiper that measures nought-width slides drags against the wrong geometry).
    effect(() => {
      const tracks = this.rowTracks().map(ref => ref.nativeElement);
      this.rows().length;

      afterNextRender(() => this.mountRows(tracks), { injector: this.injector });
    });
  }

  /** One Swiper per row, and none left over from the rows that have gone. */
  private mountRows(tracks: HTMLElement[]) {
    const drawn = new Set<string>();

    for (const track of tracks) {
      const rowId = track.dataset['rowId'] ?? '';
      if (!rowId) continue;
      drawn.add(rowId);

      const running = this.swipers.get(rowId);

      if (running) {
        // The row's own element, with the row it belongs to: it only gained or lost a card — or
        // moved down the stack, the cast having been sent to this location — so it is measured
        // again rather than mounted afresh, and its listeners stay where they are.
        if (running.el === track) {
          running.update();
          continue;
        }
        this.unmountRow(rowId);
      }

      this.swipers.set(rowId, this.mountRow(track));
    }

    for (const rowId of [...this.swipers.keys()]) {
      if (!drawn.has(rowId)) this.unmountRow(rowId);
    }
  }

  /** One row's own Swiper, hearing every time that row moves under the hand (see DRAG_TAIL_MS). */
  private mountRow(track: HTMLElement): Swiper {
    const swiper = new Swiper(track, CcCastTravelPickerComponent.SWIPER_OPTIONS);

    // The row says every time it moves under the hand: the click the browser sends when that
    // gesture ends is the drag's own tail rather than a pick (see DRAG_TAIL_MS).
    swiper.on('touchMove', this.rowMoved);
    swiper.on('sliderMove', this.rowMoved);

    return swiper;
  }

  private unmountRow(rowId: string) {
    const swiper = this.swipers.get(rowId);
    if (!swiper) return;

    swiper.destroy(true, true);
    this.swipers.delete(rowId);
  }

  ngOnDestroy() {
    for (const rowId of [...this.swipers.keys()]) this.unmountRow(rowId);

    // The drawer is shutting. A cast left in another location is handed to the realm row, which
    // shows the place it now stands in (see `CcCardNavigationComponent.followCastTravel`). Only a
    // *location* that changed is worth following: a move inside one location leaves the row reading
    // the place it was already reading.
    const sublocationId = this.travelledTo();
    const locationId = this.currentLocationId();
    if (!sublocationId || !locationId || locationId === this.openedLocationId()) return;

    this.v2Shell.publishCastTraveledFromDrawer({
      campaignId: this.campaignId(),
      locationInstanceId: locationId,
      sublocationInstanceId: sublocationId,
    });
  }

  /**
   * Moves the campaign's own copy of the card to where it went — in whichever shell holds that
   * campaign — and tells the v2 shell, so a row that keeps its own collection of cards (the realm
   * row does) re-reads and puts the card where it now stands.
   */
  private settleCampaign(locationInstanceId: string, sublocationInstanceId: string) {
    const id = this.campaignId();
    const castInstanceId = this.castInstanceId();

    const move = (campaign: CampaignDetail | null): CampaignDetail | null =>
      campaign && campaign.id === id
        ? {
            ...campaign,
            casts: (campaign.casts ?? []).map(cast =>
              cast.instanceId === castInstanceId
                ? { ...cast, locationInstanceId, sublocationInstanceId }
                : cast),
          }
        : campaign;

    this.v2Shell.updateCampaign(move);
    this.shell.updateCampaign(move);
    this.v2Shell.publishCardsChanged(id);
  }
}
