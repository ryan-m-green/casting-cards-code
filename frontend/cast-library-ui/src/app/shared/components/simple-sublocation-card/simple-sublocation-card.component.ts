import { Component, input } from '@angular/core';
import { Sublocation, CampaignSublocationInstance } from '../../models/sublocation.model';
import { CcSublocationIconComponent } from '../v2/cc-sublocation-icon/cc-sublocation-icon.component';

@Component({
  selector: 'app-simple-sublocation-card',
  standalone: true,
  imports: [CcSublocationIconComponent],
  templateUrl: './simple-sublocation-card.component.html',
  styleUrl: './simple-sublocation-card.component.scss'
})
export class SimpleSublocationCardComponent {
  sublocation = input.required<Sublocation | CampaignSublocationInstance>();

  get shopItemCount(): number {
    return this.sublocation().shopItems?.length ?? 0;
  }
}