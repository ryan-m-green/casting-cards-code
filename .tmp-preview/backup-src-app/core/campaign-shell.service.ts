import { Injectable, signal, computed, TemplateRef } from '@angular/core';
import { Subject } from 'rxjs';
import { CampaignDetail } from '../shared/models/campaign.model';
import { VoidTitleContext } from '../shared/models/void-title.model';
import { PlayerCardWithDetails, PlayerCardSecret } from '../shared/models/player-card.model';
import { CastTravelTarget, CastTraveledTo } from '../shared/models/cast-travel.model';
import { CardLinkResult, CardLinkTarget } from '../shared/models/card-link.model';
import { AmbianceDomain } from '../shared/models/soundtrack.model';
import { CampaignCastInstance } from '../shared/models/cast.model';
import { InventoryItem } from '../shared/models/inventory-item.model';
import { EncounterPickerTarget, EncounterGroupPicked, CombatantDetailsTarget, EncounterPlaces } from './encounter.service';

export interface AmbianceDrawerRequest {
  ambiance: AmbianceDomain | null;
  campaignId: string;
  portalColor: string;
  seedTrackIds?: string[];
  suggestedTitle?: string;
}

export interface FieldJournalCardTarget {
  cardKey: string;
  combatantId: string;
  castInstanceId: string | null;
  sourceCastId: string | null;
  cast: CampaignCastInstance;
  notes: string;
}

export interface FieldJournalEntryDrawerRequest {
  campaignId: string;
  portalColor: string;
  encounterId: string;
  encounterName: string;
  cards: FieldJournalCardTarget[];
  index: number;
}

@Injectable({ providedIn: 'root' })
export class CampaignShellService {
  title = signal('');
  titleContext = signal<VoidTitleContext | null>(null);
  voidTitleTopMargin = signal('10px');
  campaign = signal<CampaignDetail | null>(null);
  
  isDm = computed(() => {
    const camp = this.campaign();
    if (!camp) return false;
    return this._isDm;
  });
  
  private _isDm = false;

  /**
   * Whether this viewer plays at this table rather than running it — the counterpart of `isDm`,
   * read from the campaign at hand and never from the global role. A DM can sit at another DM's
   * table as a player (see the campaign shell's loadCampaign), and on that seat the players' own notices
   * — the radial nav's light, a card's spotlight — are theirs to see (see GridAreaChangeService).
   */
  isPlayer = computed(() => !this.isDm());
  
  openChronicleWithSearch = new Subject<string>();
  openPartyGold = new Subject<void>();
  openPlayerSecrets = new Subject<{ member: PlayerCardWithDetails; campaignId: string; portalColor: string }>();
  openShopPurchase = new Subject<{ item: any; sublocationInstanceId: string }>();
  shopPurchaseComplete = new Subject<any>();
  partyGoldAwarded = new Subject<{ currency: string; playerAwards: { playerUserId: string; amount: number }[] }>();
  openAmbianceEditor = new Subject<AmbianceDrawerRequest>();
  ambianceChanged = new Subject<void>();

  openMyCharacterInfo = new Subject<{ campaignId: string; portalColor: string }>();
  openMyCharacterMotivations = new Subject<{ campaignId: string; portalColor: string }>();
  playerCharacterUpdated = new Subject<void>();

  openPlayerInventory = new Subject<{ campaignId: string; portalColor: string; item: InventoryItem | null }>();

  inventoryChanged = new Subject<void>();

  openFieldJournalEntry = new Subject<FieldJournalEntryDrawerRequest>();

  openSecretDetail = new Subject<{ secret: PlayerCardSecret; campaignId: string; playerCardId: string; portalColor: string; mode: 'player' | 'dm' }>();
  secretsChanged = new Subject<void>();

  openPlayerSecretCreate = new Subject<{ campaignId: string; playerCardId: string; portalColor: string }>();

  ambianceSaved = new Subject<void>();

  openEncounterGroupPicker = new Subject<{ campaignId: string }>();

  openConditionLibrary = new Subject<{ campaignId: string }>();

  openFactionPicker = new Subject<{ campaignId: string }>();

  openFactionCastPicker = new Subject<{ campaignId: string; factionInstanceId: string; factionName: string }>();

  factionCastPickerTarget = signal<{ campaignId: string; factionInstanceId: string; factionName: string } | null>(null);

  factionsChanged = new Subject<string>();

  openLocationPicker = new Subject<{ campaignId: string }>();

  locationPickerTarget = signal<{ campaignId: string } | null>(null);

  openSublocationPicker = new Subject<{ campaignId: string; locationInstanceId: string; locationName: string }>();

  sublocationPickerTarget = signal<{ campaignId: string; locationInstanceId: string; locationName: string } | null>(null);

  openCastPicker = new Subject<{
    campaignId: string;
    locationInstanceId: string;
    sublocationInstanceId: string;
    sublocationName: string;
  }>();

  castPickerTarget = signal<{
    campaignId: string;
    locationInstanceId: string;
    sublocationInstanceId: string;
    sublocationName: string;
  } | null>(null);

  openCastTravelPicker = new Subject<CastTravelTarget>();

  castTravelTarget = signal<CastTravelTarget | null>(null);

  cardsChanged = new Subject<string>();

  openCardLinkPicker = new Subject<CardLinkTarget>();

  cardLinkTarget = signal<CardLinkTarget | null>(null);

  cardLinksChanged = new Subject<CardLinkResult>();

  encounterPickerTarget = signal<EncounterPickerTarget>({ mode: 'new' });

  encounterGroupPicked = new Subject<EncounterGroupPicked>();

  openCombatantDetails = new Subject<{ campaignId: string }>();

