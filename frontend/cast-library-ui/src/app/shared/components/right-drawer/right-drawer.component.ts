import { Component, inject, signal, computed, HostListener, Input, Output, EventEmitter, Signal, TemplateRef } from '@angular/core';
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

  titleSignal = computed(() => {
    if (typeof this.title === 'function') {
      return this.title();
    }
    return this.title;
  });

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
