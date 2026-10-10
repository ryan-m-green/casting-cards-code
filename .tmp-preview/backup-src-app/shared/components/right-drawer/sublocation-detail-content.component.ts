import { Component, input, output, inject, computed, signal, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Sublocation, CampaignSublocationInstance, ShopItem } from '../../models/sublocation.model';
import { CampaignSecret } from '../../models/secret.model';
import { CampaignDetail } from '../../models/campaign.model';
import { environment } from '../../../../environments/environment';
import { CampaignShellService } from '../../../core/campaign-shell.service';
import { CampaignGmService } from '../../../core/campaign-gm.service';
import { CampaignHubService } from '../../../core/hub/campaign-hub.service';
import { DrawerService } from '../../../core/drawer.service';
import { CcSecretsManagerComponent, CcPortraitInputComponent } from '../v2';
import { SublocationService } from '../../../core/sublocation.service';
import { CcTextboxComponent } from '../v2/Shared/cc-textbox/cc-textbox.component';
import { CcDetailPanelActionsComponent } from '../v2/Shared/cc-detail-panel-actions/cc-detail-panel-actions.component';
import { CcShopInventoryComponent, ShopItemData } from '../v2';

type DetailTab = 'details' | 'secrets';

@Component({
  selector: 'app-sublocation-detail-content',
  standalone: true,
  imports: [CommonModule, FormsModule, CcDetailPanelActionsComponent, CcTextboxComponent, CcShopInventoryComponent, CcSecretsManagerComponent, CcPortraitInputComponent],
  templateUrl: './sublocation-detail-content.component.html',
  styleUrls: ['./sublocation-detail-content.component.scss']
})
export class SublocationDetailContentComponent implements OnInit, OnDestroy {
  private http = inject(HttpClient);
  private shellSvc = inject(CampaignShellService);
  private campaignGm = inject(CampaignGmService);
  private campaignHub = inject(CampaignHubService);
  private sublocationService = inject(SublocationService);
  private drawerService = inject(DrawerService);

  readonly isDm = this.campaignGm.isDm;

  /**
   * The item a purchase panel is standing open for, while it stands. The shop's own buttons are
   * held while it does, the way the v1 player page's shop holds them.
   */
  purchasingItemId = signal<string | null>(null);

  sublocation = input.required<Sublocation | CampaignSublocationInstance>();
  secrets = input.required<CampaignSecret[]>();
  campaignId = input.required<string>();
  sublocationInstanceId = input.required<string>();
  closeDrawer = output<void>();

  // Local reactive sublocation state that can be updated after save
  sublocationState = signal<Sublocation | CampaignSublocationInstance | null>(null);
  
  private subscriptions: any[] = [];
  cardType = input<'location' | 'sublocation' | 'cast' | 'faction'>('sublocation');

  // Detail tabs
  activeTab = signal<DetailTab>('details');

  setTab(tab: DetailTab): void {
    this.activeTab.set(tab);
  }

  // Edit mode state
  editing = signal<boolean>(false);

  // Portrait input state
  imageFile = signal<File | null>(null);

  // Editable field signals
  editName = signal('');
  editDescription = signal('');
  editDmNotes = signal('');
  editShopInventory = signal<ShopItemData[]>([]);

  // Endpoint mapping based on cardtype
  private getEndpointMapping(cardType: 'location' | 'sublocation' | 'cast' | 'faction') {
    const endpoints = {
      location: (campaignId: string, instanceId: string) => 
        `${environment.apiUrl}/api/campaign/${campaignId}/locationinstances/${instanceId}/image`,
      sublocation: (campaignId: string, instanceId: string) => 
        `${environment.apiUrl}/api/campaign/${campaignId}/sublocationinstances/${instanceId}/image`,
      cast: (campaignId: string, instanceId: string) => 
        `${environment.apiUrl}/api/campaign/${campaignId}/castinstances/${instanceId}/image`,
      faction: (campaignId: string, instanceId: string) => 
        `${environment.apiUrl}/api/campaign/${campaignId}/factioninstances/${instanceId}/image`
    };
    return endpoints[cardType];
  }