  combatantDetailsTarget = signal<CombatantDetailsTarget | null>(null);

  encounterPlaces = signal<EncounterPlaces | null>(null);

  encounterChanged = new Subject<string>();

  openDrawerRequest = new Subject<{ title: string; template: TemplateRef<any>; context: any }>();
  
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
  
  setCampaign(c: CampaignDetail) { 
    this.campaign.set(c); 
  }
  
  updateCampaign(updater: (c: CampaignDetail | null) => CampaignDetail | null) {
    this.campaign.update(updater);
  }
  
  setIsDm(isDm: boolean) {
    this._isDm = isDm;
  }
  
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

  openMyCharacterInfoDrawer(campaignId: string, portalColor: string) {
    this.openMyCharacterInfo.next({ campaignId, portalColor });
  }

  openMyCharacterMotivationsDrawer(campaignId: string, portalColor: string) {
    this.openMyCharacterMotivations.next({ campaignId, portalColor });
  }

  publishPlayerCharacterUpdated() {
    this.playerCharacterUpdated.next();
  }

  openPlayerInventoryDrawer(campaignId: string, portalColor: string, item: InventoryItem | null) {
    this.openPlayerInventory.next({ campaignId, portalColor, item });
  }

  publishInventoryChanged() {
    this.inventoryChanged.next();
  }

  openFieldJournalEntryDrawer(request: FieldJournalEntryDrawerRequest) {
    this.openFieldJournalEntry.next(request);
  }

  openSecretDetailDrawer(secret: PlayerCardSecret, campaignId: string, playerCardId: string, portalColor: string, mode: 'player' | 'dm') {
    this.openSecretDetail.next({ secret, campaignId, playerCardId, portalColor, mode });
  }

  openPlayerSecretCreateDrawer(campaignId: string, playerCardId: string, portalColor: string) {
    this.openPlayerSecretCreate.next({ campaignId, playerCardId, portalColor });
  }

  publishSecretsChanged() {
    this.secretsChanged.next();
  }
  
  openShopPurchaseDrawer(item: any, sublocationInstanceId: string) {
    this.openShopPurchase.next({ item, sublocationInstanceId });
  }

  openAmbianceEditorDrawer(ambiance: AmbianceDomain, campaignId: string, portalColor: string) {
    this.openAmbianceEditor.next({ ambiance, campaignId, portalColor });
  }

  openAmbianceCreatorDrawer(
    seedTrackIds: string[],
    campaignId: string,
    portalColor: string,
    suggestedTitle: string
  ) {
    this.openAmbianceEditor.next({ ambiance: null, campaignId, portalColor, seedTrackIds, suggestedTitle });
  }

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

  openConditionLibraryDrawer(campaignId: string) {
    this.openConditionLibrary.next({ campaignId });
  }

  openFactionPickerDrawer(campaignId: string) {
    this.openFactionPicker.next({ campaignId });
  }

  openFactionCastPickerDrawer(campaignId: string, factionInstanceId: string, factionName: string) {
    const target = { campaignId, factionInstanceId, factionName };
    this.factionCastPickerTarget.set(target);
    this.openFactionCastPicker.next(target);
  }

  publishFactionsChanged(campaignId: string) {
    this.factionsChanged.next(campaignId);
  }

  /**
   * The faction symbols a cast card wears: one for every faction of this viewer's own row that the
   * cast is a member of (see cc-card-faction-navigation for whose row is whose — the GM's, or the
   * party's). A cast tied to a faction, whether the tie was made by the GM or by the party, wears
   * that faction's symbol on its face the way the v1 cards do (see the faction association on a
   * cast's own detail page). It is read through the campaign signal, so a card drawn again when a
   * membership lands takes the symbol on with it.
   */
  factionSymbolsForCast(castInstanceId: string): { factionInstanceId: string; symbolPath: string }[] {
    const factions = this.campaign()?.factions ?? [];
    return factions
      .filter(faction => !!faction.symbolPath && (faction.castInstanceIds ?? []).includes(castInstanceId))
      .map(faction => ({ factionInstanceId: faction.factionInstanceId, symbolPath: faction.symbolPath! }));
  }

  openLocationPickerDrawer(campaignId: string) {
    const target = { campaignId };
    this.locationPickerTarget.set(target);
    this.openLocationPicker.next(target);
  }

  openSublocationPickerDrawer(campaignId: string, locationInstanceId: string, locationName: string) {
    const target = { campaignId, locationInstanceId, locationName };
    this.sublocationPickerTarget.set(target);
    this.openSublocationPicker.next(target);
  }

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

  openCastTravelDrawer(target: CastTravelTarget) {
    this.castTravelTarget.set(target);
    this.openCastTravelPicker.next(target);
  }

  castTraveledFromDrawer = new Subject<CastTraveledTo>();

  publishCastTraveledFromDrawer(landing: CastTraveledTo) {
    this.castTraveledFromDrawer.next(landing);
  }

  publishCardsChanged(campaignId: string) {
    this.cardsChanged.next(campaignId);
  }

  openCardLinkDrawer(target: CardLinkTarget) {
    this.cardLinkTarget.set(target);
    this.openCardLinkPicker.next(target);
  }

  publishCardLinksChanged(result: CardLinkResult) {
    this.cardLinksChanged.next(result);
  }

  clearCardLinkTarget() {
    this.cardLinkTarget.set(null);
  }

  openCombatantDetailsDrawer(target: CombatantDetailsTarget) {
    this.combatantDetailsTarget.set(target);
    this.openCombatantDetails.next({ campaignId: target.campaignId });
  }

  publishEncounterChanged(encounterId: string) {
    this.encounterChanged.next(encounterId);
  }
}