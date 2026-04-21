import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-currency-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './currency-card.component.html',
  styleUrl: './currency-card.component.scss',
})
export class CurrencyCardComponent {
  @Input() amount: number = 0;
  @Input() currency: string = 'gp';
  @Input() note: string | null = null;
  @Input() portalColor: string = '#6e28d0';
  @Input() dismissable: boolean = false;
  @Output() dismissed = new EventEmitter<void>();

  dismiss() { this.dismissed.emit(); }
}
