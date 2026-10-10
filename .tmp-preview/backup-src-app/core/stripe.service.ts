import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { Subscription } from '../shared/models/subscription.model';

export interface PricingDisplayResponse {
  v1: PricingDisplay;
  active: PricingDisplay | null;
  subscriptionLimits: SubscriptionLimits | null;
}

export interface PricingDisplay {
  modelName: string;
  priceInCents: number;
  stripePriceId: string;
}

export interface SubscriptionLimits {
  freeTrial: SubscriptionTier;
  paid: SubscriptionTier;
}

export interface SubscriptionTier {
  campaigns: number;
  locations: number;
  sublocations: number;
  factions: number;
  cast: number;
}

export interface EntityLimitInfo {
  currentCount: number;
  limit: number;
  limitReached: boolean;
}

export interface EntityLimitsResponse {
  campaigns: EntityLimitInfo;
  locations: EntityLimitInfo;
  sublocations: EntityLimitInfo;
  factions: EntityLimitInfo;
  cast: EntityLimitInfo;
}

@Injectable({ providedIn: 'root' })
export class StripeService {
  constructor(private http: HttpClient) {}

  createFreeTrialSubscription(): Observable<Subscription> {
    return this.http.post<Subscription>(`${environment.apiUrl}/api/subscription/free-trial`, {});
  }

  getUserSubscription(): Observable<Subscription> {
    return this.http.get<Subscription>(`${environment.apiUrl}/api/subscription/user`);
  }

  getPricingDisplay(): Observable<PricingDisplayResponse> {
    return this.http.get<PricingDisplayResponse>(`${environment.apiUrl}/api/site-configuration/pricing`);
  }

  createCheckoutSession(): Observable<{ checkoutUrl: string }> {
    return this.http.post<{ checkoutUrl: string }>(`${environment.apiUrl}/api/stripe/create-checkout-session`, {});
  }

  getUserEntityLimits(): Observable<EntityLimitsResponse> {
    return this.http.get<EntityLimitsResponse>(`${environment.apiUrl}/api/subscription/entity-limits`);
  }

  createCustomerPortalSession(): Observable<{ portalUrl: string }> {
    return this.http.post<{ portalUrl: string }>(`${environment.apiUrl}/api/stripe/create-customer-portal-session`, {});
  }

  async redirectToCustomerPortal(): Promise<void> {
    try {
      const response = await firstValueFrom(this.createCustomerPortalSession());
      if (response?.portalUrl) {
        window.location.href = response.portalUrl;
      }
    } catch (error) {
    }
  }
}
