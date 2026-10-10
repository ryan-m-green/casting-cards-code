import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class FlipAnimationService {
  private flipInProgress = signal(false);

  readonly isFlipInProgress = this.flipInProgress.asReadonly();

  startFlip() {
    this.flipInProgress.set(true);
  }

  endFlip() {
    this.flipInProgress.set(false);
  }
}
