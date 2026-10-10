import { Injectable } from '@angular/core';
import { signal } from '@angular/core';
import { Subject, Observable, Subscription } from 'rxjs';
import * as signalR from '@microsoft/signalr';
import { environment } from '../../../environments/environment';
import { AuthService } from '../auth/auth.service';
import {
  SecretRevealedEvent,
  SecretResealedEvent,
  SecretCreatedEvent,
  SecretDeletedEvent,
  CardVisibilityChangedEvent,
  BulkCardVisibilityChangedEvent,
  SecretDeliveredEvent,
  SecretSharedEvent,
  PlayerSecretCreatedEvent,
  PlayerSecretChangedEvent,
  PlayerSecretDeletedEvent,
} from '../../shared/models/secret.model';
import {
  TimeCursorMovedEvent,
  PlayerNotesUpdatedEvent,
  DmNotesUpdatedEvent,
  DayAdvancedEvent,
  TimeOfDay,
} from '../../shared/models/time-of-day.model';
import { GoldAwardedEvent, ConditionRemovedEvent, ConditionAssignedEvent, PlayerTrait } from '../../shared/models/player-card.model';
import { CampaignPlayer } from '../../shared/models/campaign.model';
import { CampaignLocationInstance } from '../../shared/models/location.model';
import { CampaignSublocationInstance } from '../../shared/models/sublocation.model';
import { CampaignCastInstance } from '../../shared/models/cast.model';
import { CampaignFactionInstance } from '../../shared/models/faction.model';
import { AmbianceDomain } from '../../shared/models/soundtrack.model';

export interface PlayerJoinedEvent {
  campaignId: string;
  player: CampaignPlayer;
}

export interface PlayerRemovedEvent {
  campaignId: string;
}

export interface CastTraveledEvent {
  campaignId: string;
  castInstanceId: string;
  fromSublocationInstanceId: string | null;
  toLocationInstanceId: string;
  toSublocationInstanceId: string;
  traveledToTheParty: boolean;
  isVisible: boolean;
}

/**
 * An ambiance of the campaign was written, or deleted (see the API's AmbiancesController).
 *
 * The ambiance rides along as the campaign now holds it, so a panel takes the change on from what
 * it is handed rather than reading the list back — the same way a card's own write travels (see
 * CastInstanceUpdatedEvent). An event without the ambiance on it is a deletion, and the id is what
 * says which one to drop.
 */
export interface AmbianceChangedEvent {
  campaignId: string;
  ambianceId: string;
  ambiance?: AmbianceDomain | null;
}

export interface FactionRemovedEvent {
  campaignId: string;
  factionInstanceId: string;
}

export interface ShopItemDeletedEvent {
  campaignId: string;
  sublocationInstanceId: string;
  shopItemId: string;
}

export interface ShopItemAddedEvent {
  campaignId: string;
  sublocationInstanceId: string;
  shopItem: {
    id: string;
    name: string;
    priceAmount: number;
    priceCurrencyType: string;
    description: string;
    isScratchedOff: boolean;
  };
}

export interface FactionLockedEvent {
  campaignId: string;
  factionInstanceId: string;
}

export interface StorylineEventUpdatedEvent {
  campaignId: string;
  eventId: string;
  sceneType: 'campaign-event' | 'campaign-handout';
  title: string;
  body: string;
  imageUrl: string | null;
}

export interface SessionDeletedEvent {
  sessionId: string;
}

export interface SessionEndedEvent {
  campaignId: string;
  archivedSessionId: string;
  timestamp: number;
}

export interface SessionStartedEvent {
  campaignId: string;
  sessionId: string;
  sessionNumber: number;
  startDay: number;
  timestamp: number;
}

export interface SessionCancelledEvent {
  campaignId: string;
  timestamp: number;
}

export interface SubscriptionLockLevelChangedEvent {
  userId: string;
  lockLevel: string;
}

export interface InventoryItemUsedEvent {
  campaignId: string;
  playerUserId: string;
  inventoryItemId: string;
}

export interface InventoryItemPurchasedEvent {
  campaignId: string;
  playerUserId: string;
  itemName: string;
  currencyBalances: { currency: string; amount: number }[];
}

/**
 * A grid area's button should call attention (see GridAreaChangeService). The area is named as the
 * grid names it — 'middle-middle', 'top-right' and so on — and `userId`, when present, aims the
 * notice at that one user's screen whatever their role; when null it is for the players at large.
 */
export interface GridAreaNoticeEvent {
  campaignId: string;
  gridArea: string;
  userId: string | null;
}

/**
 * One client saying which of its components handled one event. A component names itself when it
 * subscribes (see CampaignHubService.on), and the service reports the names it delivered to —
 * gated to one report per event per 5-second window, so a drag's burst does not flood the hub.
 */
export interface ReceivedComponentAck {
  eventName: string;
  campaignId: string | null;
  components: string[];
}

/**
 * The payload each hub event carries, keyed by the name the hub sends it under. It types the
 * handler a component registers through `on()`, exactly as the `x$` observable it replaces did.
 */
