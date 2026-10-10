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

export interface PlayerSecretCreatedEvent {
  campaignId: string;
  playerCardId: string;
  secretId: string;
  content: string;
}

export interface PlayerSecretChangedEvent {
  campaignId: string;
  playerCardId: string;
  secretId: string;
  content: string;
}

export interface PlayerSecretDeletedEvent {
  campaignId: string;
  playerCardId: string;
  secretId: string;
}

export type SecretCardType = 'location' | 'sublocation' | 'cast' | 'faction' | 'player';

export const SECRET_ENTITY_TYPE: Record<Exclude<SecretCardType, 'player'>, 'Location' | 'Sublocation' | 'Cast' | 'Faction'> = {
  location: 'Location',
  sublocation: 'Sublocation',
  cast: 'Cast',
  faction: 'Faction'
};

export interface ManagedSecret {
  id: string;
  content: string;
  active: boolean;
  activeAt: string | null;
  sharedBy: string | null;
}

export function isPlayerSecret(secret: CampaignSecret | PlayerCardSecret): secret is PlayerCardSecret {
  return 'isShared' in secret;
}
