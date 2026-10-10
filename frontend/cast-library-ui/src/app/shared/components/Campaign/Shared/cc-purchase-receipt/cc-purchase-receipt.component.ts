import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  Injector,
  afterNextRender,
  computed,
  inject,
  input,
  output,
  viewChild,
} from '@angular/core';
import { PurchaseResult } from '../../../../models/shop-purchase.model';

@Component({
  selector: 'cc-purchase-receipt',
  standalone: true,
  imports: [],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './cc-purchase-receipt.component.html',
  styleUrl: './cc-purchase-receipt.component.scss',
})
export class CcPurchaseReceiptComponent {
  private injector = inject(Injector);

  readonly result = input.required<PurchaseResult>();

  readonly portalColor = input<string>('');

  readonly dismissed = output<void>();

  private closeButton = viewChild<ElementRef<HTMLButtonElement>>('closeButton');

  readonly noticeTitle = computed(() => (this.result().success ? 'Bill of Sale' : 'Notice of Denial'));

  readonly denialReason = computed(
    () => this.result().denialReason?.trim() || 'Not enough coin in your purse.'
  );

  constructor() {
    afterNextRender(() => this.closeButton()?.nativeElement.focus(), { injector: this.injector });
  }

  @HostListener('document:keydown.escape')
  onEscape() {
    this.dismiss();
  }

  dismiss() {
    this.dismissed.emit();
  }
}
