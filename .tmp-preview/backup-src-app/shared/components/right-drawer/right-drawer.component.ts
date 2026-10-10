import { Component, inject, signal, HostListener, Input, Output, EventEmitter, Signal, TemplateRef } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-right-drawer',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './right-drawer.component.html',
  styleUrl: './right-drawer.component.scss'
})
export class RightDrawerComponent {
  @Input() portalColor: string = '#6e28d0';
  @Input() title: string | Signal<string> = '';
  @Input() width: string = '75vw';
  @Input() ariaLabel: string = 'Drawer';
  @Input() onOpen: (() => Promise<void> | void) | null = null;
  @Input() onClose: (() => Promise<void> | void) | null = null;
  @Input() contentTemplate: TemplateRef<any> | null = null;
  @Input() contentContext: any = null;

  @Output() closed = new EventEmitter<void>();

  isOpen = signal(false);
  isClosing = signal(false);

  /**
   * The header's title. A getter rather than a computed on purpose: the title is
   * bound as a plain string by the shells, so a computed would have nothing to
   * track and would cache the first title it ever saw. Read this way it is taken
   * fresh on every change detection — which is what makes opening the drawer again
   * (a different encounter, another card) show that drawer's own title. A signal
   * handed in instead of a string is read through, so both still work.
   */
  get titleText(): string {
    const value = this.title;
    return typeof value === 'function' ? value() : value;
  }

  async open(): Promise<void> {
    if (this.onOpen) {
      await this.onOpen();
    }
    this.isOpen.set(true);
  }

  async close(): Promise<void> {
    if (this.onClose) {
      await this.onClose();
    }
    this.isClosing.set(true);
    setTimeout(() => {
      this.isOpen.set(false);
      this.isClosing.set(false);
      this.closed.emit();
    }, 240);
  }

  @HostListener('document:keydown.escape')
  onEscape() {
    if (this.isOpen()) {
      this.close();
    }
  }

  onBackdropClick(event: MouseEvent) {
    // Only close if the backdrop itself was clicked, not if the click originated from the drawer content
    if (event.target === event.currentTarget) {
      this.close();
    }
  }
}
