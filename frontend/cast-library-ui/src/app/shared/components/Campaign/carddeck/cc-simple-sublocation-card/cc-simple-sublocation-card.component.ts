import { Component, ChangeDetectionStrategy, input } from '@angular/core';
import { Sublocation, CampaignSublocationInstance } from '../../../../models/sublocation.model';
import { CcSublocationIconComponent } from '../../../Shared/cc-sublocation-icon/cc-sublocation-icon.component';

@Component({
  selector: 'cc-simple-sublocation-card',
  standalone: true,
  imports: [CcSublocationIconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './cc-simple-sublocation-card.component.html',
  styleUrl: './cc-simple-sublocation-card.component.scss'
})
export class CcSimpleSublocationCardComponent {
  sublocation = input.required<Sublocation | CampaignSublocationInstance>();

  get shopItemCount(): number {
    return this.sublocation().shopItems?.length ?? 0;
  }
}