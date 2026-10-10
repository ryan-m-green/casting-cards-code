import { Component, OnInit, OnDestroy, input, output, signal, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { CampaignShellService } from '../../../core/campaign-shell.service';
import { CampaignFactionInstance, FactionColors, FactionRelationship } from '../../models/faction.model';
import { CcDetailPanelActionsComponent } from '../v2/Shared/cc-detail-panel-actions/cc-detail-panel-actions.component';
import { CcTextboxComponent } from '../v2/Shared/cc-textbox/cc-textbox.component';
import { CcFactionColorsComponent } from '../v2/Shared/cc-faction-colors/cc-faction-colors.component';
import { CcPoliticalInfluenceComponent } from '../v2/Shared/cc-political-influence/cc-political-influence.component';
import { CcSecretsManagerComponent } from '../v2/Shared/cc-secrets-manager/cc-secrets-manager.component';
import { ToggleSwitchComponent } from '../toggle-switch/toggle-switch.component';
import { CcFactionAssociationsComponent, SaveRelationshipEvent } from '../cc-faction-associations/cc-faction-associations.component';

type DetailTab = 'details' | 'secrets';

/**
 * Right-drawer content for viewing / editing a campaign faction instance.
 *
 * Uses the shared v2 field components: cc-faction-colors (colors + perception),
 * cc-political-influence (influence), app-toggle-switch (in hiding) and
 * cc-textbox for every text field. The DM's own write goes through the v2 faction endpoint:
 *
 *   PATCH api/campaign/{campaignId}/factions/{factionInstanceId}
 *
 * The panel is drawn for the role that opened it:
 *
 *   - the DM / Admin gets the faction as the campaign holds it, with their editor on it;
 *   - a player gets the faction to read, with the sliders and the in-hiding toggle held read-only.
 *
 * The DM's writes go through the faction's own endpoint (see `saveDetails`). Only the DM's own
 * fields — the name, the type, the description, the colours, the notes, and their in-hiding — wait
 * for the editor's Save.
 */
@Component({
  selector: 'app-faction-detail-content',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    CcDetailPanelActionsComponent,
    CcTextboxComponent,
    CcFactionColorsComponent,
    CcPoliticalInfluenceComponent,
    CcSecretsManagerComponent,
    ToggleSwitchComponent,
    CcFactionAssociationsComponent
  ],
  templateUrl: './faction-detail-content.component.html',
  styleUrl: './faction-detail-content.component.scss'
})
export class FactionDetailContentComponent implements OnInit, OnDestroy {
  private http = inject(HttpClient);
  private shellSvc = inject(CampaignShellService);

  faction = input.required<CampaignFactionInstance>();
  campaignId = input<string>('');
  /**
   * Whether the panel is the GM's own. The drawer is drawn for the role that opened it: a GM is
   * handed the editor, and a player — who reaches a faction's ✦ Details once the DM has unlocked
   * it — is handed the same panel to read, with no Edit on it, no GM's notes in it, and the
   * Secrets tab showing only what has been revealed to them. Calls that say nothing (the library
   * card's own Details, see the v1 faction card) get the GM's panel, as they always did.
   */
  isDm = input<boolean>(true);
  closeDrawer = output<void>();

  // Local reactive state so the panel reflects a save without closing
  factionState = signal<CampaignFactionInstance | null>(null);
  currentFaction = computed(() => this.factionState() ?? this.faction());

  /** Instance id of the faction card (also used by the secrets manager). */
  get factionInstanceId(): string {
    return this.currentFaction().factionInstanceId ?? '';
  }

  // Detail tabs
  activeTab = signal<DetailTab>('details');

  setTab(tab: DetailTab): void {
    this.activeTab.set(tab);
  }

  // Edit mode state
  editing = signal<boolean>(false);

  // Text fields (cc-textbox)
  editName        = signal('');
  editType        = signal('');
  editDescription = signal('');
  editDmNotes     = signal('');

  // Structured fields (cc-faction-colors / cc-political-influence / toggle)
  goodColor  = signal('#ff99bb');
  evilColor  = signal('#004d1a');
  perception = signal(0);
  influence  = signal(0);
  hidden     = signal(false);

  // ── Faction relationships (the viewer's web of alliances and enmities) ─────
  /**
   * The campaign's factions as this viewer's own row reads them: the GM's whole realm, or the
   * factions the GM has unlocked for the players. They are already on the page — the v2 shell
   * holds the campaign — so the relationship picker is filled from here rather than by a fresh
   * request: a drawer opened on a phone asks the server nothing it has not already been given.
   */
  otherFactions = computed<CampaignFactionInstance[]>(
    () => this.shellSvc.campaign()?.factions ?? []);

  /** The ties this faction already holds (its own side, A → B). */
  factionRelationships = computed<FactionRelationship[]>(
    () => this.currentFaction().factionRelationships ?? []);

  /** The write waiting on the viewer to stop moving a slider. */
  private saveTimer: ReturnType<typeof setTimeout> | null = null;

  /** How long the panel waits after a change before writing it (ms). */
  private static readonly SAVE_DELAY_MS = 600;

  /**
   * The faction's standing as this panel's own perception reads it.
   */
  readonly alignment = computed(() => {
    const p = this.perception();
    if (p > 0) return 'Friendly Faction';
    if (p < 0) return 'Hostile Faction';
    return 'Unknown Alignment';
  });

  ngOnInit(): void {
    this.syncFromFaction();
  }

  hasField(...values: (string | undefined | null)[]): boolean {
    return values.some(v => v && v.trim().length > 0);
  }

  /** The viewer set the faction's perception. */
  onPerception(value: number): void {
    this.perception.set(value);
    this.scheduleWrite();
  }

