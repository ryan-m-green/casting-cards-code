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
}
