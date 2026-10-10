import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { CardCondition } from '../shared/models/condition.model';

/** One card inside an encounter spot (each card is its own row and acts independently). */
export interface EncounterCombatant {
  id: string;
  spotId: string;
  encounterId: string;
  combatantType: 'cast' | 'player' | string;
  sourceCastId?: string;
  playerCardId?: string;
  originCampaignCastInstanceId?: string;
  displayName: string;
  imageUrl: string;
  maxHitPoints: number;
  lostHitPoints: number;
  tempHitPoints: number;
  isDefeated: boolean;
  isCaptured: boolean;
  isEscaped: boolean;
  conditions: string[];
  notes: string;
  /** Rolled initiative, duplicated onto every combatant row of the same spot. */
  initiativeNumber?: number | null;
}

/**
 * A condition the DM has given to one of an encounter's cards. The encounter keeps
 * its own row per card, so a cast card's conditions hang off that row the way a
 * party member's hang off their player card.
 */
export interface EncounterCombatantCondition extends CardCondition {
  combatantId: string;
}

/** An encounter spot = one slot on the initiative circle (a player, or a group of cards). */
export interface EncounterSpot {
  id: string;
  encounterId: string;
  initiativeOrder: number;
  groupName?: string;
  turnsTaken?: number;
  combatants: EncounterCombatant[];
}

/** An encounter in the campaign's pool (spots and combatants included). */
export interface CampaignEncounter {
  id: string;
  campaignId: string;
  sequenceNumber: number;
  name: string;
  /** 'planned' until Start, 'ordering' while the rolled numbers are turned in, 'active' while it runs, then 'ended'. */
  status: string;
  currentSpotId?: string;
  roundNumber?: number;
  createdAt?: string;
  updatedAt?: string;
  endedAt?: string;
  spots: EncounterSpot[];
}

/** One card to place into a new spot (the group is written in a single call). */
export interface SpotCombatantRequest {
  combatantType: 'cast' | 'player';
  sourceCastId?: string;
  playerCardId?: string;
  originCampaignCastInstanceId?: string;
}

/** Adding one card; `spotId` attaches it to an existing group instead of a new spot. */
export interface AddCombatantToEncounterRequest extends SpotCombatantRequest {
  spotId?: string;
}

/** The editable per-card numbers (hit points / defeated). */
export interface UpdateEncounterCombatantRequest {
  maxHitPoints?: number;
  lostHitPoints?: number;
  tempHitPoints?: number;
  isDefeated?: boolean;
  isCaptured?: boolean;
  isEscaped?: boolean;
  notes?: string;
}

/**
 * What the group picker's next pick is for: a brand new group, or cards added to
 * a group of the encounter currently being edited. An existing group hands over
 * its own cards too, so the picker can show what the DM already picked for it.
 */
export type EncounterPickerTarget =
  | { mode: 'new' }
  | { mode: 'existing'; spotId: string; spotName: string; spotCombatants: EncounterCombatant[] };

/** One card the picker chose, with the max hit points it goes into the fight with. */
export interface PickedGroupCard {
  /** The card as the encounter's own add / spot calls take it. */
  request: SpotCombatantRequest;
  /** Max hit points written onto the card's row as soon as it exists. */
  maxHitPoints: number;
}

/**
 * Max hit points rewritten on rows a group already holds: a card the picker
 * seeded from the group stands for rows that are already there, so correcting
 * its hit points is a write, not a new card.
 */
export interface CombatantHitPointsChange {
  /** Every row the picked card stands for (its duplicates are written together). */
  combatantIds: string[];
  /** The max hit points to write onto them. */
  maxHitPoints: number;
}

/** What the picker finished with, for the builder to write. */
export interface EncounterGroupPicked {
  /** The cards to add, in the order they are written. */
  cards: PickedGroupCard[];
  /** Hit points to rewrite on rows the group already holds (empty for a new group). */
  hitPointChanges: CombatantHitPointsChange[];
}

/**
 * How many places one encounter's ring holds, the party included. This mirrors the
 * server's own rule (see EncounterRules): a spot per player card is created with
 * the encounter, so those are the first of these places and a new group only fits
 * while something is left of the count.
 */
export const ENCOUNTER_MAX_SPOTS = 10;

/**
 * How one encounter's ring is filled: the party's places and the DM's groups, which
 * together are what the ring holds. Every place is one turn, so the two counts are
 * the whole story of a circle (see `cc-encounter-places`).
 */
export interface EncounterPlaces {
  /** Places the party holds: one per player card, added with the encounter. */
  players: number;
  /** Places the DM's groups hold (a group of several cards is still one place). */
  groups: number;
  /** Places the ring holds in total. */
  total: number;
}

/**
 * Who the combatant drawer is showing: the cards of one place on the initiative
 * ring, and which of them is up. The cards are the encounter's own rows, so the
 * drawer reads exactly what the ring draws.
 */
export interface CombatantDetailsTarget {
  campaignId: string;
  encounterId: string;
  portalColor: string;
  /** The place's name, for the drawer's title. */
  spotName: string;
  combatants: EncounterCombatant[];
  /** Which card of the place the panels open on. */
  index: number;
  readOnly?: boolean;
}

/** A spot's rolled initiative, committed for the whole encounter in one call. */
export interface SpotInitiativeRequest {
  spotId: string;
  initiativeNumber: number | null;
}

/**
 * Encounter API client.
 *
 * Group-level writes are single calls by design: a spot is created with all of
 * its cards at once, and the whole encounter's initiative is committed in one
 * request, so the builder never leaves half-built state behind.
 */
