export type SubscriptionStatus = 'FreeTrial' | 'Active' | 'PastDue' | 'Canceled';
export type PricingModelName = 'FreeTrial' | 'Alpha' | 'Beta' | 'V1';
export type LockLevel = 'FullAccess' | 'SoftLock' | 'HardLock' | 'Suspended';

export interface Subscription {
  id: string;
  userId: string;
  status: SubscriptionStatus;
  pricingModelId?: string;
  bypassPayment: boolean;
  lockLevel: LockLevel;
  currentPeriodEnd?: string;
  createdAt: string;
  pastDueSince?: string;
}

export interface PricingModel {
  id: string;
  modelName: PricingModelName;
  priceInCents: number;
  stripePriceId?: string;
  isActive: boolean;
}

export interface EntityLimits {
  campaigns: number;
  locations: number;
  sublocations: number;
  factions: number;
  cast: number;
}
