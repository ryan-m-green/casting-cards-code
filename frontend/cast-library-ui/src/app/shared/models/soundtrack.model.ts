export interface SoundtrackDomain {
  id: string;
  campaignId: string;
  title: string;
  fileName: string;
  fileUrl: string;
  volume: number;
  isLoop: boolean;
  loopDelaySeconds?: number;
  kind: 'music' | 'sound_effect';
  createdAt: string;
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
  campaignId: string;
  title: string;
  createdAt: string;
  randomizeMusic: boolean;
  items: AmbianceItemDomain[];
}
