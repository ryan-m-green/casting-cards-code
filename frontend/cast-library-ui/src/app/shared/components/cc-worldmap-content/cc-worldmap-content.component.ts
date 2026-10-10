import { Component, Input } from '@angular/core';

/** Right-drawer content that shows the campaign's world map image. */
@Component({
  selector: 'app-cc-worldmap-content',
  standalone: true,
  imports: [],
  templateUrl: './cc-worldmap-content.component.html',
  styleUrl: './cc-worldmap-content.component.scss',
})
export class CcWorldmapContentComponent {
  /** World map image URL (null when the campaign has none). */
  @Input() worldMapImageUrl: string | null = null;

  /** Portal/campaign accent color. */
  @Input() portalColor = '#6e28d0';
}
