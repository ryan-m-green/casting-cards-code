import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-section-label',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './section-label.component.html',
  styleUrls: ['./section-label.component.scss']
})
export class SectionLabelComponent {
  @Input() title = '';
  @Input() color = '';
  @Input() fontWeight: string = '';
}
