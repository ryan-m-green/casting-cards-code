import { Component, ElementRef, HostListener, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { DmNavComponent } from '../../shared/components/dm-nav/dm-nav.component';

type LegalTab = 'privacy' | 'terms' | 'cookies' | 'accessibility';

@Component({
  selector: 'app-legal',
  standalone: true,
  imports: [RouterLink, DmNavComponent],
  templateUrl: './legal.component.html',
  styleUrl: './legal.component.scss'
})
export class LegalComponent {
  auth     = inject(AuthService);
  private el = inject(ElementRef);

  menuOpen = signal(false);
  activeTab = signal<LegalTab>('privacy');

  setTab(tab: LegalTab) {
    this.activeTab.set(tab);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    if (!this.el.nativeElement.contains(event.target)) {
      this.menuOpen.set(false);
    }
  }
}
