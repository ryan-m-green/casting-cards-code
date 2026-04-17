import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface CurrencyLine {
  type: string;
  amount: number;
}

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
}
