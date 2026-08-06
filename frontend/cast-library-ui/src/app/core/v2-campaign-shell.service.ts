import { Injectable, signal, computed, TemplateRef } from '@angular/core';
import { Subject } from 'rxjs';
import { CampaignDetail } from '../shared/models/campaign.model';
import { VoidTitleContext } from '../shared/components/void-title-segments/void-title-segments.component';
import { PlayerCardWithDetails } from '../shared/models/player-card.model';

@Injectable({ providedIn: 'root' })
export class V2CampaignShellService {
  // ── Core State ───────────────────────────────────────────────────────────────
  title = signal('');
  titleContext = signal<VoidTitleContext | null>(null);
  voidTitleTopMargin = signal('10px');
  campaign = signal<CampaignDetail | null>(null);
  
  // ── Role Detection ────────────────────────────────────────────────────────────
  // Computed property to determine if current user is DM
  isDm = computed(() => {
    const camp = this.campaign();
    if (!camp) return false;
    // This will be set from the component based on auth service
    return this._isDm;
  });
  
  private _isDm = false;
  
  // ── Event Streams ─────────────────────────────────────────────────────────────
  openChronicleWithSearch = new Subject<string>();
  openPartyGold = new Subject<void>();
  openShopPurchase = new Subject<{ item: any; sublocationInstanceId: string }>();
  shopPurchaseComplete = new Subject<any>();
  partyGoldAwarded = new Subject<{ currency: string; playerAwards: { playerUserId: string; amount: number }[] }>();
  
  // Drawer state
  openDrawerRequest = new Subject<{ title: string; template: TemplateRef<any>; context: any }>();
  
  // ── Title Management ───────────────────────────────────────────────────────────
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
  
  // ── Campaign Management ───────────────────────────────────────────────────────
  setCampaign(c: CampaignDetail) { 
    this.campaign.set(c); 
  }
  
  updateCampaign(updater: (c: CampaignDetail | null) => CampaignDetail | null) {
    this.campaign.update(updater);
  }
  
  // ── Role Management ────────────────────────────────────────────────────────────
  setIsDm(isDm: boolean) {
    this._isDm = isDm;
  }
  
  // ── Drawer Management ──────────────────────────────────────────────────────────
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