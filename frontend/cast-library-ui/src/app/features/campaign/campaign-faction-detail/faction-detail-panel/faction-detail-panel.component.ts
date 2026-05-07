import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CampaignFactionInstance } from '../../../../shared/models/faction.model';
import { FACTION_TYPE_OPTIONS, perceptionLabel } from '../../../faction/faction-form/faction-form.component';
import { IconPickerComponent } from '../../../../shared/components/icon-picker/icon-picker.component';

@Component({
  selector: 'app-faction-detail-panel',
  standalone: true,
  imports: [CommonModule, FormsModule, IconPickerComponent],
  templateUrl: './faction-detail-panel.component.html',
  styleUrl: './faction-detail-panel.component.scss',
})
export class FactionDetailPanelComponent {
  faction         = input.required<CampaignFactionInstance>();
  editing         = input(false);
  isDm            = input(false);

  editName        = input('');
  editType        = input('');
  editDescription = input('');
  editHidden      = input(false);
  editDmNotes     = input('');
  editInfluence   = input(0);
  editPerception  = input(0);
  editSymbolPath  = input<string | null>(null);

  editNameChange        = output<string>();
  editTypeChange        = output<string>();
  editDescriptionChange = output<string>();
  editHiddenChange      = output<boolean>();
  editDmNotesChange     = output<string>();
  editInfluenceChange   = output<number>();
  editPerceptionChange  = output<number>();
  editSymbolPathChange  = output<string | null>();

  typeOptions     = FACTION_TYPE_OPTIONS;
  perceptionLabel = perceptionLabel;
}
