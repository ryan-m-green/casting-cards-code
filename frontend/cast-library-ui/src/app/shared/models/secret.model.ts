import { PlayerCardSecret } from './player-card.model';

export interface CampaignSecret {
  id: string;
  campaignId: string;
  castInstanceId: string | null;
  locationInstanceId: string | null;
  sublocationInstanceId: string | null;
  content: string;
  sortOrder: number;
  isRevealed: boolean;
  revealedAt: string | null;
}

export interface SecretRevealedEvent {
  secretId: string;
  campaignId: string;
  castInstanceId: string | null;
  locationInstanceId: string | null;
  sublocationInstanceId: string | null;
  factionInstanceId: string | null;
  secretContent: string;
}

export interface SecretResealedEvent {
  secretId: string;
  campaignId: string;
  castInstanceId: string | null;
  locationInstanceId: string | null;
  sublocationInstanceId: string | null;
}

export interface SecretCreatedEvent {
  secretId: string;
  campaignId: string;
  castInstanceId: string | null;
  locationInstanceId: string | null;
  sublocationInstanceId: string | null;
  content: string;
  sortOrder: number;
}

export interface SecretDeletedEvent {
  secretId: string;
  campaignId: string;
}

export interface CardVisibilityChangedEvent {
  campaignId: string;
  instanceId: string;
  cardType: 'location' | 'sublocation' | 'cast' | 'faction' | 'campaign-event' | 'campaign-handout' | 'player' | 'secret';
  isVisible: boolean;
  title?: string;
  body?: string;
  playerCardName?: string;
  playerCardRace?: string;
  playerCardClass?: string;
  playerCardImageUrl?: string;
}

export interface BulkCardVisibilityChangedEvent {
  campaignId: string;
  parentInstanceId: string;
  cardType: 'sublocation' | 'cast';
  isVisible: boolean;
}

export interface SecretDeliveredEvent {
  campaignId: string;
  playerUserId: string;
  content: string;
}

export interface SecretSharedEvent {
  playerCardId: string;
  secretId: string;
  sharedBy: string;
  secretContent: string;
  playerName: string;
  playerImageUrl: string;
  playerRaceClass: string;
}

export interface PlayerSecretDeletedEvent {
  campaignId: string;
  playerCardId: string;
  secretId: string;
}

/**
 * Card types cc-secrets-manager can manage secrets for.
 *
 * - `location` / `sublocation` / `cast` / `faction` → campaign card secrets
 *   (`campaign_secrets`, keyed by a typed FK column).
 * - `player` → player-card secrets (`player_card_secrets`, deliver/share semantics).
 *
 * NOTE: faction storage is not implemented on the backend yet — the type is
 * plumbed through so it becomes a drop-in once a `faction_instance_id` column
 * (and the matching API) exists.
 */
export type SecretCardType = 'location' | 'sublocation' | 'cast' | 'faction' | 'player';

/** Maps a campaign card type to the `EntityType` string the secrets API expects. */
export const SECRET_ENTITY_TYPE: Record<Exclude<SecretCardType, 'player'>, 'Location' | 'Sublocation' | 'Cast' | 'Faction'> = {
  location: 'Location',
  sublocation: 'Sublocation',
  cast: 'Cast',
  faction: 'Faction'
};

/**
 * Normalized secret view used by cc-secrets-manager across every card type so
 * the template can render campaign and player secrets identically.
 */
export interface ManagedSecret {
  id: string;
  content: string;
  /** Campaign cards: revealed to players. Player cards: shared with the party. */
  active: boolean;
  /** `revealedAt` (campaign) or `sharedAt` (player). */
  activeAt: string | null;
  /** Who shared it (player cards only). */
  sharedBy: string | null;
}

/** Type guard distinguishing player-card secrets from campaign secrets. */
export function isPlayerSecret(secret: CampaignSecret | PlayerCardSecret): secret is PlayerCardSecret {
  return 'isShared' in secret;
}
