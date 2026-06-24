import { Component, ElementRef, ViewChild, AfterViewInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import videojs from 'video.js';
import 'video.js/dist/video-js.css';

@Component({
  selector: 'app-about',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './about.component.html',
  styleUrl: './about.component.scss'
})
export class AboutComponent implements AfterViewInit, OnDestroy {
  @ViewChild('demoVideo') videoRef!: ElementRef<HTMLVideoElement>;
  player: any;

  constructor(private router: Router) {}

  navigateToJoin() {
    this.router.navigate(['/join']);
  }

  ngAfterViewInit() {
    if (this.videoRef) {
      this.player = videojs(this.videoRef.nativeElement, {
        controls: true,
        autoplay: true,
        muted: true,
        loop: true,
        responsive: true,
        preload: 'auto',
        aspectRatio: '16:9'
      });
    }
  }

  ngOnDestroy() {
    if (this.player) {
      this.player.dispose();
    }
  }
}
