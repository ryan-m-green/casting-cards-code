import { CampaignLocationInstance } from './location.model';
import { CampaignCastInstance } from './cast.model';
import { CampaignSecret } from './secret.model';
import { CampaignSublocationInstance } from './sublocation.model';

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
  locationCount: number;
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
  locations: CampaignLocationInstance[];
  casts: CampaignCastInstance[];
  sublocations: CampaignSublocationInstance[];
  secrets: CampaignSecret[];
  players: CampaignPlayer[];
  relationships: CampaignCastRelationship[];
  inviteCode: CampaignInviteCode | null;
}

export interface CampaignNote {
  id: string;
  campaignId: string;
  entityType: 'Cast' | 'Location' | 'Sublocation';
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

export interface LocationFaction {
  id: string;
  name: string;
  type: string;
  influence: number;
  isHidden: boolean;
  sortOrder: number;
}

export interface LocationFactionRelationship {
  id: string;
  factionAId: string;
  factionBId: string;
  relationshipType: string;
  strength: number;
  notes: string;
}

export interface LocationNpcRole {
  id: string;
  castInstanceId: string;
  factionId: string;
  role: string;
  motivation: string;
}

export interface LocationPoliticalNotes {
  id: string;
  campaignId: string;
  locationInstanceId: string;
  generalNotes: string;
  factions: LocationFaction[];
  relationships: LocationFactionRelationship[];
  npcRoles: LocationNpcRole[];
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