@Injectable({ providedIn: 'root' })
export class EncounterService {
  private http = inject(HttpClient);

  private url(campaignId: string, suffix = ''): string {
    return `${environment.apiUrl}/api/campaign/${campaignId}/encounters${suffix}`;
  }

  /** The campaign's encounter pool (newest first). */
  list(campaignId: string): Observable<CampaignEncounter[]> {
    return this.http.get<CampaignEncounter[]>(this.url(campaignId));
  }

  /** One encounter with its spots and combatants. */
  get(campaignId: string, encounterId: string): Observable<CampaignEncounter> {
    return this.http.get<CampaignEncounter>(this.url(campaignId, `/${encounterId}`));
  }

  /**
   * Creates an encounter and returns it with the party's player spots (one per
   * player card, added server side). The encounter is saved from here on: every
   * later change (groups, cards, name) is written as it happens.
   */
  create(campaignId: string, name?: string): Observable<CampaignEncounter> {
    return this.http.post<CampaignEncounter>(this.url(campaignId), { name: name ?? '' });
  }

  /**
   * Starts the encounter's initiative: it becomes the campaign's running
   * encounter and any other active one is ended. Returns the started encounter.
   */
  startEncounter(campaignId: string, encounterId: string): Observable<CampaignEncounter> {
    return this.http.post<CampaignEncounter>(this.url(campaignId, `/${encounterId}/start`), {});
  }

  /** Ends the encounter: the fight is over. */
  endEncounter(campaignId: string, encounterId: string): Observable<void> {
    return this.http.post<void>(this.url(campaignId, `/${encounterId}/end`), {});
  }

  /**
   * Moves the encounter's turn marker one spot on (the circle's clock hand). The
   * server keeps the marker, so the hand is where it was left when the circle is
   * opened again. Returns the spot whose turn it now is.
   */
  advanceTurn(
    campaignId: string,
    encounterId: string,
    direction: 'next' | 'prev' = 'next'
  ): Observable<{ currentSpotId: string; roundNumber: number; ended: boolean }> {
    return this.http.post<{ currentSpotId: string; roundNumber: number; ended: boolean }>(
      this.url(campaignId, `/${encounterId}/turn`),
      { direction }
    );
  }

  /** Renames the encounter itself (its card's title). */
  renameEncounter(campaignId: string, encounterId: string, name: string): Observable<void> {
    return this.http.patch<void>(this.url(campaignId, `/${encounterId}`), { name });
  }

  /** Adds one card — to an existing group when `spotId` is set, else to a new spot. */
  addCombatant(
    campaignId: string,
    encounterId: string,
    request: AddCombatantToEncounterRequest
  ): Observable<EncounterCombatant> {
    return this.http.post<EncounterCombatant>(this.url(campaignId, `/${encounterId}/combatants`), request);
  }

  /** Removes one card from its group. */
  removeCombatant(campaignId: string, encounterId: string, combatantId: string): Observable<void> {
    return this.http.delete<void>(this.url(campaignId, `/${encounterId}/combatants/${combatantId}`));
  }

  /** Writes a card's hit points (and defeated flag) back to the encounter. */
  updateCombatant(
    campaignId: string,
    encounterId: string,
    combatantId: string,
    request: UpdateEncounterCombatantRequest
  ): Observable<EncounterCombatant> {
    return this.http.patch<EncounterCombatant>(
      this.url(campaignId, `/${encounterId}/combatants/${combatantId}`),
      request
    );
  }

  /**
   * The conditions one of the encounter's cards carries right now. A cast card is
   * the encounter's own row, so they are read from the card itself (a party
   * member's keep to their player card). Giving and clearing them is the
   * conditions panel's own call, on the same route.
   */
  getCombatantConditions(
    campaignId: string,
    encounterId: string,
    combatantId: string
  ): Observable<EncounterCombatantCondition[]> {
    return this.http.get<EncounterCombatantCondition[]>(
      this.url(campaignId, `/${encounterId}/combatants/${combatantId}/conditions`)
    );
  }

  /** Creates a group spot with every card in it (one call, all or nothing). */
  createSpot(campaignId: string, encounterId: string, combatants: SpotCombatantRequest[]): Observable<EncounterSpot> {
    return this.http.post<EncounterSpot>(this.url(campaignId, `/${encounterId}/spots`), { combatants });
  }

  /** Renames a spot. */
  renameSpot(campaignId: string, encounterId: string, spotId: string, name: string): Observable<void> {
    return this.http.patch<void>(this.url(campaignId, `/${encounterId}/spots/${spotId}`), { name });
  }

  /** Removes a whole group (its cards cascade). */
  deleteSpot(campaignId: string, encounterId: string, spotId: string): Observable<void> {
    return this.http.delete<void>(this.url(campaignId, `/${encounterId}/spots/${spotId}`));
  }

  /**
   * Writes the ring's initiative order: the spots in the order they run, clockwise
   * from the top. Every read sorts by the stored order, so this one call is what a
   * group's place on the circle is kept in. The list is the encounter's whole ring.
   */
  reorderSpots(campaignId: string, encounterId: string, spotIds: string[]): Observable<void> {
    return this.http.patch<void>(this.url(campaignId, `/${encounterId}/order`), { spotIds });
  }

  /** Commits the rolled initiative for every spot at once, and returns the reordered encounter. */
  setInitiative(campaignId: string, encounterId: string, spots: SpotInitiativeRequest[]): Observable<CampaignEncounter> {
    return this.http.patch<CampaignEncounter>(this.url(campaignId, `/${encounterId}/initiative`), { spots });
  }
}
