export interface Cast {
  id: string;
  dmUserId: string;
  name: string;
  pronouns: string;
  race: string;
  role: string;
  age: string;
  alignment: string;
  posture: string;
  speed: string;
  voicePlacement: string[];
  voiceNotes: string;
  description: string;
  publicDescription: string;
  imageUrl?: string;
  createdAt: string;
}

export interface CreateCastRequest {
  name: string;
  pronouns: string;
  race: string;
  role: string;
  age: string;
  alignment: string;
  posture: string;
  speed: string;
  voicePlacement: string[];
  voiceNotes: string;
  description: string;
  publicDescription: string;
}

export interface CampaignCastInstance extends Cast {
  instanceId: string;
  campaignId: string;
  sourceCastId: string;
  locationInstanceId: string | null;
  sublocationInstanceId: string | null;
  isVisibleToPlayers: boolean;
  keywords: string[];
  dmNotes: string;
}
