import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'cc-whisper-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './cc-whisper-card.component.html',
  styleUrl: './cc-whisper-card.component.scss',
})
export class CcWhisperCardComponent {
  @Input() content: string | null = null;
  @Input() recipient: string = '';
  @Input() portalColor: string = '#6e28d0';
  @Input() dismissable: boolean = false;
  @Input() focused: boolean = true;
  @Input() shared: boolean = false;
  @Output() goToSecrets = new EventEmitter<void>();
  @Output() dismissed = new EventEmitter<void>();

  dismiss() { this.dismissed.emit(); }
}
