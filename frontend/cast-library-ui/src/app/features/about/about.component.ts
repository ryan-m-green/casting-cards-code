import { Component, ElementRef, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-about',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './about.component.html',
  styleUrl: './about.component.scss'
})
export class AboutComponent {
  @ViewChild('demoVideo') videoRef!: ElementRef<HTMLVideoElement>;

  constructor(private router: Router) {}

  navigateToJoin() {
    this.router.navigate(['/join']);
  }
}
