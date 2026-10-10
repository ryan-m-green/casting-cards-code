import { Component, OnDestroy, computed, forwardRef, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

/** Fewest dials an implementation may ask for. */
const MIN_DIALS = 1;

/** Most dials an implementation may ask for. */
const MAX_DIALS = 4;

/** Accessible place names, indexed by the place exponent (0 = ones). */
const PLACE_LABELS = ['Ones', 'Tens', 'Hundreds', 'Thousands'] as const;

/** Dial count used when the `dials` attribute is missing or not a number. */
const DEFAULT_DIALS = 2;

/**
 * cc-dial-counter
 *
 * An odometer-style number picker with a configurable number of spin dials —
 * one dial per decimal place, so the same component covers anything from a
 * ones-only tracker up to thousands. How many dials an implementation shows is
 * driven by the `dials` attribute (1-4; the default is 2, i.e. tens + ones).
 *
 * Each dial has clickable top/bottom arrow areas (pointer cursor) that
 * increase/decrease that digit, and the number reel can be dragged to spin.
 * The mouse wheel and arrow keys work too, in the journal theme or the v2
 * campaign skin (`[context]="'campaign'"`).
 *
 *   <cc-dial-counter [dials]="2" label="Hit Points" [(ngModel)]="hp" />
 *   <cc-dial-counter [dials]="4" context="campaign" label="Party Gold" />
 *
 * It is a ControlValueAccessor, so it can be bound with `formControlName`,
 * `[ngModel]`, or plain `[value]`/`(valueChange)`. Values are clamped to
 * `min .. max`, where `max` defaults to the largest number the dials can show.
 */
@Component({
  selector: 'cc-dial-counter',
  standalone: true,
  imports: [CommonModule],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => CcDialCounterComponent),
      multi: true
    }
  ],
  templateUrl: './cc-dial-counter.component.html',
  styleUrl: './cc-dial-counter.component.scss'
})
export class CcDialCounterComponent implements ControlValueAccessor, OnDestroy {
  /** Optional label rendered above the dials. */
  readonly label = input<string>('');
  /** Optional accessible name for the dial group; falls back to label(). */
  readonly ariaLabel = input<string | null>(null);
  /** Lowest selectable value. */
  readonly min = input<number>(0);
  /** Highest selectable value; defaults to what the dials can show (10^dials - 1). */
  readonly max = input<number | null>(null);
  /** Disables all interaction when true. */
  readonly disabled = input<boolean>(false);
  /**
   * Rendering context. `'journal'` (default) keeps the journal theme;
   * `'campaign'` applies the v2 campaign skin.
   */
  readonly context = input<'journal' | 'campaign'>('journal');
  /**
   * How many dials to render: 1 (ones) to 4 (thousands), one per decimal place.
   * Defaults to 2 (tens + ones). Bind it as `[dials]="3"` — a bare
   * `dials="3"` string attribute is rejected by strict templates — and values
   * outside 1-4 or non-numeric fall back to the default.
   */
  readonly dials = input<number>(DEFAULT_DIALS);

  /** True when the campaign skin should be applied. */
  readonly isCampaignContext = computed(() => this.context() === 'campaign');

  /** Emitted whenever the value changes (in addition to the CVA onChange). */
  readonly valueChange = output<number>();

  /** `dials`, clamped to the 1-4 range the component supports. */
  readonly dialCount = computed(() => {
    const requested = Math.round(this.dials());
    if (!Number.isFinite(requested)) return DEFAULT_DIALS;
    return Math.min(MAX_DIALS, Math.max(MIN_DIALS, requested));
  });

  /** Place values, most significant first (2 dials => [10, 1]). */
  readonly placeValues = computed(() =>
    Array.from({ length: this.dialCount() }, (_, index) =>
      Math.pow(10, this.dialCount() - 1 - index)
    )
  );

  /** Highest selectable value, resolving the `max` default from the dial count. */
  readonly resolvedMax = computed(() => this.max() ?? Math.pow(10, this.dialCount()) - 1);

  /** Current numeric value. */
  readonly value = signal<number>(0);

  /** Place value whose dial is currently being dragged (null when idle). */
  readonly draggingPlace = signal<number | null>(null);

