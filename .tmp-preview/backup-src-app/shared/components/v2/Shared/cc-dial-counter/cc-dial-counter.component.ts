import { Component, OnDestroy, computed, forwardRef, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

const MIN_DIALS = 1;

const MAX_DIALS = 4;

const PLACE_LABELS = ['Ones', 'Tens', 'Hundreds', 'Thousands'] as const;

const DEFAULT_DIALS = 2;

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
  readonly label = input<string>('');
  readonly ariaLabel = input<string | null>(null);
  readonly min = input<number>(0);
  readonly max = input<number | null>(null);
  readonly disabled = input<boolean>(false);
  readonly context = input<'journal' | 'campaign'>('journal');
  readonly dials = input<number>(DEFAULT_DIALS);

  readonly isCampaignContext = computed(() => this.context() === 'campaign');

  readonly valueChange = output<number>();

  readonly dialCount = computed(() => {
    const requested = Math.round(this.dials());
    if (!Number.isFinite(requested)) return DEFAULT_DIALS;
    return Math.min(MAX_DIALS, Math.max(MIN_DIALS, requested));
  });

  readonly placeValues = computed(() =>
    Array.from({ length: this.dialCount() }, (_, index) =>
      Math.pow(10, this.dialCount() - 1 - index)
    )
  );

  readonly resolvedMax = computed(() => this.max() ?? Math.pow(10, this.dialCount()) - 1);

  readonly value = signal<number>(0);

  readonly draggingPlace = signal<number | null>(null);

  private static readonly DRAG_THRESHOLD_PX = 6;
  private static readonly STEP_PX = 18;
  private static readonly FLICK_MIN_VELOCITY = 0.2;
  private static readonly FLICK_MAX_VELOCITY = 2;
  private static readonly SPIN_FRICTION = 0.94;
  private static readonly SPIN_STOP_VELOCITY = 0.02;
  private static readonly SPIN_MAX_MS = 1200;
  private static readonly FLICK_STALE_MS = 80;

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

  private spinRaf: number | null = null;

  private readonly reduceMotion =
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;

  private onChange: (value: number) => void = () => {};
  private onTouched: () => void = () => {};

  digitFor(placeValue: number): number {
    return Math.floor(this.value() / placeValue) % 10;
  }

  prevDigit(placeValue: number): number {
    return (this.digitFor(placeValue) + 9) % 10;
  }

  nextDigit(placeValue: number): number {
    return (this.digitFor(placeValue) + 1) % 10;
  }

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

  onReelPointerDown(event: PointerEvent, placeValue: number): void {
    if (this.disabled()) return;
    this.stopSpin();
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

    const now = performance.now();
    const dt = now - drag.lastTime;
    if (dt > 0) {
      const instant = (drag.lastY - event.clientY) / dt;
      drag.velocity = drag.velocity * 0.7 + instant * 0.3;
    }
    drag.lastY = event.clientY;
    drag.lastTime = now;

    const travel = drag.startY - event.clientY;
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

    if (!drag.moved) return;

    this.onTouched();

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

  private startSpin(placeValue: number, releaseVelocity: number): void {
    if (this.reduceMotion) return;

    let velocity = Math.max(
      -CcDialCounterComponent.FLICK_MAX_VELOCITY,
      Math.min(CcDialCounterComponent.FLICK_MAX_VELOCITY, releaseVelocity)
    );
    if (Math.abs(velocity) < CcDialCounterComponent.FLICK_MIN_VELOCITY) return;

    const baseValue = this.value();
    let travel = 0;
    let last = performance.now();
    const start = last;

    const step = (now: number) => {
      const dt = Math.min(now - last, 48);
      last = now;
      travel += velocity * dt;

      const steps = Math.round(travel / CcDialCounterComponent.STEP_PX);
      this.commit(baseValue + steps * placeValue, false);

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
    }
  }

  private releasePointer(el: HTMLElement | null, pointerId: number): void {
    try {
      if (el?.hasPointerCapture?.(pointerId)) el.releasePointerCapture(pointerId);
    } catch {
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
  }

  ngOnDestroy(): void {
    this.stopSpin();
  }
}
