import { Component, ChangeDetectionStrategy, OnDestroy, OnInit, computed, inject, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { CampaignShellService } from '../../../../../core/campaign-shell.service';
import { CardLink, CardLinkWriter } from '../../../../models/card-link.model';

@Component({
  selector: 'cc-card-linker',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './cc-card-linker.component.html',
  styleUrl: './cc-card-linker.component.scss'
})
export class CcCardLinkerComponent implements OnInit, OnDestroy {
  private shellSvc = inject(CampaignShellService);

  readonly campaignId = input.required<string>();
  readonly subjectId = input.required<string>();
  readonly save = input.required<CardLinkWriter>();

  readonly linkedCards = input<CardLink[]>([]);

  readonly portalColor = input<string>('#6e28d0');

  readonly disabled = input(false);

  readonly label = input('Link cards to this record');

  readonly linkedCardsChange = output<CardLink[]>();

  readonly count = computed(() => this.linkedCards().length);

  readonly ariaLabel = computed(() => this.count()
    ? `${this.label()} (${this.count()} linked)`
    : this.label());

  private subscriptions: Subscription[] = [];

  ngOnInit(): void {
    this.subscriptions.push(
      this.shellSvc.cardLinksChanged.subscribe(result => {
        if (result.subjectId !== this.subjectId()) return;
        this.linkedCardsChange.emit(result.linkedCards);
      })
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  openPicker(): void {
    if (this.disabled() || !this.campaignId()) return;

    this.shellSvc.openCardLinkDrawer({
      campaignId: this.campaignId(),
      subjectId: this.subjectId(),
      linkedCards: [...this.linkedCards()],
      save: this.save(),
    });
  }
}
