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

/**
 * cc-purchase-receipt
 *
 * The shop's own answer, handed over: the parchment the v1 player page has always drawn (see
 * player-sublocation-detail) — a **Bill of Sale** under a wax seal when the purchase went through, a
 * **Notice of Denial** under an INSUFFICIENT FUNDS stamp when it did not.
 *
 * It is a moment, not a panel: the campaign shell stands it over the board rather than in it (see
 * the v2 shell's `purchaseReceipt`), so nothing of the grid's panning, its cell clipping or its
 * own overlays gets in its way. The shell raises it once the purchase drawer has shut, so the
 * player steps out of the shop and into the paper.
 *
 * The component only draws what it is handed and says when it has been dismissed; who stands it up
 * and what closes it are the shell's business.
 */
@Component({
  selector: 'cc-purchase-receipt',
  standalone: true,
  imports: [],
  /** OnPush: nothing here moves of its own accord — the answer is an input and the rest is signals. */
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './cc-purchase-receipt.component.html',
  styleUrl: './cc-purchase-receipt.component.scss',
})
export class CcPurchaseReceiptComponent {
  private injector = inject(Injector);

  /** The shop's own answer: which of the two notices is drawn, and what stands on it. */
  readonly result = input.required<PurchaseResult>();

  /** The campaign's colour, for the pool of light the paper stands in. */
  readonly portalColor = input<string>('');

  readonly dismissed = output<void>();

  /** The Close control, to be handed the focus while the notice stands. */
  private closeButton = viewChild<ElementRef<HTMLButtonElement>>('closeButton');

  /** What stands as the receipt's own name, for the screen reader and the heading. */
  readonly noticeTitle = computed(() => (this.result().success ? 'Bill of Sale' : 'Notice of Denial'));

  /**
   * What the shop said when it would not sell. The server leaves the reason empty when the purse
   * simply did not cover the price (see PurchaseShopItemCommandHandler), so the notice says that
   * much for it rather than printing a stamp with nothing under it.
   */
  readonly denialReason = computed(
    () => this.result().denialReason?.trim() || 'Not enough coin in your purse.'
  );

  constructor() {
    // The notice is the only thing standing: the keyboard is put on its own Close as it lands.
    afterNextRender(() => this.closeButton()?.nativeElement.focus(), { injector: this.injector });
  }

  /** Escape shuts it, the way it shuts the drawer the purchase was made in. */
  @HostListener('document:keydown.escape')
  onEscape() {
    this.dismiss();
  }

  dismiss() {
    this.dismissed.emit();
  }
}
