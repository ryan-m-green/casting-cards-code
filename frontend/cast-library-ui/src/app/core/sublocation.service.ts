import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, forkJoin } from 'rxjs';
import { environment } from '../../environments/environment';
import { CampaignSublocationInstance } from '../shared/models/sublocation.model';
import { CampaignShellService } from './campaign-shell.service';

export interface ShopItemData {
  id?: string;
  name: string;
  priceAmount: number | null;
  priceCurrencyType: string;
  description: string;
  isScratchedOff?: boolean;
}

@Injectable({ providedIn: 'root' })
export class SublocationService {
  private http = inject(HttpClient);
  private shellSvc = inject(CampaignShellService);

  getSublocation(campaignId: string, instanceId: string): Observable<CampaignSublocationInstance> {
    return this.http.get<CampaignSublocationInstance>(
      `${environment.apiUrl}/api/campaign/${campaignId}/sublocationinstances/${instanceId}`
    );
  }

  private getItemKey(item: any): string {
    const name = (item.name || '').trim().toLowerCase();
    const priceAmount = Number(item.priceAmount) || 0;
    const priceCurrencyType = (item.priceCurrencyType || 'gp').toString().trim().toLowerCase();
    return `${name}-${priceAmount}-${priceCurrencyType}`;
  }

  saveShopItems(campaignId: string, instanceId: string, currentShopItems: any[], editedShopItems: ShopItemData[]): Observable<CampaignSublocationInstance> {
    // Map existing items by their properties to identify updates vs creates
    const existingItemMap = new Map<string, any>();
    console.log('SublocationService.saveShopItems - currentShopItems:', currentShopItems);
    console.log('SublocationService.saveShopItems - editedShopItems:', editedShopItems);

    currentShopItems.forEach(item => {
      const key = this.getItemKey(item);
      existingItemMap.set(key, item);
    });

    console.log('SublocationService.saveShopItems - existingItemMap keys:', Array.from(existingItemMap.keys()));

    const operations: Observable<any>[] = [];

    // Process edited items
    editedShopItems.forEach(editedItem => {
      const key = this.getItemKey(editedItem);
      const existingItem = existingItemMap.get(key);

      if (existingItem) {
        // Update existing item, preserving isScratchedOff state
        operations.push(
          this.http.patch(
            `${environment.apiUrl}/api/campaigns/${campaignId}/sublocations/${instanceId}/shop-items/${existingItem.id}`,
            {
              name: editedItem.name,
              priceAmount: editedItem.priceAmount || 0,
              priceCurrencyType: editedItem.priceCurrencyType,
              description: editedItem.description
            }
          )
        );
        existingItemMap.delete(key); // Mark as processed
      } else {
        // Create new item
        operations.push(
          this.http.post(
            `${environment.apiUrl}/api/campaigns/${campaignId}/sublocations/${instanceId}/shop-items`,
            {
              name: editedItem.name,
              priceAmount: editedItem.priceAmount || 0,
              priceCurrencyType: editedItem.priceCurrencyType,
              description: editedItem.description
            }
          )
        );
      }
    });

    // Delete items that were removed (those still in the map)
    const itemsToDelete = Array.from(existingItemMap.values());
    console.log('SublocationService.saveShopItems - itemsToDelete:', itemsToDelete);
    itemsToDelete.forEach(item => {
      operations.push(
        this.http.delete(
          `${environment.apiUrl}/api/campaigns/${campaignId}/sublocations/${instanceId}/shop-items/${item.id}`
        )
      );
    });

    console.log('SublocationService.saveShopItems - total operations:', operations.length);

    // Execute all operations and then fetch updated sublocation
    return new Observable(observer => {
      forkJoin(operations).subscribe({
        next: () => {
          // Fetch updated sublocation data from server
          this.getSublocation(campaignId, instanceId).subscribe({
            next: (updatedSublocation) => {
              // Update campaign state through shell service
              this.shellSvc.updateCampaign(campaign => {
                if (!campaign) return campaign;
                return {
                  ...campaign,
                  sublocations: campaign.sublocations.map(subloc =>
                    subloc.instanceId === instanceId ? updatedSublocation : subloc
                  )
                };
              });
              observer.next(updatedSublocation);
              observer.complete();
            },
            error: (err) => {
              observer.error(err);
            }
          });
        },
        error: (err) => {
          observer.error(err);
        }
      });
    });
  }

  toggleShopItemScratch(campaignId: string, instanceId: string, itemId: string): Observable<CampaignSublocationInstance> {
    return new Observable(observer => {
      this.http.patch<void>(
        `${environment.apiUrl}/api/campaign/${campaignId}/sublocationinstances/${instanceId}/shop-items/${itemId}/scratch`,
        {}
      ).subscribe({
        next: () => {
          // Fetch updated sublocation data from server
          this.getSublocation(campaignId, instanceId).subscribe({
            next: (updatedSublocation) => {
              // Update campaign state through shell service
              this.shellSvc.updateCampaign(campaign => {
                if (!campaign) return campaign;
                return {
                  ...campaign,
                  sublocations: campaign.sublocations.map(subloc =>
                    subloc.instanceId === instanceId ? updatedSublocation : subloc
                  )
                };
              });
              observer.next(updatedSublocation);
              observer.complete();
            },
            error: (err) => {
              observer.error(err);
            }
          });
        },
        error: (err) => {
          observer.error(err);
        }
      });
    });
  }

  saveSublocationDetails(campaignId: string, instanceId: string, details: { name: string; description: string; dmNotes: string }): Observable<CampaignSublocationInstance> {
    return new Observable(observer => {
      this.http.patch(
        `${environment.apiUrl}/api/campaigns/${campaignId}/sublocations/${instanceId}`,
        details
      ).subscribe({
        next: () => {
          // Fetch updated sublocation data from server
          this.getSublocation(campaignId, instanceId).subscribe({
            next: (updatedSublocation) => {
              // Update campaign state through shell service
              this.shellSvc.updateCampaign(campaign => {
                if (!campaign) return campaign;
                return {
                  ...campaign,
                  sublocations: campaign.sublocations.map(subloc =>
                    subloc.instanceId === instanceId ? updatedSublocation : subloc
                  )
                };
              });
              observer.next(updatedSublocation);
              observer.complete();
            },
            error: (err) => {
              observer.error(err);
            }
          });
        },
        error: (err) => {
          observer.error(err);
        }
      });
    });
  }
}
