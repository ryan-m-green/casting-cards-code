import { Injectable, signal, computed, TemplateRef } from '@angular/core';
import { Subject } from 'rxjs';
import { CampaignDetail } from '../shared/models/campaign.model';
import { VoidTitleContext } from '../shared/components/void-title-segments/void-title-segments.component';
import { PlayerCardWithDetails } from '../shared/models/player-card.model';
import { CastTravelTarget, CastTraveledTo } from '../shared/models/cast-travel.model';
import { QuicknoteAssociationTarget } from '../shared/models/quicknote-queue.model';
import { AmbianceDomain } from '../shared/models/soundtrack.model';
import { EncounterPickerTarget, EncounterGroupPicked, CombatantDetailsTarget, EncounterPlaces } from './encounter.service';

/**
 * What the shell is asked to put in the right drawer for an ambiance: an existing one to edit (the
 * ambiance itself), or a brand new one built out of the tracks the library panel has ticked
 * (`seedTrackIds`, with the name the panel suggests for it). The two are the same drawer — see
 * cc-soundtrack-content, which edits the one it is handed and creates the one it is not.
 */
export interface AmbianceDrawerRequest {
  ambiance: AmbianceDomain | null;
  campaignId: string;
  portalColor: string;
  seedTrackIds?: string[];
  suggestedTitle?: string;
}

@Injectable({ providedIn: 'root' })
export class V2CampaignShellService {
  // ── Core State ───────────────────────────────────────────────────────────────
  title = signal('');
  titleContext = signal<VoidTitleContext | null>(null);
  voidTitleTopMargin = signal('10px');
  campaign = signal<CampaignDetail | null>(null);
  
  // ── Role Detection ────────────────────────────────────────────────────────────
  // Computed property to determine if current user is DM
  isDm = computed(() => {
    const camp = this.campaign();
    if (!camp) return false;
    // This will be set from the component based on auth service
    return this._isDm;
  });
  
  private _isDm = false;
  
  // ── Event Streams ─────────────────────────────────────────────────────────────
  openChronicleWithSearch = new Subject<string>();
  openPartyGold = new Subject<void>();
  openPlayerSecrets = new Subject<{ member: PlayerCardWithDetails; campaignId: string; portalColor: string }>();
  openShopPurchase = new Subject<{ item: any; sublocationInstanceId: string }>();
  shopPurchaseComplete = new Subject<any>();
  partyGoldAwarded = new Subject<{ currency: string; playerAwards: { playerUserId: string; amount: number }[] }>();
  openAmbianceEditor = new Subject<AmbianceDrawerRequest>();
  ambianceChanged = new Subject<void>();

  /**
   * An ambiance was written — created or saved — from the drawer. The library panel listens for it
   * and puts its ticks away: the tracks it had gathered for that card have been written into it, so
   * the ticks are spent and the ＋ Playlist button goes back to standing bare (see cc-soundtracks).
   *
   * This is not `ambianceChanged`, which says the panel's list is out of date and is raised by a
   * deletion as much as by a save: a card whose tracks are being gathered is only spent by a write.
   */
  ambianceSaved = new Subject<void>();

  /** Asks the shell to open the right drawer with the encounter group picker. */
  openEncounterGroupPicker = new Subject<{ campaignId: string }>();

  /**
   * Asks the shell to open the right drawer with the faction picker: the library's
   * faction cards to add to the campaign, or the form for a brand new one.
   */
  openFactionPicker = new Subject<{ campaignId: string }>();

  /**
   * Asks the shell to open the right drawer with the faction cast picker: the campaign's
   * own cast cards, to make them members of one faction.
   */
  openFactionCastPicker = new Subject<{ campaignId: string; factionInstanceId: string; factionName: string }>();

  /** What that picker is adding to, while its drawer stands. */
  factionCastPickerTarget = signal<{ campaignId: string; factionInstanceId: string; factionName: string } | null>(null);

