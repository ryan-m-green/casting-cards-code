import { Component, ChangeDetectionStrategy, signal, HostListener, Input, Output, EventEmitter, Signal, TemplateRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../../../core/auth/auth.service';

@Component({
  selector: 'cc-content-drawer',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './cc-content-drawer.component.html',
  styleUrl: './cc-content-drawer.component.scss'
})
export class CcContentDrawerComponent {
  private auth = inject(AuthService);

  @Input() portalColor: string = '#6e28d0';
  @Input() title: string | Signal<string> = '';
  @Input() width: string = '75vw';
  @Input() ariaLabel: string = 'Drawer';

  /**
   * Lifts the left drawer's peek-panel width cap so a wide panel — a payload view — can use its
   * whole width. Off by default, so every other left drawer keeps its ~400px cap.
   */
  @Input() wide: boolean = false;

  @Input() side: 'right' | 'left' = 'right';
  @Input() onOpen: (() => Promise<void> | void) | null = null;
  @Input() onClose: (() => Promise<void> | void) | null = null;
  @Input() contentTemplate: TemplateRef<any> | null = null;
  @Input() contentContext: any = null;

  @Output() closed = new EventEmitter<void>();

  isOpen = signal(false);
  isClosing = signal(false);

  get titleText(): string {
    const value = this.title;
    return typeof value === 'function' ? value() : value;
  }

  get drawerSide(): 'right' | 'left' {
    return this.side === 'left' && this.auth.isAdmin() ? 'left' : 'right';
  }

  get isModal(): boolean {
    return this.drawerSide === 'right';
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
    if (event.target === event.currentTarget) {
      this.close();
    }
  }
}
