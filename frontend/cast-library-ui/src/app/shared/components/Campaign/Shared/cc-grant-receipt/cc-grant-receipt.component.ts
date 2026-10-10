import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  Injector,
  afterNextRender,
  inject,
  input,
  output,
  viewChild,
} from '@angular/core';
import { GoldAwardNotice } from '../../../../../core/campaign-shell.service';

@Component({
  selector: 'cc-grant-receipt',
  standalone: true,
  imports: [],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './cc-grant-receipt.component.html',
  styleUrl: './cc-grant-receipt.component.scss',
})
export class CcGrantReceiptComponent {
  private injector = inject(Injector);

  readonly notice = input.required<GoldAwardNotice>();

  readonly portalColor = input<string>('');

  readonly dismissed = output<void>();

  private closeButton = viewChild<ElementRef<HTMLButtonElement>>('closeButton');

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
