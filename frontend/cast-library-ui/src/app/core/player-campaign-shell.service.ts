import { Injectable, signal } from '@angular/core';

export interface PlayerCampaignCrumb {
  label: string;
  action: () => void;
}

@Injectable({ providedIn: 'root' })
export class PlayerCampaignShellService {
  title  = signal('');
  crumbs = signal<PlayerCampaignCrumb[]>([]);

  setTitle(title: string)  { this.title.set(title); }
  setCrumbs(crumbs: PlayerCampaignCrumb[]) { this.crumbs.set(crumbs); }
}
