import { Component, ElementRef, HostListener, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';

@Component({
  selector: 'app-dm-nav',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './dm-nav.component.html',
  styleUrl: './dm-nav.component.scss'
})
export class DmNavComponent {
  auth    = inject(AuthService);
  private el = inject(ElementRef);

  menuOpen = signal(false);

  toggleMenu() { this.menuOpen.update(v => !v); }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    if (!this.el.nativeElement.contains(event.target)) {
      this.menuOpen.set(false);
    }
  }
}
