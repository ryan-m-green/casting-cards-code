import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-subscribe',
  standalone: true,
  templateUrl: './subscribe.component.html',
  styleUrl: './subscribe.component.scss'
})
export class SubscribeComponent {
  constructor(private router: Router) {}

  subscribe() {
    // TODO: integrate Stripe payment flow
    this.router.navigate(['/dm/dashboard']);
  }

  continueFree() {
    this.router.navigate(['/dm/dashboard']);
  }
}
