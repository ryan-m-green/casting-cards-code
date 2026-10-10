import { Component, computed, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { catchError, forkJoin, map, of } from 'rxjs';
import { environment } from '../../../../../../environments/environment';
import { CampaignCastInstance } from '../../../../models/cast.model';
import { V2CampaignShellService } from '../../../../../core/v2-campaign-shell.service';
import { AuthService } from '../../../../../core/auth/auth.service';
import { CcSimpleCastCardComponent } from '../../carddeck/cc-simple-cast-card/cc-simple-cast-card.component';
import { CcTextboxComponent } from '../../Shared/cc-textbox/cc-textbox.component';

/** A keyword the campaign's cast cards carry, and how many of them carry it (a chip). */
interface CastKeywordChip {
  keyword: string;
  count: number;
}

/**
 * cc-faction-cast-picker
 *
 * Drawer content for giving a faction its cast members. A faction's members are drawn from the
 * campaign's own cast cards — this is a membership list, not the cast library — so there is nothing
 * to create here and nothing to page in from further afield: the candidates are the campaign's cast
 * cards the viewer may choose from that this faction does not already hold.
 *
 * Whose cards those are follows the campaign's own read for the role: a GM is handed every cast card
 * the campaign holds, and a player is handed the cards the DM has revealed to them (their copy of
 * the campaign carries no other card at all, see the shell). Both are read off the campaign the
 * shell holds — `V2CampaignShellService.campaign` — so a card the DM reveals or locks again reaches
 * this drawer as the campaign does (see the shell's visibility handling).
 *
 * A cast card can belong to any number of factions — nothing is taken out of the campaign by being
 * added — but never twice to the same one: a faction's own members are not offered to it (see
 * `memberIds`). A card every faction already holds is therefore offered by none of them, and taking
 * a card off a faction puts it back on offer there.
 *
 * The cards can be narrowed by free text — name, role, race or keyword — and, for a GM, by
 * keyword chips: the chips are the GM's own filters over the DM's campaign, and a player's
 * drawer does not offer them (see the template). The chips are read off the campaign's own
 * cards, never off the cast library's keyword index: the library is not what is being added to
 * a faction, so its keywords are not filters here. They follow the search box, and a chip's
 * count is what would be left were it picked as well as the ones already picked, so the buttons
 * only ever speak for the cards on offer.
 *
 * Candidates are picked one after another into a set (clicking again takes one back out) and
 * "Add" writes every pick into the faction at once — one
 * `POST .../factions/{id}/cast/{castId}` per card, a pick that fails reported but not holding
 * the others back. Whose membership the picks land in follows whose drawer it is: the GM's own,
 * or — a player's — the party's own, written under `.../factions/{id}/party/cast/{castId}` so
 * it sits beside the GM's row rather than in it (see the API). A success raises
 * `factionsChanged` on the shell service, so the campaign and the faction row behind the drawer
 * both pick the new member up, then asks for the drawer to be closed.
 */
@Component({
  selector: 'cc-faction-cast-picker',
  standalone: true,
  imports: [FormsModule, CcTextboxComponent, CcSimpleCastCardComponent],
  templateUrl: './cc-faction-cast-picker.component.html',
  styleUrl: './cc-faction-cast-picker.component.scss'
})
export class CcFactionCastPickerComponent {
  private http = inject(HttpClient);
  private shellSvc = inject(V2CampaignShellService);
  private auth = inject(AuthService);

  /** Whether the picks are the GM's own membership rather than the party's. */
  readonly isDm = this.auth.isDm;

  /** Campaign the faction lives in, and the faction the picks go into. */
  readonly campaignId = input.required<string>();
  readonly factionInstanceId = input.required<string>();
  /** The faction's name, for the drawer's own section line. */
  readonly factionName = input('');
  readonly portalColor = input<string>('#6e28d0');

  /** The drawer's work is done; the shell closes it. */
  readonly closeDrawer = output<void>();

  /**
   * The campaign's cast cards this viewer may choose from: the GM's every cast card the campaign
   * holds, and a player's the cards the DM has revealed to them. A player's copy of the campaign
   * holds no other card, and a card the DM locks again is dropped here the moment the lock's own
   * event writes the flag down (see the shell), so the drawer never offers a card the viewer cannot
   * see.
   */
  private readonly campaignCasts = computed<CampaignCastInstance[]>(() => {
    const casts = this.shellSvc.campaign()?.casts ?? [];
    return this.isDm() ? casts : casts.filter(cast => cast.isVisibleToPlayers);
  });

  /** The cast instance ids the faction already holds, read off the campaign's faction. */
  private readonly memberIds = computed<ReadonlySet<string>>(() => {
    const faction = this.shellSvc.campaign()?.factions
      .find(f => f.factionInstanceId === this.factionInstanceId());
    return new Set(faction?.castInstanceIds ?? []);
  });

  // ── Filter + picks ────────────────────────────────────────────────────────
  readonly search = signal('');
  /** The campaign's keywords that are on, and whether a card has to carry all of them. */
  readonly activeKeywords = signal<string[]>([]);
  readonly matchAll = signal(false);
  /** By id, so a pick stays picked while the list narrows under it. */
  readonly selectedIds = signal<ReadonlySet<string>>(new Set());
  readonly busy = signal(false);
  readonly error = signal<string | null>(null);

  readonly selectedCount = computed(() => this.selectedIds().size);
  readonly canAdd = computed(() => this.selectedCount() > 0 && !this.busy());

  /** True when the campaign has no cast cards at all — there is nothing that could go in. */
  readonly campaignEmpty = computed(() => this.campaignCasts().length === 0);

  /**
   * The campaign's cards this faction does not hold, narrowed by the search box: the pool the
   * keyword chips are read off, and the set the keyword filters narrow.
   */
  private readonly offeredCasts = computed<CampaignCastInstance[]>(() => {
    const held = this.memberIds();
    const term = this.search().trim().toLowerCase();

    return this.campaignCasts()
      .filter(cast => !held.has(cast.instanceId))
      .filter(cast => !term || this.matches(cast, term));
  });

  /** The cards on offer, name-first, carrying the keywords that are on. */
  readonly candidates = computed<CampaignCastInstance[]>(() =>
    this.withKeywords(this.offeredCasts()).sort((a, b) => a.name.localeCompare(b.name))
  );

  /**
   * The keywords the cards on offer carry, as filter buttons, each with how many of them it
   * would leave. Read off the campaign's casts rather than off the cast library's index — a
   * membership list is the campaign's own cards — and kept in keyword order so the buttons hold
   * still under the pointer while picks are made.
   */
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

  // ── Keyword filters ──────────────────────────────────────────────────────
  /** Whether a chip is on. */
  isKeywordOn(keyword: string): boolean {
    return this.activeKeywords().includes(keyword);
  }

  /** Picking a chip narrows the list to that keyword; picking it again takes it back off. */
  toggleKeyword(keyword: string) {
    this.activeKeywords.update(current =>
      current.includes(keyword) ? current.filter(k => k !== keyword) : [...current, keyword]);
  }

  /** With more than one chip on: whether a card has to carry all of them or any one of them. */
  toggleMatchAll() {
    this.matchAll.update(all => !all);
  }

  /**
   * Adds every picked card to the faction in one go. A pick that fails is reported but does
   * not hold the others back, and the drawer only closes when at least one card landed.
   *
   * The write answers `204 No Content`, so its success is the *completion* of the call, not
   * something in its body: each call is mapped to a plain true/false, since a body-less
   * response deserializes to `null` and a landed card must not be read as a failed one.
   *
   * Whose membership it is follows whose drawer it is: the GM writes their own, and a player
   * writes the party's — the same route under `party`, so the two memberships of the same
   * faction stand side by side instead of over one another (see the API).
   */
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

  /**
   * The cards carrying the keywords that are on — every one of them, or any one of them, as the
   * "any"/"all" button beside the search box says. Keywords are matched without regard to case,
   * as the encounter picker matches them. With the chips off the cards are passed through.
   */
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
