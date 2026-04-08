export interface Location {
  id: string;
  dmUserId: string;
  name: string;
  classification: string;
  size: string;
  condition: string;
  geography: string;
  architecture: string;
  climate: string;
  religion: string;
  vibe: string;
  languages: string;
  description: string;
  imageUrl?: string;
  createdAt: string;
}

export interface CampaignLocationInstance extends Location {
  instanceId: string;
  campaignId: string;
  sourceLocationId: string;
  isVisibleToPlayers: boolean;
  sortOrder: number;
  keywords: string[];
  dmNotes: string;
}
