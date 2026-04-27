export interface ShopItem {
  id: string;
  name: string;
  price: string;
  description: string;
  isScratchedOff: boolean;
}

export interface Sublocation {
  id: string;
  locationId: string;
  dmUserId: string;
  name: string;
  description: string;
  imageUrl?: string;
  shopItems: ShopItem[];
  createdAt: string;
}

export interface CampaignSublocationInstance {
  instanceId: string;
  campaignId: string;
  sourceSublocationId: string;
  locationInstanceId: string;
  name: string;
  description: string;
  imageUrl?: string;
  shopItems: ShopItem[];
  isVisibleToPlayers: boolean;
  dmNotes: string;
  keywords: string[];
  customItems: { name: string; price: string }[];
  isPartyAnchor: boolean;
}
