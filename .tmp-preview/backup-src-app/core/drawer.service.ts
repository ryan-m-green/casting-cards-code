import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

export type DrawerContentType = 
  | 'subscription'
  | 'shop-purchase'
  | 'location-detail'
  | 'sublocation-detail'
  | 'cast-detail'
  | 'faction-detail';

export interface DrawerConfig {
  contentType: DrawerContentType;
  title?: string;
  context?: any;
  onOpen?: () => Promise<void> | void;
  onClose?: () => Promise<void> | void;
}

@Injectable({ providedIn: 'root' })
export class DrawerService {
  private openRequest$ = new Subject<DrawerConfig>();

  readonly open$ = this.openRequest$.asObservable();

  open(config: DrawerConfig): void {
    this.openRequest$.next(config);
  }

  openSubscription(context?: any): void {
    this.open({
      contentType: 'subscription',
      title: 'Upgrade Your Plan',
      context
    });
  }

  openShopPurchase(context?: any): void {
    this.open({
      contentType: 'shop-purchase',
      title: 'Shop Purchase',
      context
    });
  }

  openLocationDetail(context?: any): void {
    this.open({
      contentType: 'location-detail',
      title: 'Location Details',
      context
    });
  }

  openSublocationDetail(context?: any): void {
    this.open({
      contentType: 'sublocation-detail',
      title: 'Sublocation Details',
      context
    });
  }

  openCastDetail(context?: any): void {
    this.open({
      contentType: 'cast-detail',
      title: 'Character Details',
      context
    });
  }

  openFactionDetail(context?: any): void {
    this.open({
      contentType: 'faction-detail',
      title: 'Faction Details',
      context
    });
  }
}
