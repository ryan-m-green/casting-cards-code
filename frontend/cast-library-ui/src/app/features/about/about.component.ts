import { Component, inject } from '@angular/core';
import { AuthService } from '../../core/auth/auth.service';
import { JournalTitleComponent } from '../../shared/components/journal-title/journal-title.component';

@Component({
  selector: 'app-about',
  standalone: true,
  imports: [JournalTitleComponent],
  templateUrl: './about.component.html',
  styleUrl: './about.component.scss'
})
export class AboutComponent {
  auth = inject(AuthService);
}
