import { Component, ChangeDetectionStrategy, ElementRef, effect, inject, input } from '@angular/core';
import { TREE_JOINT_FADE_MS, TREE_JOINT_RETURN_DELAY_MS, prefersReducedMotion } from '../../../../directives/cc-card-fade.directive';

export type TreeJointOrientation = 'down' | 'side';

export type TreeJointStand = 'gap' | 'box' | 'corner-left' | 'corner-right';

@Component({
  selector: 'cc-tree-joint',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './cc-tree-joint.component.html',
  styleUrl: './cc-tree-joint.component.scss',
  host: {
    'aria-hidden': 'true',
    '[class.tree-joint--side]': "orientation() === 'side'",
    '[class.tree-joint--box]': "stand() === 'box'",
    '[class.tree-joint--corner-left]': "stand() === 'corner-left'",
    '[class.tree-joint--corner-right]': "stand() === 'corner-right'",
  },
})
export class CcTreeJointComponent {
  readonly orientation = input<TreeJointOrientation>('down');

  readonly stand = input<TreeJointStand>('gap');

  readonly transitioning = input<boolean>(false);

  private readonly host: ElementRef<HTMLElement> = inject(ElementRef);

  private readonly reducedMotion = prefersReducedMotion();

  private fade: Animation | null = null;

  private away = false;

  private begun = false;

  constructor() {
    effect(() => {
      const away = this.transitioning();
      if (this.begun && away === this.away) return;

      this.begun = true;
      this.away = away;

      if (this.reducedMotion) return;

      if (away) {
        this.withdraw();
      } else {
        this.draw();
      }
    });
  }

  private withdraw(): void {
    const from = this.painted();
    this.fade?.cancel();
    this.fade = this.host.nativeElement.animate(
      [{ opacity: from }, { opacity: 0 }],
      { duration: TREE_JOINT_FADE_MS, easing: 'ease', fill: 'forwards' }
    );
  }

  private draw(): void {
    this.fade?.cancel();
    this.fade = this.host.nativeElement.animate(
      [{ opacity: 0 }, { opacity: this.painted() }],
      { duration: TREE_JOINT_FADE_MS, delay: TREE_JOINT_RETURN_DELAY_MS, easing: 'ease', fill: 'backwards' }
    );
  }

  private painted(): string {
    return getComputedStyle(this.host.nativeElement).opacity;
  }
}
