import { Injectable, computed, inject, signal } from '@angular/core';
import { Subject } from 'rxjs';
import { SparkleService } from '../shared/services/sparkle.service';

export type CelebrationPhase = 'idle' | 'fading' | 'bursting';

const FADE_MS = 700;
const BURST_MS = 3800;

const FIREWORK_COLORS = [
  '#ffd700', '#ff6b6b', '#7bd1ff', '#b39ddb', '#66d19e', '#ff9de2',
  '#fff0d0', '#ffa94d', '#4dd0e1', '#e040fb', '#69f0ae', '#ffd54f',
];

@Injectable({ providedIn: 'root' })
export class EncounterCelebrationService {
  private sparkle = inject(SparkleService);

  private fadeTimer = 0;
  private burstTimer = 0;

  readonly phase = signal<CelebrationPhase>('idle');

  readonly active = computed(() => this.phase() !== 'idle');

  readonly finished$ = new Subject<void>();

  start(): void {
    this.stop();
    this.phase.set('fading');

    this.fadeTimer = window.setTimeout(() => {
      this.phase.set('bursting');
      this.burstTimer = window.setTimeout(() => {
        this.phase.set('idle');
        this.finished$.next();
      }, BURST_MS);
    }, FADE_MS);
  }

  stop(): void {
    window.clearTimeout(this.fadeTimer);
    window.clearTimeout(this.burstTimer);
    this.fadeTimer = 0;
    this.burstTimer = 0;
  }

  fireworks(host: HTMLElement): void {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const width = window.innerWidth;
    const height = window.innerHeight;
    const small = width <= 760 || (navigator.hardwareConcurrency ?? 8) <= 4;

    const bursts = small ? 10 : 18;
    const sparks = small ? 14 : 24;
    const step = small ? 300 : 170;

    for (let burst = 0; burst < bursts; burst++) {
      window.setTimeout(() => {
        const anchor = document.createElement('div');
        anchor.style.position = 'fixed';
        anchor.style.left = `${width * (0.06 + Math.random() * 0.88)}px`;
        anchor.style.top = `${height * (0.05 + Math.random() * 0.55)}px`;
        anchor.style.width = '0';
        anchor.style.height = '0';
        anchor.style.pointerEvents = 'none';
        host.appendChild(anchor);

        this.sparkle.trigger(anchor, FIREWORK_COLORS, sparks);
        window.setTimeout(() => anchor.remove(), 1400);
      }, burst * step + Math.random() * step * 0.5);
    }
  }
}
