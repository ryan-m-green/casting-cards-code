import {
  ChangeDetectionStrategy, Component, ElementRef, Injector, afterNextRender, effect, inject, input, output, viewChild,
} from '@angular/core';

export type EncounterFate = 'defeated' | 'captured' | 'fled';

const FATE_LABELS: Record<EncounterFate, string> = {
  defeated: 'Defeated',
  captured: 'Captured',
  fled: 'Fled',
};

let nextFatePaperId = 0;

@Component({
  selector: 'cc-encounter-fate',
  standalone: true,
  imports: [],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './cc-encounter-fate.component.html',
  styleUrl: './cc-encounter-fate.component.scss',
})
export class CcEncounterFateComponent {
  readonly fates = input<EncounterFate[]>([]);
  readonly ariaLabel = input('Encounter fates');
  readonly where = input('');
  readonly whereTitle = input('');
  readonly noteLabel = input('Notes');
  readonly hasNote = input(false);
  readonly noteTitle = input('');

  readonly whereClick = output<void>();

  readonly openNote = output<void>();

  private static readonly WHERE_FONT_PX = 15;
  private static readonly WHERE_FONT_MIN_PX = 8;

  private readonly whereRow = viewChild<ElementRef<HTMLElement>>('whereRow');
  private injector = inject(Injector);

  constructor() {
    effect(() => {
      this.where();
      afterNextRender(() => this.fitWhere(), { injector: this.injector });
    });

    afterNextRender(() => {
      document.fonts?.ready.then(() => this.fitWhere());
    }, { injector: this.injector });
  }

  private fitWhere(): void {
    const row = this.whereRow()?.nativeElement;
    if (!row) return;

    row.style.fontSize = '';
    const base = parseFloat(getComputedStyle(row).fontSize) || CcEncounterFateComponent.WHERE_FONT_PX;
    const available = row.clientWidth;
    const natural = row.scrollWidth;
    if (!available || natural <= available) return;

    const fitted = (base * available) / natural;
    row.style.fontSize = `${Math.max(CcEncounterFateComponent.WHERE_FONT_MIN_PX, fitted)}px`;
  }

  private readonly paperId = `fate-paper-${nextFatePaperId++}`;
  readonly roughnessId = `${this.paperId}-roughness`;
  readonly shadowId = `${this.paperId}-shadow`;
  readonly gradientId = `${this.paperId}-grad`;
  readonly roughnessFilter = `url(#${this.roughnessId})`;
  readonly shadowFilter = `url(#${this.shadowId})`;
  readonly paperFill = `url(#${this.gradientId})`;

  readonly paperPath =
    'M 6,6.8 C 15,5.5 28,8.2 40,5.5 C 55,6.8 68,4.1 82,6.8 C 95,5.5 110,8.2 122,5.5 ' +
    'C 133,6.8 140,4.1 144,8.2 C 146,15.1 143,20.5 145,28.7 C 144,35.6 146,41.1 143,45.2 ' +
    'C 136,43.8 125,47.9 114,45.2 C 102,46.5 88,43.8 75,46.5 C 60,45.2 45,47.9 32,45.2 ' +
    'C 21,46.5 11,43.8 5,43.8 C 3,36.9 6,30.1 4,21.9 C 5,15.1 3,10.9 6,6.8 Z';

  private readonly tilts = new Map<EncounterFate, number>();

  tiltFor(fate: EncounterFate): number {
    let tilt = this.tilts.get(fate);
    if (tilt === undefined) {
      tilt = parseFloat((Math.random() * 8 - 4).toFixed(2));
      this.tilts.set(fate, tilt);
    }
    return tilt;
  }

  label(fate: EncounterFate): string {
    return FATE_LABELS[fate];
  }
}