  /**
   * Raised when a campaign's factions have changed — cards added from the picker (its
   * library tab or its form), one taken back out from the faction row, or the cast a
   * faction holds changing (a member added from the cast picker, or taken off from the
   * faction row's own card). The shell re-reads the campaign and the faction row re-reads
   * its own cards, so both show the campaign as it stands.
   */
  factionsChanged = new Subject<string>();

  /**
   * Asks the shell to open the right drawer with the location picker: the library's location
   * cards to add to the campaign, or the form for a brand new one.
   */
  openLocationPicker = new Subject<{ campaignId: string }>();

  /** What that picker is adding to, while its drawer stands. */
  locationPickerTarget = signal<{ campaignId: string } | null>(null);

  /**
   * Asks the shell to open the right drawer with the sublocation picker: the library's
   * sublocation cards to add under one location instance, or the form for a brand new one.
   */
  openSublocationPicker = new Subject<{ campaignId: string; locationInstanceId: string; locationName: string }>();

  /** What that picker is adding to, while its drawer stands. */
  sublocationPickerTarget = signal<{ campaignId: string; locationInstanceId: string; locationName: string } | null>(null);

  /**
   * Asks the shell to open the right drawer with the cast picker: the library's cast cards
   * to add to one sublocation instance, or the form for a brand new one.
   */
  openCastPicker = new Subject<{
    campaignId: string;
    locationInstanceId: string;
    sublocationInstanceId: string;
    sublocationName: string;
  }>();

  /** What that picker is adding to, while its drawer stands. */
  castPickerTarget = signal<{
    campaignId: string;
    locationInstanceId: string;
    sublocationInstanceId: string;
    sublocationName: string;
  } | null>(null);

  /**
   * Asks the shell to open the right drawer with the travel picker: the campaign's locations as
   * simple location cards, then the sublocations of the one that is picked, to move a cast card
   * (see `cc-cast-travel`, which raises this from the card's own travel button).
   */
  openCastTravelPicker = new Subject<CastTravelTarget>();

  /** The card the travel drawer is moving, while its drawer stands. */
  castTravelTarget = signal<CastTravelTarget | null>(null);

  /**
   * Raised when a campaign's cards have changed — a sublocation or a cast added from the
   * realm row's pickers (their library tab or their form). The shell re-reads the campaign
   * and the realm row re-reads its own cards, so both show the campaign as it stands.
   */
  cardsChanged = new Subject<string>();

  /**
   * Asks the shell to open the right drawer with the card association picker: this campaign's own
   * locations, sublocations, casts and factions, to link to one queued quicknote (see
   * `cc-quicknotes`, which raises this from a note's own link button).
   */
  openQuicknoteAssociations = new Subject<QuicknoteAssociationTarget>();

  /** The queued note being linked, while its drawer stands. */
  quicknoteAssociationTarget = signal<QuicknoteAssociationTarget | null>(null);

  /**
   * Raised when a queued note's links changed, so the quicknotes area re-reads its queue: the note
   * wears its links as hashtags, and the drawer hands them over as they are picked rather than as
   * it shuts, so the line behind it keeps step with what the DM or player is choosing.
   */
  quicknotesChanged = new Subject<string>();

  /**
   * What the picker's next pick is for: a brand new group, or cards added to an
   * existing group of the encounter being edited.
   */
  encounterPickerTarget = signal<EncounterPickerTarget>({ mode: 'new' });

  /** The cards of a group the picker finished building, for the builder to save. */
  encounterGroupPicked = new Subject<EncounterGroupPicked>();

  /** Asks the shell to open the right drawer with a combatant's detail panels. */
  openCombatantDetails = new Subject<{ campaignId: string }>();

  /**
   * What those panels are showing: one place on the initiative ring, and the card
   * of it they opened on.
   */
  combatantDetailsTarget = signal<CombatantDetailsTarget | null>(null);

  /**
   * How the encounter's ring stands while the group picker is open, so the drawer can
   * show the same arithmetic the editor does. Set when the picker is opened.
   */
  encounterPlaces = signal<EncounterPlaces | null>(null);

