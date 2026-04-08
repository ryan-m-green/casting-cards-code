import { Component, ElementRef, HostListener, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { DmNavComponent } from '../../shared/components/dm-nav/dm-nav.component';

@Component({
  selector: 'app-about',
  standalone: true,
  imports: [RouterLink, DmNavComponent],
  templateUrl: './about.component.html',
  styleUrl: './about.component.scss'
})
export class AboutComponent {
  auth     = inject(AuthService);
  private el = inject(ElementRef);

  menuOpen = signal(false);

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    if (!this.el.nativeElement.contains(event.target)) {
      this.menuOpen.set(false);
    }
  }
}
