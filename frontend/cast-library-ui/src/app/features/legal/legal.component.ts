import { Component, inject, signal } from '@angular/core';
import { AuthService } from '../../core/auth/auth.service';
import { JournalTitleComponent } from '../../shared/components/journal-title/journal-title.component';

type LegalTab = 'privacy' | 'terms' | 'cookies' | 'accessibility';

@Component({
  selector: 'app-legal',
  standalone: true,
  imports: [JournalTitleComponent],
  templateUrl: './legal.component.html',
  styleUrl: './legal.component.scss'
})
export class LegalComponent {
  auth      = inject(AuthService);

  menuOpen  = signal(false);
  activeTab = signal<LegalTab>('privacy');

  setTab(tab: LegalTab) {
    this.activeTab.set(tab);
  }
}
