export interface SoundtrackDomain {
  id: string;
  gmUserId: string;
  title: string;
  fileName: string;
  fileUrl: string;
  volume: number;
  isLoop: boolean;
  loopDelaySeconds?: number;
  kind: 'music' | 'sound_effect';
  createdAt: string;
}

export function soundtrackDisplayName(title: string): string {
  const lastDotIndex = title.lastIndexOf('.');
  return lastDotIndex > 0 ? title.substring(0, lastDotIndex) : title;
}

export type AmbiancePauseMode = 'none' | 'manual' | 'random';

export interface AmbianceItemDomain {
  id: string;
  ambianceId: string;
  soundtrackId: string;
  sortOrder: number;
  volume: number;
  pauseMode: AmbiancePauseMode;
  pauseDelaySeconds?: number;
  pauseMinSeconds?: number;
  pauseMaxSeconds?: number;
}

export interface AmbianceDomain {
  id: string;
  gmUserId: string;
  title: string;
  createdAt: string;
  randomizeMusic: boolean;
  items: AmbianceItemDomain[];
}

/**
 * One editable entry of a playlist being built — a soundtrack and how it is played. This is the shape
 * the playlist builder edits; it is sent up as an `AmbianceItemDomain` when the playlist is saved.
 */
export interface PlaylistTrackItem {
  soundtrackId: string;
  volume: number;
  pauseMode: AmbiancePauseMode;
  pauseDelaySeconds: number | null;
  pauseMinSeconds: number | null;
  pauseMaxSeconds: number | null;
}
