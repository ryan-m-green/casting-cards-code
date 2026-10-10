import { Component, inject, signal, Input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { PurchaseResult } from '../../models/shop-purchase.model';

interface ShopItem {
  id: string;
  name: string;
  priceAmount: number;
  priceCurrencyType: string;
  description: string;
}

/**
 * The shop's purchase panel: one item, its price, and the Buy that writes the purchase.
 *
 * The server has the last word on it — what the purse holds, what it was short of — and its answer
 * is handed on as `purchaseComplete`, which is what the receipt is drawn from (see
 * cc-purchase-receipt) while the drawer this panel stands in stays open.
 */

@Component({
  selector: 'app-shop-purchase-content',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './shop-purchase-content.component.html',
  styleUrl: './shop-purchase-content.component.scss'
})
export class ShopPurchaseContentComponent {
  private http = inject(HttpClient);

  @Input() portalColor = '#6e28d0';
  @Input() campaignId = '';
  @Input() sublocationInstanceId = '';
  @Input() item: ShopItem | null = null;

  purchaseComplete = output<PurchaseResult>();

  purchasing = signal(false);

  ngOnInit() {
    // Item is passed in via context, no need to fetch
  }

  buyItem() {
    const item = this.item;
    if (!item || this.purchasing()) return;

    this.purchasing.set(true);
    this.http.post<PurchaseResult>(
      `${environment.apiUrl}/api/campaigns/${this.campaignId}/sublocations/${this.sublocationInstanceId}/shop-items/${item.id}/purchase`,
      {}
    ).subscribe({
      next: result => {
        this.purchasing.set(false);
        this.purchaseComplete.emit(result);
      },
      error: () => this.purchasing.set(false),
    });
  }
}
