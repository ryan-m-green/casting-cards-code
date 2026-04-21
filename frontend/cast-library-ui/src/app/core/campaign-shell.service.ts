import { Injectable, signal } from '@angular/core';

export interface CampaignCrumb {
  label: string;
  action: () => void;
}

@Injectable({ providedIn: 'root' })
export class CampaignShellService {
  title  = signal('');
  crumbs = signal<CampaignCrumb[]>([]);

  setTitle(title: string)  { this.title.set(title); }
  setCrumbs(crumbs: CampaignCrumb[]) { this.crumbs.set(crumbs); }
}
