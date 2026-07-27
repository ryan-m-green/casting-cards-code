export interface SoundtrackDomain {
  id: string;
  campaignId: string;
  title: string;
  fileName: string;
  fileUrl: string;
  volume: number;
  isLoop: boolean;
  loopDelaySeconds?: number;
  createdAt: string;
}
