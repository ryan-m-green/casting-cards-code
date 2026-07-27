import { Injectable, signal, TemplateRef } from '@angular/core';
import { Subject } from 'rxjs';
import { CampaignDetail } from '../shared/models/campaign.model';
import { VoidTitleContext } from '../shared/components/void-title-segments/void-title-segments.component';
import { PlayerCardWithDetails } from '../shared/models/player-card.model';

@Injectable({ providedIn: 'root' })
export class CampaignShellService {
  title              = signal('');
  titleContext       = signal<VoidTitleContext | null>(null);
  voidTitleTopMargin = signal('10px');
  campaign           = signal<CampaignDetail | null>(null);
  openChronicleWithSearch = new Subject<string>();
  openPartyGold = new Subject<void>();
  openShopPurchase = new Subject<{ item: any; sublocationInstanceId: string }>();
  shopPurchaseComplete = new Subject<any>();
  partyGoldAwarded = new Subject<{ currency: string; playerAwards: { playerUserId: string; amount: number }[] }>();

  // Drawer state
  openDrawerRequest = new Subject<{ title: string; template: TemplateRef<any>; context: any }>();

  setTitle(title: string, topMargin = '10px') {
    this.title.set(title);
    this.titleContext.set(null);
    this.voidTitleTopMargin.set(topMargin);
  }

  setTitleContext(context: VoidTitleContext, topMargin = '10px') {
    this.title.set('');
    this.titleContext.set(context);
    this.voidTitleTopMargin.set(topMargin);
  }

  setCampaign(c: CampaignDetail) { this.campaign.set(c); }
  updateCampaign(updater: (c: CampaignDetail | null) => CampaignDetail | null) {
    this.campaign.update(updater);
  }

  openChronicleDrawerWithSearch(query: string) {
    this.openChronicleWithSearch.next(query);
  }

  openDrawerWithContent(title: string, template: TemplateRef<any>, context: any) {
    this.openDrawerRequest.next({ title, template, context });
  }

  openPartyGoldDrawer() {
    this.openPartyGold.next();
  }

  openShopPurchaseDrawer(item: any, sublocationInstanceId: string) {
    this.openShopPurchase.next({ item, sublocationInstanceId });
  }
}
