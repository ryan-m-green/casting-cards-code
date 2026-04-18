export interface PlayerCard {
  id: string;
  campaignId: string;
  playerUserId: string;
  playerDisplayName: string;
  name: string;
  race: string;
  class: string;
  imageUrl?: string;
  description?: string;
}

export interface PlayerCardWithDetails extends PlayerCard {
  conditions: PlayerCardCondition[];
  currencyBalances: { currency: string; amount: number }[];
}

export interface PlayerCardCondition {
  id: string;
  playerCardId: string;
  conditionName: string;
  assignedAt: string;
}

export interface PlayerMemory {
  id: string;
  playerCardId: string;
  sessionNumber?: number;
  memoryType: 'KEY_EVENT' | 'ENCOUNTER' | 'DISCOVERY' | 'DECISION' | 'LOSS' | 'BOND';
  title: string;
  detail?: string;
  memoryDate: string;
  createdAt: string;
}

export interface PlayerTrait {
  id: string;
  playerCardId: string;
  traitType: 'GOAL' | 'FEAR' | 'FLAW';
  content: string;
  isCompleted: boolean;
  createdAt: string;
}

export interface PlayerCardSecret {
  id: string;
  playerCardId: string;
  content: string;
  isShared: boolean;
  sharedAt?: string;
  sharedBy?: 'DM' | 'PLAYER';
  deliveredAt: string;
}

export interface PlayerCastPerception {
  id: string;
  playerCardId: string;
  castInstanceId?: string;
  locationInstanceId?: string;
  sublocationInstanceId?: string;
  impression: string;
  updatedAt: string;
}

export interface DiscoveredCastResponse {
  partyCards: PlayerCardWithDetails[];
  people: DiscoveredPerson[];
  locations: DiscoveredPlace[];
  sublocations: DiscoveredPlace[];
}

export interface DiscoveredPerson {
  instanceId: string;
  name: string;
  role: string;
  race: string;
  publicDescription: string;
  imageUrl?: string;
}

export interface DiscoveredPlace {
  instanceId: string;
  name: string;
  classification?: string;
  description?: string;
  imageUrl?: string;
}

export interface GoldAwardedEvent {
  campaignId: string;
  playerUserId: string | null;
  amount: number;
  currency: string;
  note: string | null;
}

export interface ConditionRemovedEvent {
  playerCardId: string;
  conditionId: string;
  tickCount: number;
}

export interface ConditionAssignedEvent {
  playerCardId: string;
  conditionId: string;
  conditionName: string;
  assignedAt: string;
  tickCount: number;
}
