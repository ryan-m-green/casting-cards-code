import { Component, ChangeDetectionStrategy, signal, HostListener, Input, Output, EventEmitter, Signal, TemplateRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../../../core/auth/auth.service';

/**
 * cc-content-drawer
 *
 * The campaign's own right-hand drawer: a copy of the shared `app-right-drawer` (see
 * shared/components/right-drawer) that the campaign shell draws instead, so the
 * drawer can move on without dragging the v1 shells along. Same markup, same styles,
 * same inputs and output — only the selector differs.
 */
@Component({
  selector: 'cc-content-drawer',
  standalone: true,
  imports: [CommonModule],
  /**
   * OnPush: the drawer's own frame — open or shut, its title, its class — is signals and inputs, so
   * it is redrawn when one of those moves. What it is handed to show is a child of its own (see the
   * shell's content templates), which redraws itself when its own state moves.
   */
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
   * Which edge the drawer slides in from. The right-hand drawer is the campaign's own and belongs
   * to any role; a left-hand drawer stands over the board rather than beside it, so it is the
   * Admin's own — a viewer without that role asking for `'left'` is given `'right'` instead (see
   * `drawerSide`, and the lock the shells' own title buttons wear).
   */
  @Input() side: 'right' | 'left' = 'right';
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

  /**
   * The side the drawer is actually drawn on. A getter, like the title, because `side` is a plain
   * string handed in by a shell: read fresh so the lock is checked against the role as it stands
   * now, not as it stood when the drawer was first made.
   */
  get drawerSide(): 'right' | 'left' {
    return this.side === 'left' && this.auth.isAdmin() ? 'left' : 'right';
  }

  /**
   * Whether the drawer stands in front of the board (a backdrop over everything, closing on a
   * click outside) or beside it, pinned open.
   *
   * The right-hand drawer is a modal: it is asking the viewer to deal with one thing — pick a
   * card, fill a form — so it dims the board and takes the click that would otherwise walk away.
   * The left-hand drawer is a panel to work *next to*: the whole point of it (see
   * cc-signalr-inspector) is to keep clicking on the board and watch what each click sends, so it
   * gets no backdrop at all. Nothing then intercepts a click outside it, and it stays open while
   * the campaign is driven around it. Escape and its own ✕ still close it.
   */
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
    // Only close if the backdrop itself was clicked, not if the click originated from the drawer content
    if (event.target === event.currentTarget) {
      this.close();
    }
  }
}
