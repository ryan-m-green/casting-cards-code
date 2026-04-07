export interface ShopItem {
  id: string;
  name: string;
  price: string;
  description: string;
  isScratchedOff: boolean;
}

export interface Location {
  id: string;
  cityId: string;
  dmUserId: string;
  name: string;
  description: string;
  imageUrl?: string;
  shopItems: ShopItem[];
  createdAt: string;
}

export interface CampaignLocationInstance extends Location {
  instanceId: string;
  campaignId: string;
  sourceLocationId: string;
  cityInstanceId: string;
  isVisibleToPlayers: boolean;
  dmNotes: string;
  keywords: string[];
}
