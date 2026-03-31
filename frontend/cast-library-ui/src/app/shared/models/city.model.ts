export interface City {
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

export interface CampaignCityInstance extends City {
  instanceId: string;
  campaignId: string;
  sourceCityId: string;
  isVisibleToPlayers: boolean;
  sortOrder: number;
  keywords: string[];
}
