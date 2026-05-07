import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-journal-title',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './journal-title.component.html',
  styleUrl: './journal-title.component.scss'
})
export class JournalTitleComponent {
  readonly title    = input.required<string>();
  readonly subtitle = input<string>();
  readonly username = input<string>();
  readonly align    = input<'left' | 'center'>('left');
}
