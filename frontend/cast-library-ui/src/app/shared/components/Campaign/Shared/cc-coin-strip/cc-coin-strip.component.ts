import { Component, ChangeDetectionStrategy, computed, input, output } from '@angular/core';
import { CcCardSpotlightComponent } from '../cc-card-spotlight/cc-card-spotlight.component';

const COINS = [
  { type: 'cp', name: 'Copper' },
  { type: 'sp', name: 'Silver' },
  { type: 'ep', name: 'Electrum' },
  { type: 'gp', name: 'Gold' },
  { type: 'pp', name: 'Platinum' },
];

@Component({
  selector: 'cc-coin-strip',
  standalone: true,
  imports: [CcCardSpotlightComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './cc-coin-strip.component.html',
  styleUrl: './cc-coin-strip.component.scss'
})
export class CcCoinStripComponent {
  readonly coins = input<{ currency: string; amount: number }[]>([]);
  readonly compact = input(false);

  readonly ack = output<void>();

  onSpotlightDismissed(): void {
    this.ack.emit();
  }

  readonly lines = computed(() => {
    const balances = this.coins() ?? [];
    return COINS.map(coin => ({
      ...coin,
      amount: balances.find(balance => balance.currency === coin.type)?.amount ?? 0,
    }));
  });
}
