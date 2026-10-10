import { CampaignLocationInstance } from './location.model';
import { CampaignCastInstance } from './cast.model';
import { CampaignSecret } from './secret.model';
import { CampaignSublocationInstance } from './sublocation.model';
import { TimeOfDay } from './time-of-day.model';
import { CampaignFactionInstance } from './faction.model';

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
  isDemo?: boolean | null;
  createdAt: string;
}

export interface CampaignPlayer {
  userId: string;
  displayName: string;
  email: string;
  playerCardName: string;
  playerCardRace: string;
  playerCardClass: string;
  imageUrl: string;
}

export interface CampaignInviteCode {
  code: string;
  expiresAt: string;
}

export interface CampaignDetail {
  id: string;
  dmUserId: string;
  name: string;
  fantasyType: string;
  description: string;
  spineColor: string;
  worldMapImageUrl: string | null;
  status: CampaignStatus;
  isDemo?: boolean | null;
  locations: CampaignLocationInstance[];
  casts: CampaignCastInstance[];
  sublocations: CampaignSublocationInstance[];
  secrets: CampaignSecret[];
  players: CampaignPlayer[];
  inviteCode: CampaignInviteCode | null;
  timeOfDay: TimeOfDay | null;
  factions: CampaignFactionInstance[];
}

export interface CampaignPlayerNotes {
  id: string;
  campaignId: string;
  notes: string;
}

export interface LocationFaction {
  id: string;
  name: string;
  type: string;
  influence: number;
  isHidden: boolean;
  sortOrder: number;
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
