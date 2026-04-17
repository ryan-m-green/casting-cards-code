import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-wizard-secret-overlay',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './wizard-secret-overlay.component.html',
  styleUrl: './wizard-secret-overlay.component.scss',
})
export class WizardSecretOverlayComponent {
  @Input() content: string | null = null;
  @Input() portalColor: string = '#6e28d0';
  @Output() dismissed    = new EventEmitter<void>();
  @Output() goToSecrets  = new EventEmitter<void>();

  dismiss() { this.dismissed.emit(); }
}