export interface HubEventPayloads {
  PlayerSecretRevealed: SecretRevealedEvent | null;
  SecretCreated: SecretCreatedEvent | null;
  PlayerSecretCreated: PlayerSecretCreatedEvent | null;
  PlayerSecretChanged: PlayerSecretChangedEvent | null;
  SecretDeleted: SecretDeletedEvent | null;
  SecretDelivered: SecretDeliveredEvent | null;
  SecretResealed: SecretResealedEvent | null;
  CardVisibilityChanged: CardVisibilityChangedEvent | null;
  BulkCardVisibilityChanged: BulkCardVisibilityChangedEvent | null;
  NoteUpdated: { entityType: string; instanceId: string; campaignId: string } | null;
  QuickNoteQueued: { campaignId: string } | null;
  TimeCursorMoved: TimeCursorMovedEvent | null;
  PlayerNotesUpdated: PlayerNotesUpdatedEvent | null;
  DmNotesUpdated: DmNotesUpdatedEvent | null;
  TimeOfDayUpdated: TimeOfDay | null;
  DayAdvanced: DayAdvancedEvent | null;
  GoldAwarded: GoldAwardedEvent[];
  ConditionRemoved: ConditionRemovedEvent | null;
  ConditionAssigned: ConditionAssignedEvent | null;
  PlayerCardTraitsChanged: PlayerCardTraitsChangedEvent | null;
  SecretShared: SecretSharedEvent | null;
  PlayerSecretDeleted: PlayerSecretDeletedEvent | null;
  PlayerJoined: PlayerJoinedEvent | null;
  PlayerRemoved: PlayerRemovedEvent | null;
  CastTraveled: CastTraveledEvent | null;
  AmbianceChanged: AmbianceChangedEvent | null;
  FactionRemoved: FactionRemovedEvent | null;
  FactionLocked: FactionLockedEvent | null;
  ShopItemUpdated: ShopItemUpdatedEvent | null;
  ShopItemScratchToggled: ShopItemScratchToggledEvent | null;
  ShopItemDeleted: ShopItemDeletedEvent | null;
  ShopItemAdded: ShopItemAddedEvent | null;
  CastInstanceUpdated: CastInstanceUpdatedEvent | null;
  LocationInstanceUpdated: LocationInstanceUpdatedEvent | null;
  SublocationInstanceUpdated: SublocationInstanceUpdatedEvent | null;
  FactionInstanceUpdated: FactionInstanceUpdatedEvent | null;
  FactionSymbolAssigned: FactionSymbolAssignedEvent | null;
  FactionPartyCastChanged: FactionPartyCastChangedEvent | null;
  StorylineEventUpdated: StorylineEventUpdatedEvent | null;
  CampaignRulesChanged: { campaignId: string } | null;
  CampaignNavChanged: { campaignId: string } | null;
  SessionDeleted: SessionDeletedEvent | null;
  SessionEnded: SessionEndedEvent | null;
  SessionCancelled: SessionCancelledEvent | null;
  SoundtrackTriggered: SoundtrackTriggeredEvent | null;
  SubscriptionLockLevelChanged: SubscriptionLockLevelChangedEvent | null;
  InventoryItemUsed: InventoryItemUsedEvent | null;
  InventoryItemPurchased: InventoryItemPurchasedEvent | null;
  EncounterUpdated: EncounterUpdatedEvent | null;
  EncounterTurnChanged: EncounterTurnChangedEvent | null;
  EncounterCombatantUpdated: EncounterCombatantUpdatedEvent | null;
  TrophyAwarded: TrophyAwardedEvent | null;
  EncounterEnded: EncounterEndedEvent | null;
  PlayerCastNoteUpdated: PlayerCastNoteUpdatedEvent | null;
  FieldJournalUpdated: FieldJournalUpdatedEvent | null;
  SoundtrackVolumeChanged: SoundtrackVolumeChangedEvent | null;
  GridAreaNotice: GridAreaNoticeEvent | null;
}

export interface EncounterUpdatedEvent {
  campaignId: string;
  encounterId: string;
}

export interface EncounterTurnChangedEvent {
  campaignId: string;
  encounterId: string;
  currentSpotId: string | null;
  roundNumber: number;
}

export interface EncounterCombatantUpdatedEvent {
  campaignId: string;
  encounterId: string;
  combatantId: string;
}

export interface TrophyAwardedEvent {
  campaignId: string;
  encounterId: string;
  combatantId: string;
}

export interface EncounterEndedEvent {
  campaignId: string;
  encounterId: string;
  startedAtTicks: number;
}

export interface PlayerCastNoteUpdatedEvent {
  campaignId: string;
  cardKey: string;
}

export interface FieldJournalUpdatedEvent {
  campaignId: string;
  encounterId: string;
  cardKey: string;
  notes: string;
}

export interface ShopItemUpdatedEvent {
  campaignId: string;
  sublocationInstanceId: string;
  shopItemId: string;
}

export interface SoundtrackTriggeredEvent {
  campaignId: string;
  soundtrackId: string;
}

export interface SoundtrackVolumeChangedEvent {
  campaignId: string;
  soundtrackId: string;
  volume: number;
}

export interface ShopItemScratchToggledEvent {
  campaignId: string;
  sublocationInstanceId: string;
  shopItemId: string;
  isScratchedOff: boolean;
}

/**
 * A card of the campaign was written (see the API's UpdateCast and its neighbours).
 *
 * The card itself rides along, as the campaign now holds it — the same object the single-card read
 * returns — so a watcher takes the change on from what it is handed rather than reading the card
 * back over the API, once per watching client. The id is always on the payload, for watchers that
 * only want to know which card moved; the card is absent only from a server that does not send it
 * yet, which is the watcher's cue to read the card back as it always did.
 */
export interface CastInstanceUpdatedEvent {
  campaignId: string;
  castInstanceId: string;
  cast?: CampaignCastInstance | null;
}

export interface LocationInstanceUpdatedEvent {
  campaignId: string;
  locationInstanceId: string;
  location?: CampaignLocationInstance | null;
}

export interface SublocationInstanceUpdatedEvent {
  campaignId: string;
  sublocationInstanceId: string;
  sublocation?: CampaignSublocationInstance | null;
}

export interface FactionInstanceUpdatedEvent {
  campaignId: string;
  factionInstanceId: string;
  faction?: CampaignFactionInstance | null;
}

export interface FactionSymbolAssignedEvent {
  campaignId: string;
  instanceId: string;
  entityType: 'cast' | 'sublocation';
  factionInstanceIds: string[];
  tickCount: number;
}

