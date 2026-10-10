export interface SubscriptionLimitsDomain {
  FreeTrial: FreeTrialLimits;
  Paid: PaidLimits;
}

export interface FreeTrialLimits {
  Campaigns: number;
  Locations: number;
  Sublocations: number;
  Factions: number;
  Cast: number;
}

export interface PaidLimits {
  Campaigns: number;
  Locations: number;
  Sublocations: number;
  Factions: number;
  Cast: number;
}

export interface StopWordsDomain {
  words: string[];
}

export interface DoodleArtDomain {
  ArtItems: string[];
}

export interface StripeConfigurationDomain {
  testAccount: StripeAccount;
  liveAccount: StripeAccount;
  activeAccount: string;
}

export interface StripeAccount {
  secretKey: string;
  publishableKey: string;
  webhookSecret: string;
  successUrl: string;
  cancelUrl: string;
  returnUrl: string;
}
