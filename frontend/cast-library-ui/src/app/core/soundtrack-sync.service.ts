import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class SoundtrackSyncService {
  private refreshTrigger = signal(0);

  get refreshTrigger$() {
    return this.refreshTrigger.asReadonly();
  }

  triggerRefresh() {
    this.refreshTrigger.update(n => n + 1);
  }
}