  /** The viewer set the faction's political influence. */
  onInfluence(value: number): void {
    this.influence.set(value);
    this.scheduleWrite();
  }

  /** The viewer set whether the faction is counted as lying low. */
  onHidden(value: boolean): void {
    this.hidden.set(value);
    this.scheduleWrite();
  }

  /**
   * Writes what has just been set, a beat later — so a slider dragged across its face is written
   * once, on the value it is left at.
   *
   * Only the DM writes: a player reads the faction, and their sliders and toggle are held read-only.
   * The DM sets the campaign's own record (`saveDetails` — whose editor's fields are filled in from
   * the faction first, since the editor is not open to hold them). A change made with the editor
   * open is left to its own Save, as everything else in it is.
   */
  private scheduleWrite(): void {
    if (!this.isDm() || this.editing()) return;

    if (this.saveTimer) clearTimeout(this.saveTimer);
    this.saveTimer = setTimeout(
      () => this.writeChange(), FactionDetailContentComponent.SAVE_DELAY_MS);
  }

  /** Writes the change the waiting timer was holding (see `scheduleWrite`). */
  private writeChange(): void {
    this.fillEditFields();
    this.saveDetails();
  }

  /** Fills the editor's own text fields from the faction, without opening the editor. */
  private fillEditFields(): void {
    const f = this.currentFaction();
    this.editName.set(f.name ?? '');
    this.editType.set(f.type ?? '');
    this.editDescription.set(f.description ?? '');
    this.editDmNotes.set(f.dmNotes ?? '');
  }

  private normalizedGoodColor(f: CampaignFactionInstance): string {
    const c = f.colors?.goodColor;
    return (c && c !== '#000000') ? c : '#ff99bb';
  }

  private normalizedEvilColor(f: CampaignFactionInstance): string {
    const c = f.colors?.evilColor;
    return (c && c !== '#000000') ? c : '#004d1a';
  }

  private syncFromFaction(): void {
    const f = this.currentFaction();
    this.goodColor.set(this.normalizedGoodColor(f));
    this.evilColor.set(this.normalizedEvilColor(f));
    this.perception.set(f.perception ?? 0);
    this.influence.set(f.influence ?? 0);
    this.hidden.set(f.hidden ?? false);
  }

  startEditing() {
    if (!this.isDm()) return;
    this.fillEditFields();
    this.syncFromFaction();
    this.editing.set(true);
  }

  cancelEditing() {
    this.syncFromFaction();
    this.editing.set(false);
  }

  saveDetails(syncLibrary = false) {
    // The write is the GM's own (a player is handed the panel to read): nothing is sent on their
    // behalf, and the panel is left as it stands.
    if (!this.isDm()) return;
    const campaignId = this.campaignId();
    const factionInstanceId = this.factionInstanceId;
    if (!campaignId || !factionInstanceId) {
      this.editing.set(false);
      return;
    }

    const colors: FactionColors = {
      goodColor: this.goodColor(),
      evilColor: this.evilColor(),
    };

    const body = {
      name:        this.editName(),
      type:        this.editType(),
      description: this.editDescription(),
      dmNotes:     this.editDmNotes(),
      influence:   Number(this.influence()) || 0,
      perception:  Number(this.perception()) || 0,
      hidden:      this.hidden(),
      colors,
      syncLibrary,
    };

    this.http.patch(
      `${environment.apiUrl}/api/campaign/${campaignId}/factions/${factionInstanceId}`,
      body
    ).subscribe(() => {
      this.factionState.set({
        ...this.currentFaction(),
        name:        body.name,
        type:        body.type,
        description: body.description,
        dmNotes:     body.dmNotes,
        influence:   body.influence,
        perception:  body.perception,
        hidden:      body.hidden,
        colors:      body.colors,
      });
      this.editing.set(false);
    });
  }

  saveToLibrary() {
    this.saveDetails(true);
  }

  // ── Faction relationships ──────────────────────────────────────────────────

  /** Weaves a new tie from this faction to another (see the relationship wizard). */
  saveRelationship(event: SaveRelationshipEvent): void {
    const campaignId = this.campaignId();
    const factionInstanceId = this.factionInstanceId;
    if (!campaignId || !factionInstanceId) return;

    const body = {
      factionInstanceIdA: factionInstanceId,
      factionInstanceIdB: event.factionInstanceIdB,
      relationshipType:   event.relationshipType,
      strength:           event.strength,
    };

    this.http.post<FactionRelationship>(
      `${environment.apiUrl}/api/campaign/${campaignId}/factions/${factionInstanceId}/relationships`,
      body
    ).subscribe(rel => {
      const f = this.currentFaction();
      this.factionState.set({
        ...f,
        factionRelationships: [...(f.factionRelationships ?? []), rel],
      });
    });
  }

  /** Takes back a tie this faction held. */
  removeRelationship(rel: FactionRelationship): void {
    const campaignId = this.campaignId();
    const factionInstanceId = this.factionInstanceId;
    if (!campaignId || !factionInstanceId) return;

    this.http.delete(
      `${environment.apiUrl}/api/campaign/${campaignId}/factions/${factionInstanceId}/relationships/${rel.id}`
    ).subscribe(() => {
      const f = this.currentFaction();
      this.factionState.set({
        ...f,
        factionRelationships: (f.factionRelationships ?? []).filter(r => r.id !== rel.id),
      });
    });
  }

  ngOnDestroy(): void {
    // A write still on the clock goes with the panel, as the player's own page's debounce does.
    if (this.saveTimer) clearTimeout(this.saveTimer);
  }

  closePanel() {
    this.editing.set(false);
    this.closeDrawer.emit();
  }
}
