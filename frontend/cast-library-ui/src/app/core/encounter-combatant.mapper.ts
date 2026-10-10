import { CampaignCastInstance } from '../shared/models/cast.model';
import { PlayerCard } from '../shared/models/player-card.model';
import { EncounterCombatant, EncounterSpot } from './encounter.service';

export function castCardsOf(spot: EncounterSpot): EncounterCombatant[] {
  return spot.combatants.filter(combatant => combatant.combatantType !== 'player');
}

export function castSpotsOf(spots: EncounterSpot[]): EncounterSpot[] {
  return spots.filter(spot => castCardsOf(spot).length > 0);
}

export function castCardCountOf(spots: EncounterSpot[]): number {
  return castSpotsOf(spots).reduce((total, spot) => total + castCardsOf(spot).length, 0);
}

export function isCombatantOutOfTheFight(combatant: EncounterCombatant): boolean {
  return combatant.isDefeated || combatant.isCaptured || combatant.isEscaped;
}

export function castCardKey(combatant: EncounterCombatant): string {
  const instanceId = combatant.originCampaignCastInstanceId ?? '';
  return instanceId ? `instance:${instanceId}` : `cast:${combatant.sourceCastId ?? ''}`;
}

export interface DistinctCastCard {
  key: string;
  combatant: EncounterCombatant;
  count: number;
  downCount: number;
  capturedCount: number;
  escapedCount: number;
}

export function distinctCastCards(combatants: EncounterCombatant[]): DistinctCastCard[] {
  const byKey = new Map<string, DistinctCastCard>();

  for (const combatant of combatants) {
    const key = castCardKey(combatant);
    const existing = byKey.get(key);

    if (existing) {
      existing.count += 1;
      if (combatant.isDefeated) existing.downCount += 1;
      if (combatant.isCaptured) existing.capturedCount += 1;
      if (combatant.isEscaped) existing.escapedCount += 1;
      continue;
    }

    byKey.set(key, {
      key,
      combatant,
      count: 1,
      downCount: combatant.isDefeated ? 1 : 0,
      capturedCount: combatant.isCaptured ? 1 : 0,
      escapedCount: combatant.isEscaped ? 1 : 0,
    });
  }

  return [...byKey.values()];
}

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
    starsCount: 0,
    voicePlacement: [],
    dmNotes: ''
  };

  return {
    ...base,
    name: combatant.displayName || base.name,
    imageUrl: combatant.imageUrl || base.imageUrl,
    maxHitPoints: combatant.maxHitPoints || base.maxHitPoints,
  };
}

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
