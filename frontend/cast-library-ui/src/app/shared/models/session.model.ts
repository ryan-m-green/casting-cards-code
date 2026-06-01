export interface Session {
  id: string;
  campaignId: string;
  sessionNumber: number;
  title: string;
  alternateTitle: string;
  startTime: string;
  startInGameDay: number;
  isActive: boolean;
}

export interface StartSessionRequest {
  campaignId: string;
}