/**
 * The party's own cast cards in a faction have moved — a member added or taken off, or their
 * crowned leader set or taken off. The faction comes with it as the party's own read now holds
 * it, so a watcher takes the change on from what it is handed rather than reading it back: the
 * GM's look at the party's row, and every player's own (see cc-card-faction-navigation).
 */
export interface FactionPartyCastChangedEvent {
  campaignId: string;
  factionInstanceId: string;
  faction?: CampaignFactionInstance | null;
}

/**
 * A player card's motivations (traits) changed — one was added, removed, completed or shared. The
 * card's whole trait list rides along, as it now stands, so the party grid and the card owner's
 * "My Character" area take the change on from what they are handed rather than reading it back.
 */
export interface PlayerCardTraitsChangedEvent {
  campaignId: string;
  playerCardId: string;
  traits: PlayerTrait[];
}

@Injectable({ providedIn: 'root' })
export class CampaignHubService {
  private connection: signalR.HubConnection | null = null;

  constructor(private authService: AuthService) {}

  private secretRevealedSubject            = new Subject<SecretRevealedEvent | null>();
  private secretCreatedSubject            = new Subject<SecretCreatedEvent | null>();
  private playerSecretCreatedSubject       = new Subject<PlayerSecretCreatedEvent | null>();
  private playerSecretChangedSubject       = new Subject<PlayerSecretChangedEvent | null>();
  private secretDeletedSubject            = new Subject<SecretDeletedEvent | null>();
  private secretDeliveredSubject           = new Subject<SecretDeliveredEvent | null>();
  private secretResealedSubject            = new Subject<SecretResealedEvent | null>();
  private cardVisibilityChangedSubject     = new Subject<CardVisibilityChangedEvent | null>();
  private bulkCardVisibilityChangedSubject = new Subject<BulkCardVisibilityChangedEvent | null>();
  private noteUpdatedSubject               = new Subject<{ entityType: string; instanceId: string; campaignId: string } | null>();
  private quickNoteQueuedSubject           = new Subject<{ campaignId: string } | null>();
  private timeCursorMovedSubject           = new Subject<TimeCursorMovedEvent | null>();
  private playerNotesUpdatedSubject        = new Subject<PlayerNotesUpdatedEvent | null>();
  private dmNotesUpdatedSubject            = new Subject<DmNotesUpdatedEvent | null>();
  private timeOfDayUpdatedSubject          = new Subject<TimeOfDay | null>();
  private dayAdvancedSubject               = new Subject<DayAdvancedEvent | null>();
  private goldAwardedSubject               = new Subject<GoldAwardedEvent[]>();
  private conditionRemovedSubject          = new Subject<ConditionRemovedEvent | null>();
  private conditionAssignedSubject         = new Subject<ConditionAssignedEvent | null>();
  private secretSharedSubject              = new Subject<SecretSharedEvent | null>();
  private playerSecretDeletedSubject       = new Subject<PlayerSecretDeletedEvent | null>();
  private playerJoinedSubject              = new Subject<PlayerJoinedEvent | null>();
  private playerRemovedSubject             = new Subject<PlayerRemovedEvent | null>();
  private castTravelSubject             = new Subject<CastTraveledEvent | null>();
  private playerCardTraitsChangedSubject = new Subject<PlayerCardTraitsChangedEvent | null>();
  private ambianceChangedSubject        = new Subject<AmbianceChangedEvent | null>();
  private factionRemovedSubject            = new Subject<FactionRemovedEvent | null>();
  private factionLockedSubject             = new Subject<FactionLockedEvent | null>();
  private shopItemUpdatedSubject            = new Subject<ShopItemUpdatedEvent | null>();
  private shopItemScratchToggledSubject     = new Subject<ShopItemScratchToggledEvent | null>();
  private shopItemDeletedSubject            = new Subject<ShopItemDeletedEvent | null>();
  private shopItemAddedSubject              = new Subject<ShopItemAddedEvent | null>();
  private castInstanceUpdatedSubject        = new Subject<CastInstanceUpdatedEvent | null>();
  private locationInstanceUpdatedSubject    = new Subject<LocationInstanceUpdatedEvent | null>();
  private sublocationInstanceUpdatedSubject = new Subject<SublocationInstanceUpdatedEvent | null>();
  private factionInstanceUpdatedSubject     = new Subject<FactionInstanceUpdatedEvent | null>();
  private factionSymbolAssignedSubject      = new Subject<FactionSymbolAssignedEvent | null>();
  private factionPartyCastChangedSubject    = new Subject<FactionPartyCastChangedEvent | null>();
  private sessionCancelledSubject            = new Subject<SessionCancelledEvent | null>();
  private storylineEventUpdatedSubject      = new Subject<StorylineEventUpdatedEvent | null>();
  private campaignRulesChangedSubject      = new Subject<{ campaignId: string } | null>();
  private campaignNavChangedSubject          = new Subject<{ campaignId: string } | null>();
  private sessionDeletedSubject              = new Subject<SessionDeletedEvent | null>();
  private sessionEndedSubject                = new Subject<SessionEndedEvent | null>();
  private sessionStartedSubject              = new Subject<SessionStartedEvent | null>();
  private subscriptionLockLevelChangedSubject = new Subject<SubscriptionLockLevelChangedEvent | null>();
  private inventoryItemUsedSubject           = new Subject<InventoryItemUsedEvent | null>();
  private inventoryItemPurchasedSubject      = new Subject<InventoryItemPurchasedEvent | null>();
  private encounterUpdatedSubject             = new Subject<EncounterUpdatedEvent | null>();
  private encounterTurnChangedSubject         = new Subject<EncounterTurnChangedEvent | null>();
  private encounterCombatantUpdatedSubject    = new Subject<EncounterCombatantUpdatedEvent | null>();
  private trophyAwardedSubject                = new Subject<TrophyAwardedEvent | null>();
  private playerCastNoteUpdatedSubject        = new Subject<PlayerCastNoteUpdatedEvent | null>();
  private fieldJournalUpdatedSubject          = new Subject<FieldJournalUpdatedEvent | null>();
  private encounterEndedSubject               = new Subject<EncounterEndedEvent | null>();
  private soundtrackTriggeredSubject         = new Subject<SoundtrackTriggeredEvent | null>();
  private soundtrackVolumeChangedSubject      = new Subject<SoundtrackVolumeChangedEvent | null>();
  private gridAreaNoticeSubject               = new Subject<GridAreaNoticeEvent | null>();
  private _isConnected = signal(false);

