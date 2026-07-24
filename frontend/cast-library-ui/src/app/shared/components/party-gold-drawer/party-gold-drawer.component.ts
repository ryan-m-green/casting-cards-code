import { Component, inject, signal, HostListener, Input, viewChild, ElementRef, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';

type Currency = 'cp' | 'sp' | 'ep' | 'gp' | 'pp';

@Component({
  selector: 'app-party-gold-drawer',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './party-gold-drawer.component.html',
  styleUrl: './party-gold-drawer.component.scss'
})
export class PartyGoldDrawerComponent {
  private http = inject(HttpClient);

  @Input() portalColor: string = '#6e28d0';

  goldAwarded = output<{ currency: string; playerAwards: { playerUserId: string; amount: number }[] }>();

  isOpen = signal(false);
  isClosing = signal(false);
  campaignId = signal('');

  goldAmount = signal(0);
  goldCurrency = signal<Currency>('gp');
  goldNote = signal('');
  goldSaving = signal(false);
  currencyDropdownOpen = signal(false);
  readonly currencies: Currency[] = ['cp', 'sp', 'ep', 'gp', 'pp'];
  goldAmountInput = viewChild.required<ElementRef<HTMLInputElement>>('goldAmountInput');

  open(campaignId: string) {
    this.campaignId.set(campaignId);
    this.goldAmount.set(0);
    this.goldCurrency.set('gp');
    this.goldNote.set('');
    this.currencyDropdownOpen.set(false);
    this.isOpen.set(true);
    setTimeout(() => {
      this.goldAmountInput().nativeElement.focus();
    });
  }

  close() {
    this.isClosing.set(true);
    setTimeout(() => {
      this.isOpen.set(false);
      this.isClosing.set(false);
    }, 240);
  }

  @HostListener('document:keydown.escape')
  onEscape() {
    if (this.isOpen()) {
      this.close();
    }
  }

  onGoldAmountChange(value: string): void {
    const stripped = value.replace(/[^0-9]/g, '');
    const num = parseInt(stripped, 10);
    this.goldAmount.set(isNaN(num) ? 0 : num);
  }

  awardGold() {
    const amount = this.goldAmount();
    if (!amount || amount <= 0) return;
    this.goldSaving.set(true);
    const id = this.campaignId();
    const currency = this.goldCurrency();

    const body = {
      amount,
      currency: currency,
      note: this.goldNote() || null,
      playerCardId: null,
    };

    this.http.post<{ currency: string; playerAwards: { playerUserId: string; amount: number }[] }>(
      `${environment.apiUrl}/api/campaigns/${id}/gold-award`, body)
      .subscribe({
        next: (response) => {
          this.goldSaving.set(false);
          this.goldAwarded.emit(response);
          this.close();
        },
        error: () => this.goldSaving.set(false),
      });
  }
}
