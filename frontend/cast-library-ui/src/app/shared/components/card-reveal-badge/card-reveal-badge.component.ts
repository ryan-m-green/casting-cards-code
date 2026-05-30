import { Component, Input, Output, EventEmitter, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CrbSparkHostComponent } from '../crb-spark-host/crb-spark-host.component';

@Component({
  selector: 'app-card-reveal-badge',
  standalone: true,
  imports: [CommonModule, CrbSparkHostComponent],
  templateUrl: './card-reveal-badge.component.html',
  styleUrl: './card-reveal-badge.component.scss',
})
export class CardRevealBadgeComponent implements OnInit, OnDestroy {
  @Input() count = 0;
  @Input() hidden = false;
  @Output() badgeClicked = new EventEmitter<void>();

  badgeVisible = false;

  ngOnInit() {
    // Show badge text after ripple animation completes (3 seconds)
    setTimeout(() => {
      this.badgeVisible = true;
    }, 3000);
  }

  ngOnDestroy() {
    // No cleanup needed - crb-spark-host handles its own cleanup
  }

  onClick() {
    this.badgeClicked.emit();
  }
}
