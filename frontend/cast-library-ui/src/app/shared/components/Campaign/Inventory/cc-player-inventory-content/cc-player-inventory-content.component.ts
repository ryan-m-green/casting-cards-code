import { Component, ChangeDetectionStrategy, Input, OnInit, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../../../environments/environment';
import { InventoryItem } from '../../../../models/inventory-item.model';
import { CampaignShellService } from '../../../../../core/campaign-shell.service';


@Component({
  selector: 'cc-player-inventory-content',
  standalone: true,
  imports: [],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './cc-player-inventory-content.component.html',
  styleUrl: './cc-player-inventory-content.component.scss'
})
export class CcPlayerInventoryContentComponent implements OnInit {
  private http = inject(HttpClient);
  private shellSvc = inject(CampaignShellService);

  @Input() campaignId = '';
  @Input() portalColor = '#6e28d0';
  @Input() item: InventoryItem | null = null;

  readonly count = signal(0);
  readonly using = signal(false);
  readonly error = signal('');

  ngOnInit(): void {
    this.count.set(this.item?.count ?? 0);
  }

  get itemName(): string {
    return this.item?.name ?? '';
  }

  get itemDescription(): string {
    return this.item?.description ?? '';
  }

  useItem(): void {
    const item = this.item;
    if (!item || this.using() || this.count() <= 0) return;

    this.using.set(true);
    this.error.set('');

    this.http.post(
      `${environment.apiUrl}/api/campaigns/${this.campaignId}/player-cards/inventory/use`,
      { InventoryItemId: item.id }
    ).subscribe({
      next: () => {
        this.using.set(false);
        this.count.update(left => Math.max(0, left - 1));
        this.shellSvc.publishInventoryChanged();
      },
      error: () => {
        this.using.set(false);
        this.error.set('Could not use that item.');
      },
    });
  }
}
