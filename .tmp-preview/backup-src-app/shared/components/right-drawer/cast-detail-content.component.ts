import { Component, OnInit, computed, input, output, inject, signal, viewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { CampaignCastInstance } from '../../models/cast.model';
import { CampaignSecret } from '../../models/secret.model';
import { environment } from '../../../../environments/environment';
import { CcDetailPanelActionsComponent } from '../v2/Shared/cc-detail-panel-actions/cc-detail-panel-actions.component';
import { CcSecretsManagerComponent } from '../v2/Shared/cc-secrets-manager/cc-secrets-manager.component';
import { CcPortraitInputComponent } from '../v2/Shared/cc-portrait-input/cc-portrait-input.component';
import { CcCastNewFormComponent } from '../v2/CardNavigation/cc-cast-new-form/cc-cast-new-form.component';
import { CampaignGmService } from '../../../core/campaign-gm.service';

type DetailTab = 'details' | 'secrets';

/**
 * The cast card's detail panel.
 *
 * Reading it draws the card as it stands. Editing it — the panel's own Edit button — hands the
 * card to `cc-cast-new-form`, the very form the realm row's ＋ opens to add a cast to a
 * sublocation, so the fields a GM edits are the fields they filled in to make the card, in the
 * same order and the same dress. The panel keeps the Save and Cancel controls (the form is asked
 * not to draw its own Save row), and writes:
 *
 *  - **Save** patches the campaign card. Its hit points lost, temporary hit points, voice
 *    placement and GM notes are none of the form's business and travel back as they stand.
 *  - **Save to Library** does the same and pushes the card's details into the cast library it was
 *    made from (`syncLibrary`), so the library copy stops drifting from the campaign's.
 *
 * The card the panel shows is read back from the campaign once a write lands (`currentCast`), so
 * what stands on the panel after a save is what the campaign holds, not what the form held.
 *
 * Editing is the GM's own: the panel's Edit is drawn only for a GM/Admin (see `isDm`), and the
 * form and the write behind it are only reached from there.
 */
@Component({
  selector: 'app-cast-detail-content',
  standalone: true,
  imports: [CommonModule, FormsModule, CcDetailPanelActionsComponent, CcSecretsManagerComponent, CcPortraitInputComponent, CcCastNewFormComponent],
  templateUrl: './cast-detail-content.component.html',
  styleUrl: './cast-detail-content.component.scss'
})
export class CastDetailContentComponent implements OnInit {
  private http = inject(HttpClient);
  private campaignGm = inject(CampaignGmService);

  readonly isDm = this.campaignGm.isDm;

  cast = input.required<CampaignCastInstance>();
  secrets = input.required<CampaignSecret[]>();
  campaignId = input<string>('');
  castInstanceId = input.required<string>();
  closeDrawer = output<void>();
  cardType = input<'location' | 'sublocation' | 'cast' | 'faction'>('cast');

  /** The card as the campaign last handed it over — the panel's own copy of what it draws. */
  private castState = signal<CampaignCastInstance | null>(null);

  /** What the panel draws: the card it started on, or the campaign's answer after a save. */
  currentCast = computed(() => this.castState() ?? this.cast());

  /** The edit form, while the panel is in edit mode; the panel's Save drives it. */
  castForm = viewChild<CcCastNewFormComponent>('castForm');

  ngOnInit(): void {
    this.castState.set(this.cast());
  }

  // Detail tabs
  activeTab = signal<DetailTab>('details');

  setTab(tab: DetailTab): void {
    this.activeTab.set(tab);
  }

  // Edit mode state
  editing = signal<boolean>(false);

  // Portrait input state
  imageFile = signal<File | null>(null);

  // Endpoint mapping based on cardtype
  private getEndpointMapping(cardType: 'location' | 'sublocation' | 'cast' | 'faction') {
    const endpoints = {
      location: (campaignId: string, instanceId: string) => 
        `${environment.apiUrl}/api/campaign/${campaignId}/locationinstances/${instanceId}/image`,
      sublocation: (campaignId: string, instanceId: string) => 
        `${environment.apiUrl}/api/campaign/${campaignId}/sublocationinstances/${instanceId}/image`,
      cast: (campaignId: string, instanceId: string) => 
        `${environment.apiUrl}/api/campaign/${campaignId}/castinstances/${instanceId}/image`,
      faction: (campaignId: string, instanceId: string) => 
        `${environment.apiUrl}/api/campaign/${campaignId}/factioninstances/${instanceId}/image`
    };
    return endpoints[cardType];
  }

  hasField(...values: (string | undefined | null)[]): boolean {
    return values.some(v => v && v.trim().length > 0);
  }

  startEditing() {
    if (!this.isDm()) return;
    this.imageFile.set(null);
    this.editing.set(true);
  }

  /**
   * The panel's Save: the cast form writes the card back (see the class comment). The portrait
   * the GM picked rides along, uploaded on its own as it always has.
   */
  saveDetails(syncLibrary = false) {
    if (!this.isDm()) return;
    const file = this.imageFile();
    if (file) this._uploadImage(file);

    this.castForm()?.save(syncLibrary);
  }

  /** Save to Library: the same write, with the library card behind it brought into step. */
  saveToLibrary() {
    this.saveDetails(true);
  }

  /** The form finished writing: the panel takes the campaign's version of the card and closes. */
  onCastSaved(cast: CampaignCastInstance) {
    this.castState.set(cast);
    this.imageFile.set(null);
    this.editing.set(false);
  }

  cancelEditing() {
    this.editing.set(false);
  }

  closePanel() {
    this.editing.set(false);
    this.closeDrawer.emit();
  }

  /** Puts a newly picked portrait on the card. The form's own write does the rest. */
  private _uploadImage(file: File) {
    const cast = this.currentCast();
    const campaignId = this.campaignId();
    if (!campaignId || !cast.instanceId) return;

    const formData = new FormData();
    formData.append('file', file);
    formData.append('sourceCastId', cast.sourceCastId);

    this.http.post(this.getEndpointMapping(this.cardType())(campaignId, cast.instanceId), formData)
      .subscribe({
        next: () => this.imageFile.set(null),
        error: () => this.imageFile.set(null),
      });
  }
}
