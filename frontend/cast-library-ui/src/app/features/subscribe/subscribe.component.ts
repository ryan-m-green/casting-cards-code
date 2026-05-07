import { Component } from '@angular/core';
import { JournalTitleComponent } from '../../shared/components/journal-title/journal-title.component';

@Component({
  selector: 'app-subscribe',
  standalone: true,
  imports: [JournalTitleComponent],
  templateUrl: './subscribe.component.html',
  styleUrl: './subscribe.component.scss'
})
export class SubscribeComponent {}