  /** Pixels of vertical travel before a gesture is treated as a spin drag. */
  private static readonly DRAG_THRESHOLD_PX = 6;
  /** Pixels of vertical travel per whole digit step while spinning. */
  private static readonly STEP_PX = 18;
  /** Release speed (px/ms) below which a flick does not trigger a free spin. */
  private static readonly FLICK_MIN_VELOCITY = 0.2;
  /** Upper bound on flick speed (px/ms) so a hard throw doesn't spin forever. */
  private static readonly FLICK_MAX_VELOCITY = 2;
  /** Per-frame (16.67ms) velocity multiplier used to decay a free spin. */
  private static readonly SPIN_FRICTION = 0.94;
  /** Speed (px/ms) at which a free spin is considered finished. */
  private static readonly SPIN_STOP_VELOCITY = 0.02;
  /** Safety cap on how long a free spin may run. */
  private static readonly SPIN_MAX_MS = 1200;
  /** Pointer samples older than this (ms) are treated as "held still". */
  private static readonly FLICK_STALE_MS = 80;

  /** Bookkeeping for the in-progress pointer drag, if any. */
  private drag: {
    place: number;
    pointerId: number;
    startY: number;
    startValue: number;
    moved: boolean;
    lastY: number;
    lastTime: number;
    velocity: number;
  } | null = null;

  /** requestAnimationFrame handle for the free spin, when running. */
  private spinRaf: number | null = null;

  /** Respect the user's reduced-motion preference (skips the free spin). */
  private readonly reduceMotion =
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;

  private onChange: (value: number) => void = () => {};
  private onTouched: () => void = () => {};

  /** The single digit (0-9) currently shown on the dial for a place value. */
  digitFor(placeValue: number): number {
    return Math.floor(this.value() / placeValue) % 10;
  }

  /** Digit that would appear above the current one on the reel. */
  prevDigit(placeValue: number): number {
    return (this.digitFor(placeValue) + 9) % 10;
  }

  /** Digit that would appear below the current one on the reel. */
  nextDigit(placeValue: number): number {
    return (this.digitFor(placeValue) + 1) % 10;
  }

  /** Accessible name for a dial, derived from its decimal place. */
  placeLabel(placeValue: number): string {
    const exponent = Math.round(Math.log10(placeValue));
    const name = PLACE_LABELS[exponent];
    return name ? `${name} place` : `${placeValue}s place`;
  }

  increment(placeValue: number): void {
    this.stopSpin();
    this.commit(this.value() + placeValue);
  }

  decrement(placeValue: number): void {
    this.stopSpin();
    this.commit(this.value() - placeValue);
  }

  onWheel(event: WheelEvent, placeValue: number): void {
    if (this.disabled()) return;
    event.preventDefault();
    if (event.deltaY < 0) {
      this.increment(placeValue);
    } else if (event.deltaY > 0) {
      this.decrement(placeValue);
    }
  }

  onKeydown(event: KeyboardEvent, placeValue: number): void {
    if (this.disabled()) return;
    if (event.key === 'ArrowUp' || event.key === 'ArrowRight') {
      event.preventDefault();
      this.increment(placeValue);
    } else if (event.key === 'ArrowDown' || event.key === 'ArrowLeft') {
      event.preventDefault();
      this.decrement(placeValue);
    }
  }

  // ── Pointer interaction: drag the reel to spin a digit ────────────────────
  // (Clicking is handled by the arrow buttons; the reel itself is not clickable.)

  onReelPointerDown(event: PointerEvent, placeValue: number): void {
    if (this.disabled()) return;
    this.stopSpin(); // grabbing the reel halts any free spin in progress
    const reel = event.currentTarget as HTMLElement | null;
    this.capturePointer(reel, event.pointerId);
    const now = performance.now();
    this.drag = {
      place: placeValue,
      pointerId: event.pointerId,
      startY: event.clientY,
      startValue: this.value(),
      moved: false,
      lastY: event.clientY,
      lastTime: now,
      velocity: 0
    };
    this.draggingPlace.set(placeValue);
  }

  onReelPointerMove(event: PointerEvent, placeValue: number): void {
    const drag = this.drag;
    if (!drag || drag.pointerId !== event.pointerId || drag.place !== placeValue) return;

    // Track a smoothed pointer velocity so we can free-spin on release.
    const now = performance.now();
    const dt = now - drag.lastTime;
    if (dt > 0) {
      const instant = (drag.lastY - event.clientY) / dt; // px/ms, dragging up is positive
      drag.velocity = drag.velocity * 0.7 + instant * 0.3;
    }
    drag.lastY = event.clientY;
    drag.lastTime = now;

    const travel = drag.startY - event.clientY; // dragging upward is positive
    if (Math.abs(travel) >= CcDialCounterComponent.DRAG_THRESHOLD_PX) {
      drag.moved = true;
    }
    if (!drag.moved) return;

    const steps = Math.round(travel / CcDialCounterComponent.STEP_PX);
    this.commit(drag.startValue + steps * drag.place, false);
  }

