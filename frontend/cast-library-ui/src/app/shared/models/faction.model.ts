export interface Faction {
  id: string;
  dmUserId: string;
  name: string;
  type: string;
  influence: number;
  perception?: number;
  hidden: boolean;
  description?: string;
  dmNotes?: string;
  symbolPath?: string;
  imageUrl?: string;
  createdAt: string;
}

export interface CreateFactionRequest {
  name: string;
  type: string;
  hidden: boolean;
  description?: string;
  dmNotes?: string;
  symbolPath?: string;
}

export interface FactionRelationship {
  id: string;
  campaignId: string;
  factionInstanceIdA: string;
  factionInstanceIdB: string;
  relationshipType: string;
  strength: number;
  createdAt: string;
  dmUserId: string | null;
}

export interface FactionPlayerNotes {
  id: string;
  campaignId: string;
  factionInstanceId: string;
  perception: number | null;
  influence: number | null;
  playerNotes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CampaignFactionInstance {
  factionInstanceId: string;
  sourceFactionId: string;
  campaignId: string;
  dmUserId: string;
  name: string;
  type: string;
  influence: number;
  perception: number;
  hidden: boolean;
  isVisibleToPlayers: boolean;
  description?: string;
  dmNotes?: string;
  symbolPath?: string;
  createdAt: string;
  subLocationInstanceIds: string[];
  castInstanceIds: string[];
  primarySublocationInstanceId?: string;
  primaryCastInstanceId?: string;
  factionRelationships: FactionRelationship[];
}
