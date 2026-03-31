import { CampaignCityInstance } from './city.model';
import { CampaignCastInstance } from './cast.model';
import { CampaignSecret } from './secret.model';
import { CampaignLocationInstance } from './location.model';

export interface CampaignCastRelationship {
  id: string;
  campaignId: string;
  sourceCastInstanceId: string;
  targetCastInstanceId: string;
  value: number;
  explanation: string | null;
  createdAt: string;
  updatedAt: string;
}

export type CampaignStatus = 'Active' | 'Paused' | 'Completed';

export interface Campaign {
  id: string;
  dmUserId: string;
  name: string;
  description: string;
  fantasyType: string;
  status: CampaignStatus;
  spineColor: string;
  playerCount: number;
  cityCount: number;
  createdAt: string;
}

export interface CampaignPlayer {
  userId: string;
  displayName: string;
  email: string;
  startingGold: number;
  currentGold: number;
}

export interface CampaignInviteCode {
  code: string;
  expiresAt: string;
}

export interface CampaignDetail {
  id: string;
  name: string;
  fantasyType: string;
  description: string;
  spineColor: string;
  status: CampaignStatus;
  cities: CampaignCityInstance[];
  casts: CampaignCastInstance[];
  locations: CampaignLocationInstance[];
  secrets: CampaignSecret[];
  players: CampaignPlayer[];
  relationships: CampaignCastRelationship[];
  inviteCode: CampaignInviteCode | null;
}

export interface CampaignNote {
  id: string;
  campaignId: string;
  entityType: 'Cast' | 'City' | 'Location';
  instanceId: string;
  content: string;
  createdByDisplayName: string;
  createdAt: string;
  updatedAt: string;
}

export interface CampaignCastPlayerNotes {
  id: string;
  campaignId: string;
  castInstanceId: string;
  want: string;
  connections: string[];
  alignment: string;
  perception: number;
  rating: number;
  updatedAt: string;
}

export interface CityFaction {
  id: string;
  name: string;
  type: string;
  influence: number;
  isHidden: boolean;
  sortOrder: number;
}

export interface CityFactionRelationship {
  id: string;
  factionAId: string;
  factionBId: string;
  relationshipType: string;
  strength: number;
  notes: string;
}

export interface CityNpcRole {
  id: string;
  castInstanceId: string;
  factionId: string;
  role: string;
  motivation: string;
}

export interface CityPoliticalNotes {
  id: string;
  campaignId: string;
  cityInstanceId: string;
  generalNotes: string;
  factions: CityFaction[];
  relationships: CityFactionRelationship[];
  npcRoles: CityNpcRole[];
  updatedAt: string;
}

export interface GoldTransaction {
  id: string;
  campaignId: string;
  playerUserId: string | null;
  amount: number;
  transactionType: 'DM_GRANT' | 'PURCHASE' | 'ADJUSTMENT';
  description: string;
  createdAt: string;
}
