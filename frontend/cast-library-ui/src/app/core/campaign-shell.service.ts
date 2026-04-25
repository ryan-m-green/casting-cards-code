import { Injectable, signal } from '@angular/core';
import { ShellCrumb } from '../shared/components/shell-breadcrumbs/shell-breadcrumbs.component';

export type CampaignCrumb = ShellCrumb;

@Injectable({ providedIn: 'root' })
export class CampaignShellService {
  title  = signal('');
  crumbs = signal<ShellCrumb[]>([]);

  setTitle(title: string)  { this.title.set(title); }
  setCrumbs(crumbs: ShellCrumb[]) { this.crumbs.set(crumbs); }
}