  /**
   * Raised when the panels write a combatant's hit points, so the encounter on
   * screen — the ring, its cards — reloads with the numbers the DM just set.
   */
  encounterChanged = new Subject<string>();

  // Drawer state
  openDrawerRequest = new Subject<{ title: string; template: TemplateRef<any>; context: any }>();
  
  // ── Title Management ───────────────────────────────────────────────────────────
  setTitle(title: string, topMargin = '10px') {
    this.title.set(title);
    this.titleContext.set(null);
    this.voidTitleTopMargin.set(topMargin);
  }
  
  setTitleContext(context: VoidTitleContext, topMargin = '10px') {
    this.title.set('');
    this.titleContext.set(context);
    this.voidTitleTopMargin.set(topMargin);
  }
  
  // ── Campaign Management ───────────────────────────────────────────────────────
  setCampaign(c: CampaignDetail) { 
    this.campaign.set(c); 
  }
  
  updateCampaign(updater: (c: CampaignDetail | null) => CampaignDetail | null) {
    this.campaign.update(updater);
  }
  
  // ── Role Management ────────────────────────────────────────────────────────────
  setIsDm(isDm: boolean) {
    this._isDm = isDm;
  }
  
  // ── Drawer Management ──────────────────────────────────────────────────────────
  openChronicleDrawerWithSearch(query: string) {
    this.openChronicleWithSearch.next(query);
  }
  
  openDrawerWithContent(title: string, template: TemplateRef<any>, context: any) {
    this.openDrawerRequest.next({ title, template, context });
  }

  openPlayerSecretsDrawer(member: PlayerCardWithDetails, campaignId: string, portalColor: string) {
    this.openPlayerSecrets.next({ member, campaignId, portalColor });
  }

  openPartyGoldDrawer() {
    this.openPartyGold.next();
  }
  
  openShopPurchaseDrawer(item: any, sublocationInstanceId: string) {
    this.openShopPurchase.next({ item, sublocationInstanceId });
  }

  openAmbianceEditorDrawer(ambiance: AmbianceDomain, campaignId: string, portalColor: string) {
    this.openAmbianceEditor.next({ ambiance, campaignId, portalColor });
  }

  /**
   * The library panel's "＋ Ambiance" asked for the drawer with a new ambiance on it: the tracks it
   * has ticked stand as the new card's items, and the panel suggests the name it would have given
   * the card itself. Nothing is written until the drawer's own Save is pressed.
   */
  openAmbianceCreatorDrawer(
    seedTrackIds: string[],
    campaignId: string,
    portalColor: string,
    suggestedTitle: string
  ) {
    this.openAmbianceEditor.next({ ambiance: null, campaignId, portalColor, seedTrackIds, suggestedTitle });
  }

  // ── Encounter builder ──────────────────────────────────────────────────────────
  /**
   * Remembers what the picker's next pick is for (a new group, or cards added to
   * one of the edited encounter's groups) and asks the shell to open the drawer.
   * The ring's places come along, so the drawer shows where the encounter stands.
   */
  openEncounterGroupPickerDrawer(
    campaignId: string,
    target: EncounterPickerTarget = { mode: 'new' },
    places: EncounterPlaces | null = null
  ) {
    this.encounterPickerTarget.set(target);
    this.encounterPlaces.set(places);
    this.openEncounterGroupPicker.next({ campaignId });
  }

  publishEncounterGroupPicked(group: EncounterGroupPicked) {
    this.encounterGroupPicked.next(group);
  }

  // ── Faction row ────────────────────────────────────────────────────────────────
  /** Asks the shell to open the right drawer with the faction picker. */
  openFactionPickerDrawer(campaignId: string) {
    this.openFactionPicker.next({ campaignId });
  }