  readonly secretRevealed$            = this.secretRevealedSubject.asObservable();
  readonly secretCreated$            = this.secretCreatedSubject.asObservable();
  readonly playerSecretCreated$       = this.playerSecretCreatedSubject.asObservable();
  readonly playerSecretChanged$       = this.playerSecretChangedSubject.asObservable();
  readonly secretDeleted$            = this.secretDeletedSubject.asObservable();
  readonly secretDelivered$           = this.secretDeliveredSubject.asObservable();
  readonly secretResealed$            = this.secretResealedSubject.asObservable();
  readonly cardVisibilityChanged$     = this.cardVisibilityChangedSubject.asObservable();
  readonly bulkCardVisibilityChanged$ = this.bulkCardVisibilityChangedSubject.asObservable();
  readonly noteUpdated$               = this.noteUpdatedSubject.asObservable();
  readonly quickNoteQueued$           = this.quickNoteQueuedSubject.asObservable();
  readonly timeCursorMoved$           = this.timeCursorMovedSubject.asObservable();
  readonly playerNotesUpdated$        = this.playerNotesUpdatedSubject.asObservable();
  readonly dmNotesUpdated$            = this.dmNotesUpdatedSubject.asObservable();
  readonly timeOfDayUpdated$          = this.timeOfDayUpdatedSubject.asObservable();
  readonly dayAdvanced$               = this.dayAdvancedSubject.asObservable();
  readonly goldAwarded$               = this.goldAwardedSubject.asObservable();
  readonly conditionRemoved$          = this.conditionRemovedSubject.asObservable();
  readonly conditionAssigned$         = this.conditionAssignedSubject.asObservable();
  readonly secretShared$              = this.secretSharedSubject.asObservable();
  readonly playerSecretDeleted$       = this.playerSecretDeletedSubject.asObservable();
  readonly playerJoined$              = this.playerJoinedSubject.asObservable();
  readonly playerRemoved$             = this.playerRemovedSubject.asObservable();
  readonly castTravel$             = this.castTravelSubject.asObservable();
  readonly playerCardTraitsChanged$ = this.playerCardTraitsChangedSubject.asObservable();
  readonly ambianceChanged$        = this.ambianceChangedSubject.asObservable();
  readonly factionRemoved$            = this.factionRemovedSubject.asObservable();
  readonly factionLocked$             = this.factionLockedSubject.asObservable();
  readonly factionSymbolAssigned$     = this.factionSymbolAssignedSubject.asObservable();
  readonly factionPartyCastChanged$   = this.factionPartyCastChangedSubject.asObservable();
  readonly shopItemUpdated$            = this.shopItemUpdatedSubject.asObservable();
  readonly shopItemScratchToggled$     = this.shopItemScratchToggledSubject.asObservable();
  readonly shopItemAdded$              = this.shopItemAddedSubject.asObservable();
  readonly shopItemDeleted$            = this.shopItemDeletedSubject.asObservable();
  readonly castInstanceUpdated$        = this.castInstanceUpdatedSubject.asObservable();
  readonly locationInstanceUpdated$    = this.locationInstanceUpdatedSubject.asObservable();
  readonly sublocationInstanceUpdated$ = this.sublocationInstanceUpdatedSubject.asObservable();
  readonly factionInstanceUpdated$     = this.factionInstanceUpdatedSubject.asObservable();
  readonly sessionCancelled$            = this.sessionCancelledSubject.asObservable();
  readonly storylineEventUpdated$      = this.storylineEventUpdatedSubject.asObservable();
  readonly campaignRulesChanged$      = this.campaignRulesChangedSubject.asObservable();
  readonly campaignNavChanged$          = this.campaignNavChangedSubject.asObservable();
  readonly sessionDeleted$              = this.sessionDeletedSubject.asObservable();
  readonly sessionEnded$                = this.sessionEndedSubject.asObservable();
  readonly sessionStarted$              = this.sessionStartedSubject.asObservable();
  readonly subscriptionLockLevelChanged$ = this.subscriptionLockLevelChangedSubject.asObservable();
  readonly inventoryItemUsed$           = this.inventoryItemUsedSubject.asObservable();
  readonly inventoryItemPurchased$      = this.inventoryItemPurchasedSubject.asObservable();
  readonly encounterUpdated$             = this.encounterUpdatedSubject.asObservable();
  readonly encounterTurnChanged$         = this.encounterTurnChangedSubject.asObservable();
  readonly encounterCombatantUpdated$    = this.encounterCombatantUpdatedSubject.asObservable();
  readonly trophyAwarded$                = this.trophyAwardedSubject.asObservable();
  readonly playerCastNoteUpdated$        = this.playerCastNoteUpdatedSubject.asObservable();
  readonly fieldJournalUpdated$          = this.fieldJournalUpdatedSubject.asObservable();
  readonly encounterEnded$                = this.encounterEndedSubject.asObservable();
  readonly soundtrackTriggered$         = this.soundtrackTriggeredSubject.asObservable();
  readonly soundtrackVolumeChanged$     = this.soundtrackVolumeChangedSubject.asObservable();
  readonly gridAreaNotice$              = this.gridAreaNoticeSubject.asObservable();

