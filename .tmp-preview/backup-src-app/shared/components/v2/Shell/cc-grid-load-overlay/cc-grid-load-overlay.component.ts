import { Component, ChangeDetectionStrategy, OnDestroy, computed, effect, inject, signal } from '@angular/core';
import { CampaignGridLoadService } from '../../../../../core/campaign-grid-load.service';
import { CampaignShellService } from '../../../../../core/campaign-shell.service';

@Component({
  selector: 'cc-grid-load-overlay',
  standalone: true,
  template: ` `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './cc-grid-load-overlay.component.scss',
  host: { '[class.is-lifting]': 'lifting()' }
})
export class CcGridLoadOverlayComponent implements OnDestroy {
  private readonly gridLoad = inject(CampaignGridLoadService);
  private readonly shell = inject(CampaignShellService);

  private static readonly MINIMUM_MS = 500;

  private static readonly GIVE_UP_MS = 8000;

  readonly lifting = signal(false);

  private readonly minimumPassed = signal(false);

  private readonly ready = computed(() =>
    this.minimumPassed() && this.gridLoad.allLoaded() && !!this.shell.campaign()
  );

  private readonly minimumTimer = window.setTimeout(
    () => this.minimumPassed.set(true), CcGridLoadOverlayComponent.MINIMUM_MS);

  private readonly giveUpTimer = window.setTimeout(
    () => this.lift(true), CcGridLoadOverlayComponent.GIVE_UP_MS);

  constructor() {
    effect(() => {
      if (this.ready()) this.lift(false);
    });
  }

  ngOnDestroy(): void {
    window.clearTimeout(this.minimumTimer);
    window.clearTimeout(this.giveUpTimer);
  }

  private lift(gaveUp: boolean): void {
    if (this.lifting()) return;

    if (gaveUp) {
      console.warn(
        'The grid curtain lifted with areas still loading its content:',
        this.gridLoad.pendingAreas()
      );
    }

    this.lifting.set(true);
  }
}