  /**
   * The faction row's ＋ asked for the cast picker: remembers the faction the picks go into
   * and asks the shell to open the drawer.
   */
  openFactionCastPickerDrawer(campaignId: string, factionInstanceId: string, factionName: string) {
    const target = { campaignId, factionInstanceId, factionName };
    this.factionCastPickerTarget.set(target);
    this.openFactionCastPicker.next(target);
  }

  /** A campaign's factions changed — added or removed: both are to be re-read. */
  publishFactionsChanged(campaignId: string) {
    this.factionsChanged.next(campaignId);
  }

  // ── Realm row (locations → sublocations → casts) ───────────────────────────────
  /**
   * The realm row's ＋ asked for the location picker: remembers the campaign the picks go into
   * and asks the shell to open the drawer.
   */
  openLocationPickerDrawer(campaignId: string) {
    const target = { campaignId };
    this.locationPickerTarget.set(target);
    this.openLocationPicker.next(target);
  }

  /**
   * The realm row's ＋ asked for the sublocation picker: remembers the location the picks go
   * under and asks the shell to open the drawer.
   */
  openSublocationPickerDrawer(campaignId: string, locationInstanceId: string, locationName: string) {
    const target = { campaignId, locationInstanceId, locationName };
    this.sublocationPickerTarget.set(target);
    this.openSublocationPicker.next(target);
  }

  /**
   * The realm row's ＋ asked for the cast picker: remembers the sublocation the picks go into
   * (and the location it stands in, which the write carries) and asks the shell to open the
   * drawer.
   */
  openCastPickerDrawer(
    campaignId: string,
    locationInstanceId: string,
    sublocationInstanceId: string,
    sublocationName: string
  ) {
    const target = { campaignId, locationInstanceId, sublocationInstanceId, sublocationName };
    this.castPickerTarget.set(target);
    this.openCastPicker.next(target);
  }

  /**
   * A card's travel button asked for the travel drawer: remembers the card to be moved and asks
   * the shell to open it. The two shells are never mounted at once, so the card raises this on
   * both (see `cc-cast-travel`) and the shell that is on screen answers it.
   */
  openCastTravelDrawer(target: CastTravelTarget) {
    this.castTravelTarget.set(target);
    this.openCastTravelPicker.next(target);
  }

  /**
   * Raised when the travel drawer shut with the card somewhere else in the campaign: the place the
   * cast now stands in, for the realm row to show (see `cc-card-navigation`). The drawer only says
   * so as it shuts, rather than on every pick, so the row the DM is looking past does not shuffle
   * about behind a drawer they are still working in.
   */
  castTraveledFromDrawer = new Subject<CastTraveledTo>();

  publishCastTraveledFromDrawer(landing: CastTraveledTo) {
    this.castTraveledFromDrawer.next(landing);
  }

  /** A campaign's cards changed — sublocations or casts added: both are to be re-read. */
  publishCardsChanged(campaignId: string) {
    this.cardsChanged.next(campaignId);
  }

  /** A note's link button asked for the association drawer: remembers the note and opens it. */
  openQuicknoteAssociationsDrawer(target: QuicknoteAssociationTarget) {
    this.quicknoteAssociationTarget.set(target);
    this.openQuicknoteAssociations.next(target);
  }

  /** A note's links were written: the area behind the drawer is to re-read the note. */
  publishQuicknotesChanged(campaignId: string) {
    this.quicknotesChanged.next(campaignId);
  }

  /** The association drawer shut: nothing is being linked any more. */
  clearQuicknoteAssociationTarget() {
    this.quicknoteAssociationTarget.set(null);
  }

  /** Remembers the card the detail panels are for and asks the shell to open them. */
  openCombatantDetailsDrawer(target: CombatantDetailsTarget) {
    this.combatantDetailsTarget.set(target);
    this.openCombatantDetails.next({ campaignId: target.campaignId });
  }

  /** The panels wrote hit points: the encounter they belong to is to be reloaded. */
  publishEncounterChanged(encounterId: string) {
    this.encounterChanged.next(encounterId);
  }
}