  // Get reactive sublocation data from local state, campaign state, or input
  campaign = this.shellSvc.campaign as any;
  currentSublocation = computed(() => {
    let subloc = this.sublocationState() as Sublocation | CampaignSublocationInstance | null;

    if (!subloc) {
      const camp = this.campaign() as CampaignDetail | null;
      if (!camp) {
        subloc = this.sublocation();
      } else {
        subloc = camp.sublocations.find((s: CampaignSublocationInstance) => s.instanceId === this.sublocationInstanceId()) ?? this.sublocation();
      }
    }

    if (!subloc || !subloc.shopItems) return subloc;

    // Return a new object with shopItems sorted alphabetically with natural number support
    return {
      ...subloc,
      shopItems: [...subloc.shopItems].sort((a, b) => this.naturalSort(a.name, b.name))
    };
  });

  private naturalSort(a: string, b: string): number {
    return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
  }

  shopItemCount = computed(() => this.currentSublocation().shopItems?.length ?? 0);

  hasField(...values: (string | undefined | null)[]): boolean {
    return values.some(v => v && v.trim().length > 0);
  }

  ngOnInit() {
    console.log('SublocationDetailContent - ngOnInit called');
    console.log('SublocationDetailContent - campaignId:', this.campaignId());
    console.log('SublocationDetailContent - sublocationInstanceId:', this.sublocationInstanceId());

    // Initialize local state from input
    this.sublocationState.set(this.sublocation());
    
    // Subscribe to SignalR events for shop item updates
    this.subscriptions.push(
      this.campaignHub.shopItemAdded$.subscribe(event => {
        console.log('SublocationDetailContent - shopItemAdded event received:', event);
        if (event && event.campaignId === this.campaignId() && event.sublocationInstanceId === this.sublocationInstanceId()) {
          console.log('SublocationDetailContent - Processing shopItemAdded for this sublocation');
          this.shellSvc.updateCampaign(campaign => {
            if (!campaign) return campaign;
            return {
              ...campaign,
              sublocations: campaign.sublocations.map(subloc =>
                subloc.instanceId === this.sublocationInstanceId()
                  ? {
                      ...subloc,
                      shopItems: [...(subloc.shopItems || []), event.shopItem]
                    }
                  : subloc
              )
            };
          });
        }
      })
    );

    this.subscriptions.push(
      this.campaignHub.shopItemUpdated$.subscribe(event => {
        console.log('SublocationDetailContent - shopItemUpdated event received:', event);
        if (event && event.campaignId === this.campaignId() && event.sublocationInstanceId === this.sublocationInstanceId()) {
          console.log('SublocationDetailContent - Processing shopItemUpdated for this sublocation');
          this.shellSvc.updateCampaign(campaign => {
            if (!campaign) return campaign;
            return {
              ...campaign,
              sublocations: campaign.sublocations.map(subloc =>
                subloc.instanceId === this.sublocationInstanceId()
                  ? {
                      ...subloc,
                      shopItems: subloc.shopItems?.map(item =>
                        item.id === event.shopItemId ? { ...item } : item
                      ) || []
                    }
                  : subloc
              )
            };
          });
        }
      })
    );

    this.subscriptions.push(
      this.campaignHub.shopItemScratchToggled$.subscribe(event => {
        console.log('SublocationDetailContent - shopItemScratchToggled event received:', event);
        if (!event || event.campaignId !== this.campaignId() || event.sublocationInstanceId !== this.sublocationInstanceId()) return;
        console.log('SublocationDetailContent - Processing shopItemScratchToggled for this sublocation');
        this.applyShopItemScratch(event.shopItemId, event.isScratchedOff);
      })
    );

    this.subscriptions.push(
      this.campaignHub.shopItemDeleted$.subscribe(event => {
        console.log('SublocationDetailContent - shopItemDeleted event received:', event);
        if (event && event.campaignId === this.campaignId() && event.sublocationInstanceId === this.sublocationInstanceId()) {
          console.log('SublocationDetailContent - Processing shopItemDeleted for this sublocation');
          this.shellSvc.updateCampaign(campaign => {
            if (!campaign) return campaign;
            return {
              ...campaign,
              sublocations: campaign.sublocations.map(subloc =>
                subloc.instanceId === this.sublocationInstanceId()
                  ? {
                      ...subloc,
                      shopItems: subloc.shopItems?.filter(item => item.id !== event.shopItemId) || []
                    }
                  : subloc
              )
            };
          });
        }
      })
    );

    this.subscriptions.push(
      this.campaignHub.sublocationInstanceUpdated$.subscribe(event => {
        console.log('SublocationDetailContent - sublocationInstanceUpdated event received:', event);
        if (event && event.campaignId === this.campaignId() && event.sublocationInstanceId === this.sublocationInstanceId()) {
          console.log('SublocationDetailContent - Processing sublocationInstanceUpdated for this sublocation');
          // Trigger a full campaign refresh when sublocation is updated
          this.shellSvc.updateCampaign(campaign => campaign);
        }
      })
    );
  }

