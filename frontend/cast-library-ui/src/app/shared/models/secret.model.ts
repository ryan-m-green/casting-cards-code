export interface CampaignSecret {
  id: string;
  campaignId: string;
  castInstanceId: string | null;
  cityInstanceId: string | null;
  locationInstanceId: string | null;
  content: string;
  sortOrder: number;
  isRevealed: boolean;
  revealedAt: string | null;
}

export interface SecretRevealedEvent {
  secretId: string;
  campaignId: string;
  castInstanceId: string | null;
  cityInstanceId: string | null;
  locationInstanceId: string | null;
  secretContent: string;
}

export interface SecretResealedEvent {
  secretId: string;
  campaignId: string;
  castInstanceId: string | null;
  cityInstanceId: string | null;
  locationInstanceId: string | null;
}

export interface CardVisibilityChangedEvent {
  campaignId: string;
  instanceId: string;
  cardType: 'city' | 'location' | 'cast';
  isVisible: boolean;
}

export interface BulkCardVisibilityChangedEvent {
  campaignId: string;
  parentInstanceId: string;
  cardType: 'location' | 'cast';
  isVisible: boolean;
}
