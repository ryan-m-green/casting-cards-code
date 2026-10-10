import { Component, ElementRef, effect, inject, viewChild } from '@angular/core';
import { EncounterCelebrationService } from '../../../../../core/encounter-celebration.service';

@Component({
  selector: 'cc-encounter-celebration',
  standalone: true,
  imports: [],
  templateUrl: './cc-encounter-celebration.component.html',
  styleUrl: './cc-encounter-celebration.component.scss'
})
export class CcEncounterCelebrationComponent {
  private celebration = inject(EncounterCelebrationService);

  private readonly hostRef = viewChild<ElementRef<HTMLElement>>('host');

  readonly active = this.celebration.active;

  constructor() {
    effect(() => {
      if (this.celebration.phase() !== 'bursting') return;

      const host = this.hostRef()?.nativeElement;
      if (host) this.celebration.fireworks(host);
    });
  }
}