  onReelPointerUp(event: PointerEvent, placeValue: number): void {
    const drag = this.drag;
    if (!drag || drag.pointerId !== event.pointerId || drag.place !== placeValue) return;

    const reel = event.currentTarget as HTMLElement | null;
    this.releasePointer(reel, event.pointerId);
    this.drag = null;
    this.draggingPlace.set(null);

    // A plain tap on the number performs no action — only the arrows change the value.
    if (!drag.moved) return;

    this.onTouched();

    // If the pointer was still moving when released, keep the reel spinning a
    // little longer (free spin / inertia).
    const movedRecently = (performance.now() - drag.lastTime) <= CcDialCounterComponent.FLICK_STALE_MS;
    if (movedRecently) {
      this.startSpin(drag.place, drag.velocity);
    }
  }

  onReelPointerCancel(event: PointerEvent, placeValue: number): void {
    const drag = this.drag;
    if (!drag || drag.pointerId !== event.pointerId || drag.place !== placeValue) return;
    this.drag = null;
    this.draggingPlace.set(null);
  }

  // ── Free spin (inertia) ───────────────────────────────────────────────────

  /** Keep the dial spinning after release, decaying over roughly a second. */
  private startSpin(placeValue: number, releaseVelocity: number): void {
    if (this.reduceMotion) return;

    let velocity = Math.max(
      -CcDialCounterComponent.FLICK_MAX_VELOCITY,
      Math.min(CcDialCounterComponent.FLICK_MAX_VELOCITY, releaseVelocity)
    );
    if (Math.abs(velocity) < CcDialCounterComponent.FLICK_MIN_VELOCITY) return;

    const baseValue = this.value();
    let travel = 0; // accumulated px of travel since release
    let last = performance.now();
    const start = last;

    const step = (now: number) => {
      const dt = Math.min(now - last, 48); // clamp long frames / tab wake-ups
      last = now;
      travel += velocity * dt;

      const steps = Math.round(travel / CcDialCounterComponent.STEP_PX);
      this.commit(baseValue + steps * placeValue, false);

      // Exponential decay: ~0.94 of the speed remains each 16.67ms frame,
      // so a flick coasts for about a second before settling.
      velocity *= Math.pow(CcDialCounterComponent.SPIN_FRICTION, dt / 16.67);

      const atLimit = this.value() <= this.min() || this.value() >= this.resolvedMax();
      const finished =
        atLimit ||
        (now - start) >= CcDialCounterComponent.SPIN_MAX_MS ||
        Math.abs(velocity) < CcDialCounterComponent.SPIN_STOP_VELOCITY;

      if (finished) {
        this.spinRaf = null;
        this.onTouched();
        return;
      }
      this.spinRaf = requestAnimationFrame(step);
    };

    this.spinRaf = requestAnimationFrame(step);
  }

  /** Cancel an in-progress free spin (new grab, arrow click, or teardown). */
  private stopSpin(): void {
    if (this.spinRaf !== null) {
      cancelAnimationFrame(this.spinRaf);
      this.spinRaf = null;
    }
  }

  private capturePointer(el: HTMLElement | null, pointerId: number): void {
    try {
      el?.setPointerCapture?.(pointerId);
    } catch {
      /* pointer capture is best-effort */
    }
  }

  private releasePointer(el: HTMLElement | null, pointerId: number): void {
    try {
      if (el?.hasPointerCapture?.(pointerId)) el.releasePointerCapture(pointerId);
    } catch {
      /* pointer capture is best-effort */
    }
  }

  private commit(raw: number, touch = true): void {
    if (this.disabled()) return;
    const next = this.clamp(Math.round(raw));
    if (next === this.value()) return;
    this.value.set(next);
    this.onChange(next);
    this.valueChange.emit(next);
    if (touch) this.onTouched();
  }

  private clamp(raw: number): number {
    const lower = Math.min(this.min(), this.resolvedMax());
    const upper = Math.max(this.min(), this.resolvedMax());
    return Math.min(upper, Math.max(lower, raw));
  }

  writeValue(value: number | null): void {
    this.value.set(this.clamp(Number(value ?? 0)));
  }

  registerOnChange(fn: (value: number) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(_isDisabled: boolean): void {
    // Disabled state is provided via the `disabled` input.
  }

  ngOnDestroy(): void {
    this.stopSpin();
  }
}
