import { Component, inject, signal, HostListener, Input, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { InventoryItem } from '../../models/inventory-item.model';
import { CurrencyDisplayComponent, CurrencyLine } from '../currency-display/currency-display.component';
import { CampaignHubService } from '../../../core/hub/campaign-hub.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-player-inventory-drawer',
  standalone: true,
  imports: [CommonModule, CurrencyDisplayComponent],
  templateUrl: './player-inventory-drawer.component.html',
  styleUrl: './player-inventory-drawer.component.scss'
})
export class PlayerInventoryDrawerComponent implements OnInit, OnDestroy {
  private http = inject(HttpClient);
  private hub = inject(CampaignHubService);
  private hubSubscriptions: Subscription[] = [];

  @Input() portalColor: string = '#6e28d0';
  @Input() campaignId: string = '';

  isOpen = signal(false);
  isClosing = signal(false);
  loadingInventory = signal(false);
  inventoryItems = signal<InventoryItem[]>([]);
  purse = signal<CurrencyLine[]>([]);

  ngOnInit() {
    this.hubSubscriptions.push(
      this.hub.inventoryItemUsed$.subscribe(event => {
        if (event && event.campaignId === this.campaignId) {
          this.loadInventory();
        }
      })
    );
  }

  ngOnDestroy() {
    this.hubSubscriptions.forEach(sub => sub.unsubscribe());
  }

  open() {
    this.isOpen.set(true);
    this.loadInventory();
    this.loadPurse();
  }

  close() {
    this.isClosing.set(true);
    setTimeout(() => {
      this.isOpen.set(false);
      this.inventoryItems.set([]);
      this.purse.set([]);
      this.isClosing.set(false);
    }, 240);
  }

  @HostListener('document:keydown.escape')
  onEscape() {
    if (this.isOpen()) {
      this.close();
    }
  }

  loadInventory() {
    if (!this.campaignId) return;

    this.inventoryItems.set([]);
    this.loadingInventory.set(true);

    this.http.get<InventoryItem[]>(`${environment.apiUrl}/api/campaigns/${this.campaignId}/player-cards/inventory/mine`)
      .subscribe(data => {
        this.inventoryItems.set(data || []);
        this.loadingInventory.set(false);
      }, error => {
        this.loadingInventory.set(false);
      });
  }

  useItem(itemId: string) {
    if (!this.campaignId) return;

    this.http.post(`${environment.apiUrl}/api/campaigns/${this.campaignId}/player-cards/inventory/use`, { InventoryItemId: itemId })
      .subscribe({
        next: () => {
          this.loadInventory();
        },
        error: (err) => {
          console.error('Failed to use item:', err);
        }
      });
  }

  loadPurse() {
    if (!this.campaignId) return;

    this.http.get<any>(`${environment.apiUrl}/api/campaigns/${this.campaignId}/player-cards/mine`)
      .subscribe({
        next: (card) => {
          const coinOrder = ['cp', 'sp', 'ep', 'gp', 'pp'];
          const currencyBalances = card?.currencyBalances || [];
          const purse: CurrencyLine[] = coinOrder.map(coinType => {
            const balance = currencyBalances.find((b: any) => b.currency === coinType);
            return {
              type: coinType,
              amount: balance?.amount ?? 0
            };
          });
          this.purse.set(purse);
        },
        error: (err) => {
          console.error('Failed to load purse:', err);
          this.purse.set([
            { type: 'cp', amount: 0 },
            { type: 'sp', amount: 0 },
            { type: 'ep', amount: 0 },
            { type: 'gp', amount: 0 },
            { type: 'pp', amount: 0 }
          ]);
        }
      });
  }
}