  /**
   * Every event this service delivers, by the name the hub sends it under. It is what `on()` reads
   * to subscribe a component by name; add an entry here when a new `connection.on` is wired above.
   */
  private readonly channels: Record<string, Subject<any>> = {
    PlayerSecretRevealed: this.secretRevealedSubject,
    SecretCreated: this.secretCreatedSubject,
    PlayerSecretCreated: this.playerSecretCreatedSubject,
    PlayerSecretChanged: this.playerSecretChangedSubject,
    SecretDeleted: this.secretDeletedSubject,
    SecretDelivered: this.secretDeliveredSubject,
    SecretResealed: this.secretResealedSubject,
    CardVisibilityChanged: this.cardVisibilityChangedSubject,
    BulkCardVisibilityChanged: this.bulkCardVisibilityChangedSubject,
    NoteUpdated: this.noteUpdatedSubject,
    QuickNoteQueued: this.quickNoteQueuedSubject,
    TimeCursorMoved: this.timeCursorMovedSubject,
    PlayerNotesUpdated: this.playerNotesUpdatedSubject,
    DmNotesUpdated: this.dmNotesUpdatedSubject,
    TimeOfDayUpdated: this.timeOfDayUpdatedSubject,
    DayAdvanced: this.dayAdvancedSubject,
    GoldAwarded: this.goldAwardedSubject,
    ConditionRemoved: this.conditionRemovedSubject,
    ConditionAssigned: this.conditionAssignedSubject,
    PlayerCardTraitsChanged: this.playerCardTraitsChangedSubject,
    SecretShared: this.secretSharedSubject,
    PlayerSecretDeleted: this.playerSecretDeletedSubject,
    PlayerJoined: this.playerJoinedSubject,
    PlayerRemoved: this.playerRemovedSubject,
    CastTraveled: this.castTravelSubject,
    AmbianceChanged: this.ambianceChangedSubject,
    FactionRemoved: this.factionRemovedSubject,
    FactionLocked: this.factionLockedSubject,
    ShopItemUpdated: this.shopItemUpdatedSubject,
    ShopItemScratchToggled: this.shopItemScratchToggledSubject,
    ShopItemDeleted: this.shopItemDeletedSubject,
    ShopItemAdded: this.shopItemAddedSubject,
    CastInstanceUpdated: this.castInstanceUpdatedSubject,
    LocationInstanceUpdated: this.locationInstanceUpdatedSubject,
    SublocationInstanceUpdated: this.sublocationInstanceUpdatedSubject,
    FactionInstanceUpdated: this.factionInstanceUpdatedSubject,
    FactionSymbolAssigned: this.factionSymbolAssignedSubject,
    FactionPartyCastChanged: this.factionPartyCastChangedSubject,
    StorylineEventUpdated: this.storylineEventUpdatedSubject,
    CampaignRulesChanged: this.campaignRulesChangedSubject,
    CampaignNavChanged: this.campaignNavChangedSubject,
    SessionDeleted: this.sessionDeletedSubject,
    SessionEnded: this.sessionEndedSubject,
    SessionCancelled: this.sessionCancelledSubject,
    SoundtrackTriggered: this.soundtrackTriggeredSubject,
    SubscriptionLockLevelChanged: this.subscriptionLockLevelChangedSubject,
    InventoryItemUsed: this.inventoryItemUsedSubject,
    InventoryItemPurchased: this.inventoryItemPurchasedSubject,
    EncounterUpdated: this.encounterUpdatedSubject,
    EncounterTurnChanged: this.encounterTurnChangedSubject,
    EncounterCombatantUpdated: this.encounterCombatantUpdatedSubject,
    TrophyAwarded: this.trophyAwardedSubject,
    EncounterEnded: this.encounterEndedSubject,
    PlayerCastNoteUpdated: this.playerCastNoteUpdatedSubject,
    FieldJournalUpdated: this.fieldJournalUpdatedSubject,
    SoundtrackVolumeChanged: this.soundtrackVolumeChangedSubject,
    GridAreaNotice: this.gridAreaNoticeSubject,
  };

  /** event name → the component names subscribed to it through `on()`. */
  private readonly componentListeners = new Map<string, Set<string>>();

  /** event name → when its component receipt last went out, for the 5-second gate. */
  private readonly componentAckAt = new Map<string, number>();

  private pendingComponentAcks: ReceivedComponentAck[] = [];

  /**
   * Subscribe a component to one hub event, under its own name. The name is what the Admin's
   * inspector shows as the acknowledgement that this component handled the event, so it should read
   * as the component (e.g. 'cc-my-character'), and be reported at most once per event per 5 seconds
   * so a stream of events — a drag on the clock, say — reports a single acknowledgement.
   */
  on<K extends keyof HubEventPayloads>(eventName: K, component: string, handler: (event: HubEventPayloads[K]) => void): Subscription {
    const subject = this.channels[eventName];
    if (!subject) {
      throw new Error(`CampaignHubService.on: unknown event '${eventName}' — add it to channels.`);
    }

    const names = this.componentListeners.get(eventName) ?? new Set<string>();
    names.add(component);
    this.componentListeners.set(eventName, names);

    return (subject as Subject<HubEventPayloads[K]>).subscribe(event => {
      this.reportComponentAck(eventName, event);
      handler(event);
    });
  }

