import { Injectable, computed, inject } from '@angular/core';
import { AuthService } from './auth/auth.service';
import { CampaignShellService } from './campaign-shell.service';

@Injectable({ providedIn: 'root' })
export class CampaignGmService {
  private auth = inject(AuthService);
  private shellSvc = inject(CampaignShellService);

  readonly isDm = computed(() => {
    if (!this.auth.isDm()) return false;

    const campaign = this.shellSvc.campaign();

    const owner = campaign?.dmUserId;
    const me = this.auth.currentUser()?.id;

    return owner && me ? owner === me : true;
  });
}
