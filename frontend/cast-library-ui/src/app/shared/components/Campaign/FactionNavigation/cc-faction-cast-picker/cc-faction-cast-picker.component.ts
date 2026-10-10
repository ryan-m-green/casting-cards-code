import { Component, computed, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { catchError, forkJoin, map, of } from 'rxjs';
import { environment } from '../../../../../../environments/environment';
import { CampaignCastInstance } from '../../../../models/cast.model';
import { CampaignShellService } from '../../../../../core/campaign-shell.service';
import { CcSimpleCastCardComponent } from '../../carddeck/cc-simple-cast-card/cc-simple-cast-card.component';
import { CcTextboxComponent } from '../../../Shared/cc-textbox/cc-textbox.component';

interface CastKeywordChip {
  keyword: string;
  count: number;
}

@Component({
  selector: 'cc-faction-cast-picker',
  standalone: true,
  imports: [FormsModule, CcTextboxComponent, CcSimpleCastCardComponent],
  templateUrl: './cc-faction-cast-picker.component.html',
  styleUrl: './cc-faction-cast-picker.component.scss'
})
export class CcFactionCastPickerComponent {
  private http = inject(HttpClient);
  private shellSvc = inject(CampaignShellService);

  readonly isDm = this.shellSvc.isDm;

  readonly campaignId = input.required<string>();
  readonly factionInstanceId = input.required<string>();
  readonly factionName = input('');
  readonly portalColor = input<string>('#6e28d0');

  readonly closeDrawer = output<void>();

  private readonly campaignCasts = computed<CampaignCastInstance[]>(() => {
    const casts = this.shellSvc.campaign()?.casts ?? [];
    return this.isDm() ? casts : casts.filter(cast => cast.isVisibleToPlayers);
  });

  private readonly memberIds = computed<ReadonlySet<string>>(() => {
    const faction = this.shellSvc.campaign()?.factions
      .find(f => f.factionInstanceId === this.factionInstanceId());
    return new Set(faction?.castInstanceIds ?? []);
  });

  readonly search = signal('');
  readonly activeKeywords = signal<string[]>([]);
  readonly matchAll = signal(false);
  readonly selectedIds = signal<ReadonlySet<string>>(new Set());
  readonly busy = signal(false);
  readonly error = signal<string | null>(null);

  readonly selectedCount = computed(() => this.selectedIds().size);
  readonly canAdd = computed(() => this.selectedCount() > 0 && !this.busy());

  readonly campaignEmpty = computed(() => this.campaignCasts().length === 0);

  private readonly offeredCasts = computed<CampaignCastInstance[]>(() => {
    const held = this.memberIds();
    const term = this.search().trim().toLowerCase();

    return this.campaignCasts()
      .filter(cast => !held.has(cast.instanceId))
      .filter(cast => !term || this.matches(cast, term));
  });

  readonly candidates = computed<CampaignCastInstance[]>(() =>
    this.withKeywords(this.offeredCasts()).sort((a, b) => a.name.localeCompare(b.name))
  );

  readonly keywordChips = computed<CastKeywordChip[]>(() => {
    const offered = this.offeredCasts();
    const keywords = new Set<string>();
    for (const cast of offered) {
      for (const keyword of cast.keywords ?? []) keywords.add(keyword);
    }

    return [...keywords]
      .map(keyword => ({
        keyword,
        count: this.withKeywords(offered, [...this.activeKeywords(), keyword]).length,
      }))
      .sort((a, b) => a.keyword.localeCompare(b.keyword));
  });

  isSelected(instanceId: string): boolean {
    return this.selectedIds().has(instanceId);
  }

  toggleCast(cast: CampaignCastInstance) {
    this.selectedIds.update(current => {
      const next = new Set(current);
      if (next.has(cast.instanceId)) next.delete(cast.instanceId);
      else next.add(cast.instanceId);
      return next;
    });
  }

  clearSelection() {
    this.selectedIds.set(new Set());
  }

  onSearchChange(term: string) {
    this.search.set(term);
  }

  isKeywordOn(keyword: string): boolean {
    return this.activeKeywords().includes(keyword);
  }

  toggleKeyword(keyword: string) {
    this.activeKeywords.update(current =>
      current.includes(keyword) ? current.filter(k => k !== keyword) : [...current, keyword]);
  }

  toggleMatchAll() {
    this.matchAll.update(all => !all);
  }

  onAdd() {
    const ids = [...this.selectedIds()];
    if (!ids.length || this.busy()) return;

    this.busy.set(true);
    this.error.set(null);

    const party = this.isDm() ? '' : 'party/';

    forkJoin(ids.map(castInstanceId =>
      this.http.post<void>(
        `${environment.apiUrl}/api/campaign/${this.campaignId()}/factions/${this.factionInstanceId()}/${party}cast/${castInstanceId}`,
        null
      ).pipe(
        map(() => true),
        catchError(() => of(false))
      )
    )).subscribe(results => {
      this.busy.set(false);

      const added = ids.filter((_, index) => results[index]);
      if (!added.length) {
        this.error.set(`Could not add the cast to ${this.factionName() || 'this faction'}.`);
        return;
      }

      this.clearSelection();
      this.shellSvc.publishFactionsChanged(this.campaignId());
      this.closeDrawer.emit();
    });
  }

  private matches(cast: CampaignCastInstance, term: string): boolean {
    return cast.name.toLowerCase().includes(term)
      || cast.role.toLowerCase().includes(term)
      || cast.race.toLowerCase().includes(term)
      || (cast.keywords ?? []).some(keyword => keyword.toLowerCase().includes(term));
  }

  private withKeywords(
    cards: CampaignCastInstance[],
    keywords: readonly string[] = this.activeKeywords()
  ): CampaignCastInstance[] {
    if (!keywords.length) return cards;

    const wanted = keywords.map(keyword => keyword.toLowerCase());
    const matchAll = this.matchAll();

    return cards.filter(cast => {
      const carried = (cast.keywords ?? []).map(keyword => keyword.toLowerCase());
      return matchAll
        ? wanted.every(keyword => carried.includes(keyword))
        : wanted.some(keyword => carried.includes(keyword));
    });
  }
}
