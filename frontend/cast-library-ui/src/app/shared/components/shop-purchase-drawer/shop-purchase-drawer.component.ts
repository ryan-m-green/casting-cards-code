import { Component, inject, signal, HostListener, Input, Output, EventEmitter } from '@angular/core';
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
  selector: 'app-shop-purchase-drawer',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './shop-purchase-drawer.component.html',
  styleUrl: './shop-purchase-drawer.component.scss'
})
export class ShopPurchaseDrawerComponent {
  private http = inject(HttpClient);

  @Input() portalColor: string = '#6e28d0';
  @Input() campaignId: string = '';
  @Input() sublocationInstanceId: string = '';

  isOpen = signal(false);
  isClosing = signal(false);
  purchasing = signal(false);
  selectedItem = signal<ShopItem | null>(null);

  open(item: ShopItem) {
    this.selectedItem.set(item);
    this.isOpen.set(true);
  }

  close() {
    this.isClosing.set(true);
    setTimeout(() => {
      this.isOpen.set(false);
      this.selectedItem.set(null);
      this.isClosing.set(false);
    }, 240);
  }

  @HostListener('document:keydown.escape')
  onEscape() {
    if (this.isOpen()) {
      this.close();
    }
  }

  @Output() purchaseComplete = new EventEmitter<PurchaseResult>();

  buyItem() {
    const item = this.selectedItem();
    if (!item || this.purchasing()) return;

    this.purchasing.set(true);
    this.http.post<PurchaseResult>(
      `${environment.apiUrl}/api/campaigns/${this.campaignId}/sublocations/${this.sublocationInstanceId}/shop-items/${item.id}/purchase`,
      {}
    ).subscribe({
      next: result => {
        this.purchasing.set(false);
        // Store result to emit after drawer closes
        const resultToEmit = result;
        // Close the drawer first
        this.close();
        // Emit event after drawer closes (240ms) + 500ms delay
        setTimeout(() => {
          this.purchaseComplete.emit(resultToEmit);
        }, 240 + 500);
      },
      error: () => this.purchasing.set(false),
    });
  }
}
