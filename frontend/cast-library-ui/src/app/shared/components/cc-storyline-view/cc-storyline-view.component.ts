import { Component, input } from '@angular/core';

/** Item shape shown read-only in the drawer. */
export interface StorylineViewItem {
  title: string;
  body: string;
  sceneType: string;
  imageUrl?: string;
}

@Component({
  selector: 'app-cc-storyline-view',
  standalone: true,
  imports: [],
  templateUrl: './cc-storyline-view.component.html',
  styleUrl: './cc-storyline-view.component.scss',
})
export class CcStorylineViewComponent {
  item = input.required<StorylineViewItem>();
  portalColor = input<string>('#6e28d0');
}
