import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { PlayerCampaignShellService } from '../../../core/player-campaign-shell.service';
import { PlayerEventsComponent } from '../player-events/player-events.component';

type PlayerPlotTab = 'storyline' | 'chronicles';

// Player plot component with tabs for storyline and chronicles
@Component({
  selector: 'app-player-plot',
  standalone: true,
  imports: [CommonModule, PlayerEventsComponent],
  templateUrl: './player-plot.component.html',
  styleUrl: './player-plot.component.scss',
})
export class PlayerPlotComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private shellSvc = inject(PlayerCampaignShellService);

  campaignId = '';
  activeTab = signal<PlayerPlotTab>('storyline');

  setTab(tab: PlayerPlotTab) {
    this.activeTab.set(tab);
  }

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id')!;
    this.campaignId = id;
    this.shellSvc.setTitleContext({ pageType: 'player-plot', campaignId: id, baseRoute: '/player/campaign', location: null });
  }
}
