import { Component, AfterViewInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-about',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './about.component.html',
  styleUrl: './about.component.scss'
})
export class AboutComponent implements AfterViewInit, OnDestroy {
  videos = [
    'https://dev-casting-cards-files.sfo3.digitaloceanspaces.com/video/CreatorIntro.mp4',
    'https://dev-casting-cards-files.sfo3.digitaloceanspaces.com/video/DayCycle.mp4',
    'https://dev-casting-cards-files.sfo3.digitaloceanspaces.com/video/Quicknotes.mp4',
    'https://dev-casting-cards-files.sfo3.digitaloceanspaces.com/video/Storyline.mp4'
  ];
  
  currentSlide = 0;
  private videosInitialized = false;

  constructor(private router: Router) {}

  ngAfterViewInit() {
    // Wait for videos to be rendered
    setTimeout(() => {
      this.videosInitialized = true;
      this.playCurrentVideo();
    }, 100);
  }

  ngOnDestroy() {
    this.pauseAllVideos();
  }

  nextSlide() {
    this.pauseAllVideos();
    this.currentSlide = (this.currentSlide + 1) % this.videos.length;
    this.playCurrentVideo();
  }

  prevSlide() {
    this.pauseAllVideos();
    this.currentSlide = (this.currentSlide - 1 + this.videos.length) % this.videos.length;
    this.playCurrentVideo();
  }

  goToSlide(index: number) {
    this.pauseAllVideos();
    this.currentSlide = index;
    this.playCurrentVideo();
  }

  private pauseAllVideos() {
    if (!this.videosInitialized) return;
    
    for (let i = 0; i < this.videos.length; i++) {
      const video = document.getElementById(`video-${i}`) as HTMLVideoElement;
      if (video) {
        video.pause();
        video.currentTime = 0;
      }
    }
  }

  private playCurrentVideo() {
    if (!this.videosInitialized) return;
    
    const currentVideo = document.getElementById(`video-${this.currentSlide}`) as HTMLVideoElement;
    if (currentVideo) {
      currentVideo.muted = true;
      currentVideo.play().catch(err => {
      });
    }
  }

  navigateToJoin() {
    this.router.navigate(['/join']);
  }
}
