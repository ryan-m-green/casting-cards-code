import { Component, OnInit, input, output, signal, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { CampaignFactionInstance, FactionColors } from '../../models/faction.model';
import { CcDetailPanelActionsComponent } from '../v2/cc-detail-panel-actions/cc-detail-panel-actions.component';
import { CcTextboxComponent } from '../v2/cc-textbox/cc-textbox.component';
import { CcFactionColorsComponent } from '../v2/cc-faction-colors/cc-faction-colors.component';
import { CcPoliticalInfluenceComponent } from '../v2/cc-political-influence/cc-political-influence.component';
import { CcSecretsManagerComponent } from '../v2/cc-secrets-manager/cc-secrets-manager.component';
import { ToggleSwitchComponent } from '../toggle-switch/toggle-switch.component';

type DetailTab = 'details' | 'secrets';

/**
 * Right-drawer content for viewing / editing a campaign faction instance.
 *
 * Uses the shared v2 field components: cc-faction-colors (colors + perception),
 * cc-political-influence (influence), app-toggle-switch (in hiding) and
 * cc-textbox for every text field. Persists through the v2 faction endpoint:
 *
 *   PATCH api/campaign/{campaignId}/factions/{factionInstanceId}
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
    ToggleSwitchComponent
  ],
  templateUrl: './faction-detail-content.component.html',
  styleUrl: './faction-detail-content.component.scss'
})
export class FactionDetailContentComponent implements OnInit {
  private http = inject(HttpClient);

  faction = input.required<CampaignFactionInstance>();
  campaignId = input<string>('');
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

  ngOnInit(): void {
    this.syncFromFaction();
  }

  hasField(...values: (string | undefined | null)[]): boolean {
    return values.some(v => v && v.trim().length > 0);
  }

  alignmentLabel(f: CampaignFactionInstance): string {
    const p = f.perception ?? 0;
    if (p > 0) return 'Friendly Faction';
    if (p < 0) return 'Hostile Faction';
    return 'Unknown Alignment';
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
    const f = this.currentFaction();
    this.editName.set(f.name ?? '');
    this.editType.set(f.type ?? '');
    this.editDescription.set(f.description ?? '');
    this.editDmNotes.set(f.dmNotes ?? '');
    this.syncFromFaction();
    this.editing.set(true);
  }

  cancelEditing() {
    this.syncFromFaction();
    this.editing.set(false);
  }

  saveDetails(syncLibrary = false) {
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

  closePanel() {
    this.editing.set(false);
    this.closeDrawer.emit();
  }
}
