import { Directive, ElementRef, OnDestroy, OnInit, inject } from '@angular/core';

/**
 * Lets a horizontally-scrollable strip (an `overflow-x: auto` flex row) be dragged
 * with a mouse or pen, the way a finger already drags it natively. Touch is left to
 * the browser's own scrolling; this only adds the mouse drag the desktop lacks.
 *
 * A drag that passes the threshold swallows the click that follows, so dragging the
 * deck never opens the card the pointer happened to be released over.
 */
@Directive({ selector: '[ccDragScroll]', standalone: true })
export class CcDragScrollDirective implements OnInit, OnDestroy {
  private readonly host: ElementRef<HTMLElement> = inject(ElementRef);

  /** How far the pointer must travel before it counts as a drag rather than a click. */
  private static readonly DRAG_THRESHOLD_PX = 5;

  private dragging = false;

  private moved = false;

  private startX = 0;

  private startScrollLeft = 0;

  private priorSnapType = '';

  private readonly onPointerDown = (event: PointerEvent): void => this.pointerDown(event);

  private readonly onPointerMove = (event: PointerEvent): void => this.pointerMove(event);

  private readonly onPointerUp = (event: PointerEvent): void => this.pointerUp(event);

  private readonly onClickCapture = (event: MouseEvent): void => this.suppressClick(event);

  ngOnInit(): void {
    const element = this.host.nativeElement;
    element.addEventListener('pointerdown', this.onPointerDown);
    element.addEventListener('click', this.onClickCapture, true);
  }

  ngOnDestroy(): void {
    this.endDrag();
    const element = this.host.nativeElement;
    element.removeEventListener('pointerdown', this.onPointerDown);
    element.removeEventListener('click', this.onClickCapture, true);
  }

  private pointerDown(event: PointerEvent): void {
    // Touch already scrolls natively — only the mouse (and pen) need the nudge.
    if (event.pointerType === 'touch') return;
    if (event.button !== 0) return;

    this.dragging = true;
    this.moved = false;
    this.startX = event.clientX;
    this.startScrollLeft = this.host.nativeElement.scrollLeft;

    // Mandatory snapping fights a programmatic scroll, so it stands down for the drag.
    this.priorSnapType = this.host.nativeElement.style.scrollSnapType;
    this.host.nativeElement.style.scrollSnapType = 'none';

    document.addEventListener('pointermove', this.onPointerMove, { passive: false });
    document.addEventListener('pointerup', this.onPointerUp);
    document.addEventListener('pointercancel', this.onPointerUp);
  }

  private pointerMove(event: PointerEvent): void {
    if (!this.dragging) return;

    const dx = event.clientX - this.startX;
    if (!this.moved && Math.abs(dx) > CcDragScrollDirective.DRAG_THRESHOLD_PX) this.moved = true;
    if (!this.moved) return;

    event.preventDefault();
    this.host.nativeElement.scrollLeft = this.startScrollLeft - dx;
  }

  private pointerUp(_event: PointerEvent): void {
    this.endDrag();
    // If the pointer was released off the strip no click follows to disarm the flag,
    // so fall back to a timer that runs after any click that would have fired.
    window.setTimeout(() => { this.moved = false; }, 0);
  }

  private endDrag(): void {
    if (!this.dragging) return;
    this.dragging = false;

    this.host.nativeElement.style.scrollSnapType = this.priorSnapType;

    document.removeEventListener('pointermove', this.onPointerMove);
    document.removeEventListener('pointerup', this.onPointerUp);
    document.removeEventListener('pointercancel', this.onPointerUp);
  }

  private suppressClick(event: MouseEvent): void {
    if (!this.moved) return;
    this.moved = false;
    event.preventDefault();
    event.stopPropagation();
  }
}