  /** Reports the components that handled one event, gated to one report per 5-second window. */
  private reportComponentAck(eventName: string, payload: unknown): void {
    if (!this.reportReceipts || this.componentAcksUnavailable) return;

    const names = this.componentListeners.get(eventName);
    if (!names?.size) return;

    const now = Date.now();
    const last = this.componentAckAt.get(eventName) ?? 0;
    if (now - last < CampaignHubService.componentAckWindowMs) return;
    this.componentAckAt.set(eventName, now);

    if (this.pendingComponentAcks.length >= CampaignHubService.receiptBacklog) return;

    this.pendingComponentAcks.push({
      eventName,
      campaignId: this.campaignIdOf(payload),
      components: [...names],
    });
    this.receiptTimer ??= setInterval(() => this.flushReceipts(), CampaignHubService.receiptFlushMs);
  }

  isConnected(): boolean {
    return this._isConnected();
  }

  /**
   * Whether receiving clients tell the hub what they got back (the hub's ReportEventAck). This is
   * the receiving half of the SignalR Inspector: the server already knows what it sent, and this
   * is what turns a send into an arrival a GM can watch on their own screen. Off in a production
   * build — set it to `true` to use it on a deployed environment.
   */
  private readonly reportReceipts = !environment.production;

  /** Events not worth a receipt: the transport's own noise, not the campaign's traffic. */
  private static readonly receiptExempt = new Set(['ping']);

  /** The campaigns this client has joined: which room an event without a campaignId belongs to. */
  private readonly joinedCampaigns = new Set<string>();

  private receiptTapInstalled = false;

  /** How often buffered receipts are sent, in ms: one call per event would be traffic of its own. */
  private static readonly receiptFlushMs = 400;

  /** The most receipts held while the connection is away, so an outage cannot grow unbounded. */
  private static readonly receiptBacklog = 200;

  /** How long one component receipt stands for: a second event inside the window reports nothing. */
  private static readonly componentAckWindowMs = 5000;

  /** Receipts waiting for the next flush, and the timer that flushes them. */
  private pendingReceipts: { eventName: string; campaignId: string | null }[] = [];
  private receiptTimer: ReturnType<typeof setInterval> | null = null;

  /**
   * Set once the hub has refused a receipt: a server without the call refuses every one, and asking
   * again per event would only fill the console with the same failure. Cleared on a fresh
   * connection, which is a fresh chance at a server that knows it.
   */
  private receiptsUnavailable = false;

  /**
   * The same, for the component receipts (ReportComponentAcks). Kept apart from the event receipts
   * so a server without that one call — an older build — silences only the component names rather
   * than taking the player receipts down with it. Cleared on a fresh connection.
   */
  private componentAcksUnavailable = false;

