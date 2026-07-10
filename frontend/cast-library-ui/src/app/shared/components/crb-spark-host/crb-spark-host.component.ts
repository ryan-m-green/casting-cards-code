import { Component, inject, ElementRef, ViewChild, OnDestroy, OnInit, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SparkleService } from '../../services/sparkle.service';

@Component({
  selector: 'app-crb-spark-host',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './crb-spark-host.component.html',
  styleUrl: './crb-spark-host.component.scss'
})
export class CrbSparkHostComponent implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild('sparkHost') sparkHostRef!: ElementRef<HTMLElement>;
  @ViewChild('lightSource') lightSourceRef!: ElementRef<HTMLElement>;

  private sparkleService = inject(SparkleService);
  private sparkInterval?: ReturnType<typeof setInterval>;

  showRipple = true;

  ngOnInit() {
    // Start continuous sparkler effect
    this.sparkInterval = setInterval(() => {
      if (this.sparkHostRef) {
        this.sparkleService.triggerSparkler(this.sparkHostRef.nativeElement);
      }
    }, 100);
  }

  ngAfterViewInit() {
    // Start ripple animation immediately
      if (this.lightSourceRef) {
        const rect = this.lightSourceRef.nativeElement.getBoundingClientRect();
        const rippleElements = document.querySelectorAll('.crb-ripple');
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;

        rippleElements.forEach((ripple: Element) => {
          (ripple as HTMLElement).style.left = `${centerX}px`;
          (ripple as HTMLElement).style.top = `${centerY}px`;
        });
      }
  }

  ngOnDestroy() {
    if (this.sparkInterval) {
      clearInterval(this.sparkInterval);
    }
  }
}
