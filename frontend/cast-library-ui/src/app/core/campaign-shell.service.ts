import { Injectable, signal } from '@angular/core';
import { Subject } from 'rxjs';
import { CampaignDetail } from '../shared/models/campaign.model';
import { VoidTitleContext } from '../shared/components/void-title-segments/void-title-segments.component';

@Injectable({ providedIn: 'root' })
export class CampaignShellService {
  title              = signal('');
  titleContext       = signal<VoidTitleContext | null>(null);
  voidTitleTopMargin = signal('10px');
  campaign           = signal<CampaignDetail | null>(null);
  openChronicleWithSearch = new Subject<string>();

  setTitle(title: string, topMargin = '10px') {
    this.title.set(title);
    this.titleContext.set(null);
    this.voidTitleTopMargin.set(topMargin);
  }

  setTitleContext(context: VoidTitleContext, topMargin = '10px') {
    this.title.set('');
    this.titleContext.set(context);
    this.voidTitleTopMargin.set(topMargin);
  }

  setCampaign(c: CampaignDetail) { this.campaign.set(c); }
  updateCampaign(updater: (c: CampaignDetail | null) => CampaignDetail | null) {
    this.campaign.update(updater);
  }

  openChronicleDrawerWithSearch(query: string) {
    this.openChronicleWithSearch.next(query);
  }
}
