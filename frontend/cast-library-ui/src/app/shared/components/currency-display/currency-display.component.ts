import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface CurrencyLine {
  type: string;
  amount: number;
}

const CURRENCY_ORDER: { type: string; label: string }[] = [
  { type: 'cp', label: 'Copper' },
  { type: 'sp', label: 'Silver' },
  { type: 'ep', label: 'Electrum' },
  { type: 'gp', label: 'Gold' },
  { type: 'pp', label: 'Platinum' },
];

@Component({
  selector: 'app-currency-display',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './currency-display.component.html',
  styleUrl: './currency-display.component.scss',
})
export class CurrencyDisplayComponent {
  @Input() purse: CurrencyLine[] = [];
  @Input() compact = false;

  get normalizedPurse(): { label: string; amount: number }[] {
    return CURRENCY_ORDER.map(c => ({
      label: c.label,
      amount: this.purse.find(l => l.type === c.type)?.amount ?? 0,
    }));
  }
}
