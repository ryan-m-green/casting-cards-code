import { Component, computed, inject, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CastTravelTarget } from '../../../../models/cast-travel.model';
import { CampaignShellService } from '../../../../../core/campaign-shell.service';

@Component({
  selector: 'cc-cast-travel',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './cc-cast-travel.component.html',
  styleUrl: './cc-cast-travel.component.scss'
})
export class CcCastTravelComponent {
  private shell = inject(CampaignShellService);

  readonly campaignId = input('');
  readonly castInstanceId = input('');
  readonly sublocationInstanceId = input('');
  readonly castName = input('');

  readonly canTravel = computed(() => !!this.campaignId() && !!this.castInstanceId());

  openTravelDrawer() {
    if (!this.canTravel()) return;

    const target: CastTravelTarget = {
      campaignId: this.campaignId(),
      castInstanceId: this.castInstanceId(),
      castName: this.castName(),
      sublocationInstanceId: this.sublocationInstanceId(),
    };

    this.shell.openCastTravelDrawer(target);
  }
}
