import { Directive, ElementRef, Input, OnInit, inject } from '@angular/core';

const FADE_TOTAL_MS = 700;

const FADE_PHASE_MS = FADE_TOTAL_MS / 2;

const FADE_MS = 150;

const FADE_JITTER_MS = 30;

const FADE_STAGGER_MS = FADE_PHASE_MS - FADE_MS - FADE_JITTER_MS;

export function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function cardFadeWindowMs(): number {
  return prefersReducedMotion() ? 0 : FADE_STAGGER_MS + FADE_MS + FADE_JITTER_MS;
}

export const TREE_JOINT_FADE_MS = FADE_MS;

export const TREE_JOINT_RETURN_DELAY_MS = FADE_PHASE_MS;

@Directive({ selector: '[ccCardFade]', standalone: true })
export class CcCardFadeDirective implements OnInit {
  private readonly host: ElementRef<HTMLElement> = inject(ElementRef);

  private reducedMotion = prefersReducedMotion();

  private arrival: Animation | null = null;

  private departure: Animation | null = null;

  private priorPointerEvents = '';

  private outWanted = false;

  ngOnInit(): void {
    if (this.reducedMotion) return;

    const element = this.host.nativeElement;
    this.priorPointerEvents = element.style.pointerEvents;

    if (!this.outWanted) {
      this.comeIn(element);
    }
  }

  @Input()
  set ccCardFadeOut(wanted: boolean) {
    if (wanted === this.outWanted) return;

    this.outWanted = wanted;
    if (this.reducedMotion) return;

    if (wanted) {
      this.arrival?.cancel();
      this.arrival = null;
      this.hold(this.host.nativeElement);
      this.departure = this.host.nativeElement.animate(
        [{ opacity: this.opacityOf() }, { opacity: 0 }],
        { duration: this.duration(), delay: this.delay(), easing: 'ease', fill: 'forwards' }
      );
    } else {
      this.departure?.cancel();
      this.departure = null;
      this.landed();
    }
  }

  private comeIn(element: HTMLElement): void {
    this.hold(element);
    this.arrival = element.animate(
      [{ opacity: 0 }, { opacity: this.opacityOf() }],
      { duration: this.duration(), delay: this.delay(), easing: 'ease', fill: 'backwards' }
    );
    this.arrival.finished.then(
      () => this.landed(),
      () => this.landed()
    );
  }

  private landed(): void {
    if (!this.outWanted) {
      this.host.nativeElement.style.pointerEvents = this.priorPointerEvents;
    }
  }

  private hold(element: HTMLElement): void {
    element.style.pointerEvents = 'none';
  }

  private duration(): number {
    return Math.round(FADE_MS + (Math.random() * 2 - 1) * FADE_JITTER_MS);
  }

  private delay(): number {
    return Math.round(Math.random() * FADE_STAGGER_MS);
  }

  private opacityOf(): string {
    return getComputedStyle(this.host.nativeElement).opacity;
  }
}
