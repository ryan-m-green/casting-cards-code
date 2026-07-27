import { Component, inject, signal, Input, output, viewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';

type Currency = 'cp' | 'sp' | 'ep' | 'gp' | 'pp';

@Component({
  selector: 'app-party-gold-content',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './party-gold-content.component.html',
  styleUrl: './party-gold-content.component.scss'
})
export class PartyGoldContentComponent {
  private http = inject(HttpClient);

  @Input() campaignId = '';
  @Input() portalColor = '#6e28d0';

  goldAwarded = output<{ currency: string; playerAwards: { playerUserId: string; amount: number }[] }>();
  closeDrawer = output<void>();

  goldAmount = signal(0);
  goldCurrency = signal<Currency>('gp');
  goldNote = signal('');
  goldSaving = signal(false);
  currencyDropdownOpen = signal(false);
  readonly currencies: Currency[] = ['cp', 'sp', 'ep', 'gp', 'pp'];
  goldAmountInput = viewChild.required<ElementRef<HTMLInputElement>>('goldAmountInput');

  ngOnInit() {
    this.goldAmount.set(0);
    this.goldCurrency.set('gp');
    this.goldNote.set('');
    this.currencyDropdownOpen.set(false);
    setTimeout(() => {
      this.goldAmountInput().nativeElement.focus();
    });
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
    const id = this.campaignId;
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
          this.closeDrawer.emit();
        },
        error: () => this.goldSaving.set(false),
      });
  }
}
