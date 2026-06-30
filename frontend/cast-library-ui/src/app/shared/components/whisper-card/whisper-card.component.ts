import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-whisper-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './whisper-card.component.html',
  styleUrl: './whisper-card.component.scss',
})
export class WhisperCardComponent {
  @Input() content: string | null = null;
  @Input() recipient: string = '';
  @Input() portalColor: string = '#6e28d0';
  @Input() dismissable: boolean = false;
  @Input() focused: boolean = true;
  @Output() goToSecrets = new EventEmitter<void>();
  @Output() dismissed = new EventEmitter<void>();

  dismiss() { this.dismissed.emit(); }
}
