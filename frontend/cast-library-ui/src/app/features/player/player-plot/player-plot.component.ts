import { Component, OnInit, OnDestroy, signal, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs';
import { PlayerCampaignShellService } from '../../../core/player-campaign-shell.service';
import { CampaignHubService } from '../../../core/hub/campaign-hub.service';
import { PlayerEventsComponent } from '../player-events/player-events.component';
import type { TimeOfDay } from '../../../shared/models/time-of-day.model';

type PlayerPlotTab = 'storyline';

// Player plot component with storyline tab
@Component({
  selector: 'app-player-plot',
  standalone: true,
  imports: [CommonModule, PlayerEventsComponent],
  templateUrl: './player-plot.component.html',
  styleUrl: './player-plot.component.scss',
})
export class PlayerPlotComponent implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private shellSvc = inject(PlayerCampaignShellService);
  private hub = inject(CampaignHubService);
  private hubSubscriptions: Subscription[] = [];

  campaignId = '';
  activeTab = signal<PlayerPlotTab>('storyline');

  timeOfDay = computed(() => this.shellSvc.campaign()?.timeOfDay ?? null);

  setTab(tab: PlayerPlotTab) {
    this.activeTab.set(tab);
  }

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id')!;
    this.campaignId = id;
    this.shellSvc.setTitleContext({ pageType: 'player-plot', campaignId: id, campaignName: this.shellSvc.campaign()?.name, baseRoute: '/player/campaign', location: null });

    this.hubSubscriptions.push(
      this.hub.sessionEnded$.subscribe(e => {
        if (!e || e.campaignId !== this.campaignId) return;
      })
    );
  }

  ngOnDestroy() {
    this.hubSubscriptions.forEach(sub => sub.unsubscribe());
  }

  getIconForType(type: string): string {
    const icons: Record<string, string> = {
      cast: 'user',
      faction: 'shield',
      location: 'map-pin',
      sublocation: 'home',
      player: 'users',
      campaign: 'book',
      handout: 'file-text'
    };
    return icons[type] || 'circle';
  }
}