  async connect(): Promise<void> {
    this.connection = new signalR.HubConnectionBuilder()
      .withUrl(`${environment.apiUrl}/hubs/campaign`, {
        accessTokenFactory: () => {
          // Return JWT token from localStorage for SignalR authentication
          const token = localStorage.getItem('cast_library_token');
          return token || ''; // Return empty string instead of null to satisfy TypeScript
        },
        skipNegotiation: false,
        transport: signalR.HttpTransportType.WebSockets | signalR.HttpTransportType.ServerSentEvents
      })
      .withAutomaticReconnect([0, 2000, 5000, 10000, 30000])
      .withServerTimeout(90000)
      .configureLogging(environment.production ? signalR.LogLevel.None : signalR.LogLevel.Trace)
      .build();

    // A fresh connection is a fresh chance: the tap goes on this one, and the receipts are worth
    // trying again on whatever server this turns out to be.
    this.receiptTapInstalled = false;
    this.receiptsUnavailable = false;
    this.componentAcksUnavailable = false;

    // The receipt tap goes on before the handlers below are registered: it wraps them.
    this.installReceiveTap();

    await this.connection.start()
      .catch(err => {});

    this.connection.onreconnecting(() => {
      this._isConnected.set(false);
      this.stopReceiptTimer();
    });
    this.connection.onreconnected(() => {
      this._isConnected.set(true);
    });
    this.connection.onclose(() => {
      this._isConnected.set(false);
    });
    this._isConnected.set(true);

    this.connection.on('ping', () => {
      // Ping received
    });

    this.connection.on('PlayerSecretRevealed', (event: SecretRevealedEvent) => {
      this.secretRevealedSubject.next(event);
    });

    this.connection.on('SecretCreated', (event: SecretCreatedEvent) => {
      this.secretCreatedSubject.next(event);
    });

    this.connection.on('PlayerSecretCreated', (event: PlayerSecretCreatedEvent) => {
      this.playerSecretCreatedSubject.next(event);
    });

    this.connection.on('PlayerSecretChanged', (event: PlayerSecretChangedEvent) => {
      this.playerSecretChangedSubject.next(event);
    });

    this.connection.on('SecretDeleted', (event: SecretDeletedEvent) => {
      this.secretDeletedSubject.next(event);
    });

    this.connection.on('SecretDelivered', (event: SecretDeliveredEvent) => {
      this.secretDeliveredSubject.next(event);
    });

    this.connection.on('SecretResealed', (event: SecretResealedEvent) => {
      this.secretResealedSubject.next(event);
    });

    this.connection.on('CardVisibilityChanged', (event: CardVisibilityChangedEvent) => {
      this.cardVisibilityChangedSubject.next(event);
    });

    this.connection.on('BulkCardVisibilityChanged', (event: BulkCardVisibilityChangedEvent) => {
      this.bulkCardVisibilityChangedSubject.next(event);
    });

    this.connection.on('NoteUpdated', (event: { entityType: string; instanceId: string; campaignId: string }) => {
      this.noteUpdatedSubject.next(event);
    });

    this.connection.on('QuickNoteQueued', (event: { campaignId: string }) => {
      this.quickNoteQueuedSubject.next(event);
    });

    this.connection.on('TimeCursorMoved', (event: TimeCursorMovedEvent) => {
      this.timeCursorMovedSubject.next(event);
    });

    this.connection.on('PlayerNotesUpdated', (event: PlayerNotesUpdatedEvent) => {
      this.playerNotesUpdatedSubject.next(event);
    });

    this.connection.on('DmNotesUpdated', (event: DmNotesUpdatedEvent) => {
      this.dmNotesUpdatedSubject.next(event);
    });

    this.connection.on('TimeOfDayUpdated', (tod: TimeOfDay) => {
      this.timeOfDayUpdatedSubject.next(tod);
    });

    this.connection.on('DayAdvanced', (event: DayAdvancedEvent) => {
      this.dayAdvancedSubject.next(event);
    });

    this.connection.on('GoldAwarded', (event: GoldAwardedEvent) => {
      this.goldAwardedSubject.next([event]);
    });

    this.connection.on('ConditionRemoved', (event: ConditionRemovedEvent) => {
      this.conditionRemovedSubject.next(event);
    });

    this.connection.on('ConditionAssigned', (event: ConditionAssignedEvent) => {
      this.conditionAssignedSubject.next(event);
    });

    this.connection.on('PlayerCardTraitsChanged', (event: PlayerCardTraitsChangedEvent) => {
      this.playerCardTraitsChangedSubject.next(event);
    });

    this.connection.on('SecretShared', (event: SecretSharedEvent) => {
      this.secretSharedSubject.next(event);
    });

    this.connection.on('PlayerSecretDeleted', (event: PlayerSecretDeletedEvent) => {
      this.playerSecretDeletedSubject.next(event);
    });

    this.connection.on('PlayerJoined', (event: PlayerJoinedEvent) => {
      this.playerJoinedSubject.next(event);
    });

    this.connection.on('PlayerRemoved', (event: PlayerRemovedEvent) => {
      this.playerRemovedSubject.next(event);
    });

    this.connection.on('CastTraveled', (event: CastTraveledEvent) => {
      this.castTravelSubject.next(event);
    });

    this.connection.on('AmbianceChanged', (event: AmbianceChangedEvent) => {
      this.ambianceChangedSubject.next(event);
    });

    this.connection.on('FactionRemoved', (event: FactionRemovedEvent) => {
      this.factionRemovedSubject.next(event);
    });

    this.connection.on('FactionLocked', (event: FactionLockedEvent) => {
      this.factionLockedSubject.next(event);
    });

    this.connection.on('ShopItemUpdated', (event: ShopItemUpdatedEvent) => {
      this.shopItemUpdatedSubject.next(event);
    });

    this.connection.on('ShopItemScratchToggled', (event: ShopItemScratchToggledEvent) => {
      this.shopItemScratchToggledSubject.next(event);
    });

    this.connection.on('ShopItemDeleted', (event: ShopItemDeletedEvent) => {
      this.shopItemDeletedSubject.next(event);
    });

    this.connection.on('ShopItemAdded', (event: ShopItemAddedEvent) => {
      this.shopItemAddedSubject.next(event);
    });

    this.connection.on('CastInstanceUpdated', (event: CastInstanceUpdatedEvent) => {
      this.castInstanceUpdatedSubject.next(event);
    });

    this.connection.on('LocationInstanceUpdated', (event: LocationInstanceUpdatedEvent) => {
      console.log('CampaignHubService - LocationInstanceUpdated received from server:', event);
      this.locationInstanceUpdatedSubject.next(event);
    });

    this.connection.on('SublocationInstanceUpdated', (event: SublocationInstanceUpdatedEvent) => {
      this.sublocationInstanceUpdatedSubject.next(event);
    });

    this.connection.on('FactionInstanceUpdated', (event: FactionInstanceUpdatedEvent) => {
      this.factionInstanceUpdatedSubject.next(event);
    });

    this.connection.on('FactionSymbolAssigned', (event: FactionSymbolAssignedEvent) => {
      this.factionSymbolAssignedSubject.next(event);
    });

    this.connection.on('FactionPartyCastChanged', (event: FactionPartyCastChangedEvent) => {
      this.factionPartyCastChangedSubject.next(event);
    });

    this.connection.on('StorylineEventUpdated', (event: StorylineEventUpdatedEvent) => {
      this.storylineEventUpdatedSubject.next(event);
    });

    this.connection.on('CampaignRulesChanged', (event: { campaignId: string }) => {
      this.campaignRulesChangedSubject.next(event);
    });

    this.connection.on('CampaignNavChanged', (event: { campaignId: string }) => {
      this.campaignNavChangedSubject.next(event);
    });

    this.connection.on('SessionDeleted', (event: SessionDeletedEvent) => {
      this.sessionDeletedSubject.next(event);
    });

    this.connection.on('SessionEnded', (event: SessionEndedEvent) => {
      this.sessionEndedSubject.next(event);
    });

    this.connection.on('SessionCancelled', (event: SessionCancelledEvent | null) => {
      this.sessionCancelledSubject.next(event);
    });

    this.connection.on('SoundtrackTriggered', (event: SoundtrackTriggeredEvent) => {
      this.soundtrackTriggeredSubject.next(event);
    });

    this.connection.on('SubscriptionLockLevelChanged', (event: SubscriptionLockLevelChangedEvent | null) => {
      this.subscriptionLockLevelChangedSubject.next(event);
    });

    this.connection.on('InventoryItemUsed', (event: InventoryItemUsedEvent) => {
      this.inventoryItemUsedSubject.next(event);
    });

    this.connection.on('InventoryItemPurchased', (event: InventoryItemPurchasedEvent) => {
      this.inventoryItemPurchasedSubject.next(event);
    });

    this.connection.on('EncounterUpdated', (event: EncounterUpdatedEvent) => {
      this.encounterUpdatedSubject.next(event);
    });

    this.connection.on('EncounterTurnChanged', (event: EncounterTurnChangedEvent) => {
      this.encounterTurnChangedSubject.next(event);
    });

    this.connection.on('EncounterCombatantUpdated', (event: EncounterCombatantUpdatedEvent) => {
      this.encounterCombatantUpdatedSubject.next(event);
    });

    this.connection.on('TrophyAwarded', (event: TrophyAwardedEvent) => {
      this.trophyAwardedSubject.next(event);
    });

    this.connection.on('EncounterEnded', (event: EncounterEndedEvent) => {
      this.encounterEndedSubject.next(event);
    });

    this.connection.on('PlayerCastNoteUpdated', (event: PlayerCastNoteUpdatedEvent) => {
      this.playerCastNoteUpdatedSubject.next(event);
    });

    this.connection.on('FieldJournalUpdated', (event: FieldJournalUpdatedEvent) => {
      this.fieldJournalUpdatedSubject.next(event);
    });

    this.connection.on('SoundtrackVolumeChanged', (event: SoundtrackVolumeChangedEvent) => {
      this.soundtrackVolumeChangedSubject.next(event);
    });

    this.connection.on('GridAreaNotice', (event: GridAreaNoticeEvent) => {
      this.gridAreaNoticeSubject.next(event);
    });
  }

