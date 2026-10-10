import { CampaignCastInstance } from '../shared/models/cast.model';
import { PlayerCard } from '../shared/models/player-card.model';
import { EncounterCombatant, EncounterSpot } from './encounter.service';

/**
 * An encounter combatant is its own row (display name, portrait, hit points)
 * rather than a cast or a player card, so the simple cards need it mapped into
 * the shape they render. Both the encounter builder's row and the initiative
 * circle use these helpers, so a combatant looks the same everywhere.
 */

/**
 * The cast cards of a spot. The party's own rows (one per player card, added by
 * the server when the encounter is created) are not part of the encounter's cast
 * and are left out here — these are the helpers for the DM's side of a fight: the
 * editor, the group picker, the count on an encounter's card and the wrap-up's row.
 * The ring is the one face that stands the party in as well, and it reads the
 * spots' combatants itself.
 */
export function castCardsOf(spot: EncounterSpot): EncounterCombatant[] {
  return spot.combatants.filter(combatant => combatant.combatantType !== 'player');
}

/** The spots holding at least one cast card — the groups the DM's cards sit in. */
export function castSpotsOf(spots: EncounterSpot[]): EncounterSpot[] {
  return spots.filter(spot => castCardsOf(spot).length > 0);
}

/** How many cast cards a set of spots holds — what an encounter's card counts. */
export function castCardCountOf(spots: EncounterSpot[]): number {
  return castSpotsOf(spots).reduce((total, spot) => total + castCardsOf(spot).length, 0);
}

export function isCombatantOutOfTheFight(combatant: EncounterCombatant): boolean {
  return combatant.isDefeated || combatant.isCaptured || combatant.isEscaped;
}

/**
 * The identity of a cast card: `instance:<campaign cast instance id>` for a card
 * taken from the campaign's own cast (however many copies of it a fight holds, they
 * are one card), and `cast:<library cast id>` for one picked straight from the
 * library, which no campaign instance stands behind. This is the scheme the group
 * picker's rows are keyed by, so "the same card" means one thing everywhere.
 */
export function castCardKey(combatant: EncounterCombatant): string {
  const instanceId = combatant.originCampaignCastInstanceId ?? '';
  return instanceId ? `instance:${instanceId}` : `cast:${combatant.sourceCastId ?? ''}`;
}

/** One distinct cast card a fight held, with how many copies of it stood in it. */
export interface DistinctCastCard {
  /** The card's own identity (see `castCardKey`). */
  key: string;
  /** One of the fight's rows for that card: its face, name and portrait stand for them all. */
  combatant: EncounterCombatant;
  /** How many copies of the card the fight held (1 for a card that stood in it alone). */
  count: number;
  /** How many of those copies finished the fight down. */
  downCount: number;
}

/**
 * The fight's cast cards, one entry per distinct card rather than one per row: a
 * group of four identical cards reads as that card with a count of four. The order
 * is the order the rows came in, so the wrap-up keeps the encounter's own sequence.
 */
export function distinctCastCards(combatants: EncounterCombatant[]): DistinctCastCard[] {
  const byKey = new Map<string, DistinctCastCard>();

  for (const combatant of combatants) {
    const key = castCardKey(combatant);
    const existing = byKey.get(key);

    if (existing) {
      existing.count += 1;
      if (combatant.isDefeated) existing.downCount += 1;
      continue;
    }

    byKey.set(key, { key, combatant, count: 1, downCount: combatant.isDefeated ? 1 : 0 });
  }

  return [...byKey.values()];
}

/**
 * A combatant as `cc-simple-cast-card` wants it. When the combatant came from
 * one of the campaign's cast instances, that instance supplies the card face
 * (role, race, portrait); hit points always come from the encounter's own row.
 */
export function combatantAsCast(
  combatant: EncounterCombatant,
  campaignId: string,
  campaignCasts: CampaignCastInstance[] = []
): CampaignCastInstance {
  const instance = campaignCasts.find(cast =>
    (combatant.originCampaignCastInstanceId && cast.instanceId === combatant.originCampaignCastInstanceId)
    || (combatant.sourceCastId && cast.sourceCastId === combatant.sourceCastId));

  const base: CampaignCastInstance = instance ?? {
    id: combatant.sourceCastId ?? combatant.id,
    dmUserId: '',
    name: combatant.displayName,
    pronouns: '',
    race: '',
    role: '',
    age: '',
    maxHitPoints: combatant.maxHitPoints,
    posture: '',
    speed: '',
    keywords: [],
    voiceNotes: '',
    description: '',
    publicDescription: '',
    imageUrl: combatant.imageUrl,
    createdAt: '',
    instanceId: combatant.id,
    campaignId,
    sourceCastId: combatant.sourceCastId ?? '',
    locationInstanceId: null,
    sublocationInstanceId: null,
    isVisibleToPlayers: true,
    lostHitPoints: combatant.lostHitPoints,
    tempHitPoints: combatant.tempHitPoints,
    voicePlacement: [],
    dmNotes: ''
  };

  return {
    ...base,
    name: combatant.displayName || base.name,
    imageUrl: combatant.imageUrl || base.imageUrl,
    maxHitPoints: combatant.maxHitPoints || base.maxHitPoints,
    lostHitPoints: combatant.lostHitPoints,
    tempHitPoints: combatant.tempHitPoints,
  };
}

/** A party combatant as `cc-simple-player-card` wants it. */
export function combatantAsPlayer(combatant: EncounterCombatant, campaignId: string): PlayerCard {
  return {
    id: combatant.playerCardId ?? combatant.id,
    campaignId,
    playerUserId: '',
    playerDisplayName: combatant.displayName,
    name: combatant.displayName,
    race: '',
    class: '',
    imageUrl: combatant.imageUrl
  };
}