  ngOnDestroy() {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  toggleScratch(item: any): void {
    if (!this.isDm()) return;
    console.log('toggleScratch called for item:', item.name);

    this.sublocationService.toggleShopItemScratch(
      this.campaignId(),
      this.sublocationInstanceId(),
      item.id
    ).subscribe({
      next: (updatedSublocation) => {
        console.log('Scratch toggled successfully, updated sublocation:', updatedSublocation);
        this.sublocationState.set(updatedSublocation);
      },
      error: (err) => {
        console.error('Error toggling scratch:', err);
      }
    });
  }

  /**
   * Marks one item out (or back in) on the shelf this panel is holding, in place.
   *
   * The GM's own OUT/SOLD toggle is written out to every client through the hub (see the
   * `ShopItemScratchToggled` event), so this is what lets a player's panel — the very same panel,
   * opened on the same card — strike the item through and take its buy control away the moment the
   * GM marks it, without a refresh of its own. It is marked on the panel's own copy of the
   * sublocation, which is the copy it draws from (see `currentSublocation`), so both halves of the
   * panel — the GM's and the player's — are only ever looking at one shelf.
   */
  private applyShopItemScratch(itemId: string, isScratchedOff: boolean): void {
    const mark = (subloc: Sublocation | CampaignSublocationInstance): Sublocation | CampaignSublocationInstance => ({
      ...subloc,
      shopItems: (subloc.shopItems ?? []).map(item =>
        item.id === itemId ? { ...item, isScratchedOff } : item
      )
    });

    this.sublocationState.set(mark(this.sublocationState() ?? this.sublocation()));
  }

  /**
   * Opens the shop's purchase panel for an item, where a player buys it. The app's own right
   * drawer — the very drawer this panel is standing in — swaps what it holds for the purchase (see
   * DrawerService), so the item is handed over the shop it was picked from, and the drawer shuts on
   * the write's own answer. What is bought and for how much is the server's own call: the panel
   * only carries the item there.
   *
   * Only a viewer without the GM role can reach this — the GM has the shop's own controls instead —
   * and only one purchase stands at a time, so the shop's buttons are held while one does.
   */
  openPurchaseDrawer(item: ShopItem): void {
    if (this.isDm()) return;
    if (this.purchasingItemId() !== null) return;

    this.purchasingItemId.set(item.id);
    this.drawerService.openShopPurchase({
      campaignId: this.campaignId(),
      sublocationInstanceId: this.sublocationInstanceId(),
      item
    });
  }

  startEditing() {
    if (!this.isDm()) return;
    const subloc = this.currentSublocation();
    this.editName.set(subloc.name || '');
    this.editDescription.set(subloc.description || '');
    this.editDmNotes.set((subloc as CampaignSublocationInstance).dmNotes || '');
    this.editShopInventory.set(this.convertShopItemsToShopItemData(subloc.shopItems || []));
    this.imageFile.set(null);
    this.editing.set(true);
  }

  saveDetails() {
    if (!this.isDm()) return;
    const subloc = this.currentSublocation();
    const campaignId = this.campaignId();
    const file = this.imageFile();
    const currentCardType = this.cardType();

    // Save always drops the panel out of edit mode, regardless of the async
    // persistence outcome (mirrors the Cancel behaviour).
    this.editing.set(false);

    console.log('SublocationDetailContent - saveDetails called');
    console.log('SublocationDetailContent - campaignId:', campaignId);
    console.log('SublocationDetailContent - instanceId:', (subloc as CampaignSublocationInstance).instanceId);
    console.log('SublocationDetailContent - cardType:', currentCardType);
    console.log('SublocationDetailContent - has file:', !!file);

    if (!campaignId || !(subloc as CampaignSublocationInstance).instanceId) {
      console.warn('Cannot save: missing campaignId or instanceId');
      this.editing.set(false);
      return;
    }

    const instanceId = (subloc as CampaignSublocationInstance).instanceId;
    const sourceSublocationId = (subloc as CampaignSublocationInstance).sourceSublocationId;

    const details = {
      name: this.editName(),
      description: this.editDescription(),
      dmNotes: this.editDmNotes()
    };

    // Save sublocation details first
    this.sublocationService.saveSublocationDetails(campaignId, instanceId, details).subscribe({
      next: (updatedSublocation) => {
        console.log('SublocationDetailContent - Details saved successfully');
        this.sublocationState.set(updatedSublocation);

        // Save shop inventory changes
        this.saveShopInventory(campaignId, instanceId).then(() => {
          // Upload image if selected
          if (file) {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('sourceSublocationId', sourceSublocationId);
            const endpoint = this.getEndpointMapping(currentCardType);
            const url = endpoint(campaignId, instanceId);
            console.log('SublocationDetailContent - uploading image to:', url);
            this.http.post(
              url,
              formData
            ).subscribe({
              next: () => {
                console.log('SublocationDetailContent - Image uploaded successfully');
                this.imageFile.set(null);
                this.editing.set(false);
              },
              error: (err) => {
                console.error('SublocationDetailContent - Failed to upload image:', err);
                this.editing.set(false);
              }
            });
          } else {
            this.editing.set(false);
          }
        });
      },
      error: (err) => {
        console.error('SublocationDetailContent - Failed to save details:', err);
        this.editing.set(false);
      }
    });
  }

  saveToLibrary() {
    this.saveDetails();
  }

  cancelEditing() {
    this.editing.set(false);
  }

  closePanel() {
    this.editing.set(false);
    this.closeDrawer.emit();
  }

  private convertShopItemsToShopItemData(shopItems: any[]): ShopItemData[] {
    return shopItems.map(item => ({
      name: item.name || '',
      priceAmount: item.priceAmount ?? null,
      priceCurrencyType: item.priceCurrencyType || 'gp',
      description: item.description || ''
    }));
  }

  private saveShopInventory(campaignId: string, instanceId: string): Promise<void> {
    const currentShopItems = this.currentSublocation().shopItems || [];
    const editedShopItems = this.editShopInventory();

    console.log('saveShopInventory - currentShopItems:', currentShopItems);
    console.log('saveShopInventory - editedShopItems:', editedShopItems);

    return new Promise((resolve, reject) => {
      this.sublocationService.saveShopItems(campaignId, instanceId, currentShopItems, editedShopItems).subscribe({
        next: (updatedSublocation) => {
          console.log('Shop items saved successfully, updated sublocation:', updatedSublocation);
          // Update local sublocation state so the drawer reflects server state
          this.sublocationState.set(updatedSublocation);
          resolve();
        },
        error: (err) => {
          console.error('Error saving shop items:', err);
          reject(err);
        }
      });
    });
  }
}