  async joinCampaign(campaignId: string): Promise<void> {
    this.joinedCampaigns.add(campaignId);

    await this.connection?.invoke('JoinCampaign', campaignId);
  }

  async leaveCampaign(campaignId: string): Promise<void> {
    this.joinedCampaigns.delete(campaignId);

    await this.connection?.invoke('LeaveCampaign', campaignId);
  }

  /**
   * Wraps every receive handler this service registers, so each event that arrives also reports
   * itself to the hub (see the hub's ReportEventAck, and SignalRInspector behind it). Done here,
   * once, rather than at the forty-odd `connection.on` calls below: the inspector is a window on
   * the traffic, and the traffic should not have to know it is there.
   */
  private installReceiveTap(): void {
    if (!this.reportReceipts || !this.connection || this.receiptTapInstalled) return;

    const connection = this.connection;
    const register = connection.on.bind(connection);

    connection.on = ((eventName: string, handler: (...args: any[]) => void) => {
      register(eventName, (...args: any[]) => {
        this.reportReceipt(eventName, args[0]);
        handler(...args);
      });
    }) as typeof connection.on;

    this.receiptTapInstalled = true;
  }

  /** Tells the hub this client received an event, and which campaign it belongs to. */
  private reportReceipt(eventName: string, payload: unknown): void {
    if (CampaignHubService.receiptExempt.has(eventName) || this.receiptsUnavailable) return;
    if (this.pendingReceipts.length >= CampaignHubService.receiptBacklog) return;

    this.pendingReceipts.push({ eventName, campaignId: this.campaignIdOf(payload) });
    this.receiptTimer ??= setInterval(() => this.flushReceipts(), CampaignHubService.receiptFlushMs);
  }

  /**
   * Sends the receipts collected since the last flush, in one call. Batched rather than an invoke
   * per event: an event a drag on the clock emits fifty of arrives here as one call, so a window
   * watching the traffic does not become traffic of its own.
   */
  private flushReceipts(): void {
    if (!this.pendingReceipts.length && !this.pendingComponentAcks.length) {
      this.stopReceiptTimer();
      return;
    }

    // Nothing to send down while the connection is away: the receipts wait for the next beat.
    if (this.connection?.state !== signalR.HubConnectionState.Connected) return;

    const receipts = this.pendingReceipts;
    const componentAcks = this.pendingComponentAcks;
    this.pendingReceipts = [];
    this.pendingComponentAcks = [];

    if (receipts.length) {
      this.connection.invoke('ReportEventAcks', receipts).catch(() => {
        // The hub does not know this call — a server without the receipts. Stop asking for the rest of
        // the session rather than letting the client log the same failure once per event.
        this.receiptsUnavailable = true;
        this.pendingReceipts = [];
        this.stopReceiptTimer();
      });
    }

    if (componentAcks.length) {
      this.connection.invoke('ReportComponentAcks', componentAcks).catch(() => {
        // A server without this call (an older build): silence the component names only, and leave
        // the player receipts alone.
        this.componentAcksUnavailable = true;
        this.pendingComponentAcks = [];
        this.stopReceiptTimer();
      });
    }
  }

  private stopReceiptTimer(): void {
    if (this.receiptTimer === null) return;

    clearInterval(this.receiptTimer);
    this.receiptTimer = null;
  }

  /**
   * The campaign an event belongs to: its own id where the payload names one, and otherwise the
   * one room this client is in — the room every group broadcast it receives belongs to.
   */
  private campaignIdOf(payload: unknown): string | null {
    const named = (payload as { campaignId?: unknown } | null)?.campaignId;
    if (typeof named === 'string') return named;

    return this.joinedCampaigns.size === 1 ? [...this.joinedCampaigns][0] : null;
  }

  async revealSecret(campaignId: string, secretId: string): Promise<void> {
    await this.connection?.invoke('PlayerSecretRevealed', campaignId, secretId);
  }

  /**
   * Ask the campaign to light one grid area's button (see the hub's RaiseGridAreaNotice). The
   * client-instructed door: a widget raising a notice for its own area. Pass a userId to aim it at
   * one user, or omit it to raise it for the players at large.
   */
  async raiseGridAreaNotice(campaignId: string, gridArea: string, userId?: string | null): Promise<void> {
    await this.connection?.invoke('RaiseGridAreaNotice', campaignId, gridArea, userId ?? null);
  }

  async disconnect(): Promise<void> {
    await this.connection?.stop();
    this._isConnected.set(false);
  }
}
