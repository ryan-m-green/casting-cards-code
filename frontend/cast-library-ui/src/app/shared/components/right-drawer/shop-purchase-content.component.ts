import { Component, inject, signal, Input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';

interface ShopItem {
  id: string;
  name: string;
  priceAmount: number;
  priceCurrencyType: string;
  description: string;
}

interface PurchaseResult {
  success: boolean;
  itemName: string;
  priceAmount: number;
  priceCurrencyType: string;
  playerDisplayName: string;
  denialReason: string;
}

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

  closeDrawer = output<void>();
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
        this.closeDrawer.emit();
      },
      error: () => this.purchasing.set(false),
    });
  }
}
