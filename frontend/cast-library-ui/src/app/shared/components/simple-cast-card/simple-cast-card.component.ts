import { Component, input } from '@angular/core';
import { Cast, CampaignCastInstance } from '../../models/cast.model';
import { CcCastIconComponent } from '../v2/cc-cast-icon/cc-cast-icon.component';

@Component({
  selector: 'app-simple-cast-card',
  standalone: true,
  imports: [CcCastIconComponent],
  templateUrl: './simple-cast-card.component.html',
  styleUrl: './simple-cast-card.component.scss'
})
export class SimpleCastCardComponent {
  cast = input.required<Cast | CampaignCastInstance>();
}