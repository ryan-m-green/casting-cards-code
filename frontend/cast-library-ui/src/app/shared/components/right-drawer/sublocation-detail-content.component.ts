import { Component, input, output, inject, computed, signal, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Sublocation, CampaignSublocationInstance } from '../../models/sublocation.model';
import { CampaignSecret } from '../../models/secret.model';
import { CampaignDetail } from '../../models/campaign.model';
import { environment } from '../../../../environments/environment';
import { CampaignShellService } from '../../../core/campaign-shell.service';
import { CampaignHubService } from '../../../core/hub/campaign-hub.service';
import { CcSecretsManagerComponent, CcPortraitInputComponent } from '../v2';
import { SublocationService } from '../../../core/sublocation.service';
import { CcTextboxComponent } from '../v2/cc-textbox/cc-textbox.component';
import { CcDetailPanelActionsComponent } from '../v2/cc-detail-panel-actions/cc-detail-panel-actions.component';
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
  private campaignHub = inject(CampaignHubService);
  private sublocationService = inject(SublocationService);

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

  startEditing() {
    const subloc = this.currentSublocation();
    this.editName.set(subloc.name || '');
    this.editDescription.set(subloc.description || '');
    this.editDmNotes.set((subloc as CampaignSublocationInstance).dmNotes || '');
    this.editShopInventory.set(this.convertShopItemsToShopItemData(subloc.shopItems || []));
    this.imageFile.set(null);
    this.editing.set(true);
  }

  saveDetails() {
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
