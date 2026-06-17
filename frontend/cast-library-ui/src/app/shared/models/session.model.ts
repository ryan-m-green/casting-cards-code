export interface Session {
  id: string;
  campaignId: string;
  sessionNumber: number;
  startTime: string;
  startInGameDay: number;
  isActive: boolean;
}

export interface StartSessionRequest {
  campaignId: string;
}

export interface UpdateSessionRequest {
}
