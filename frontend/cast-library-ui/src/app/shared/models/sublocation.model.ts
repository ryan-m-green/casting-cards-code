export interface ShopItem {
  id: string;
  name: string;
  price: string;
  description: string;
  isScratchedOff: boolean;
}

export interface Sublocation {
  id: string;
  cityId: string;
  dmUserId: string;
  name: string;
  description: string;
  imageUrl?: string;
  shopItems: ShopItem[];
  createdAt: string;
}

export interface CampaignSublocationInstance extends Sublocation {
  instanceId: string;
  campaignId: string;
  sourceSublocationId: string;
  cityInstanceId: string;
  isVisibleToPlayers: boolean;
  dmNotes: string;
  keywords: string[];
}
