import { Injectable, OnDestroy, inject } from '@angular/core';
import { Subscription } from 'rxjs';
import { CampaignHubService } from '../campaign-hub.service';

export interface ShopItemDeletedEvent {
  campaignId: string;
  sublocationInstanceId: string;
  shopItemId: string;
}

export interface ShopItemAddedEvent {
  campaignId: string;
  sublocationInstanceId: string;
  shopItem: {
    id: string;
    name: string;
    priceAmount: number;
    priceCurrencyType: string;
    description: string;
    isScratchedOff: boolean;
  };
}

export interface ShopItemUpdatedEvent {
  campaignId: string;
  sublocationInstanceId: string;
  shopItemId: string;
}

export interface ShopItemScratchToggledEvent {
  campaignId: string;
  sublocationInstanceId: string;
  shopItemId: string;
  isScratchedOff: boolean;
}

@Injectable({ providedIn: 'root' })
export class ShopEventService implements OnDestroy {
  private hub = inject(CampaignHubService);
  private subscriptions: Subscription[] = [];

  readonly shopItemDeleted$ = this.hub.shopItemDeleted$;
  readonly shopItemAdded$ = this.hub.shopItemAdded$;
  readonly shopItemUpdated$ = this.hub.shopItemUpdated$;
  readonly shopItemScratchToggled$ = this.hub.shopItemScratchToggled$;

  constructor() {
    this.subscriptions.push(
      this.hub.shopItemDeleted$.subscribe(),
      this.hub.shopItemAdded$.subscribe(),
      this.hub.shopItemUpdated$.subscribe(),
      this.hub.shopItemScratchToggled$.subscribe()
    );
  }

  ngOnDestroy() {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }
}
