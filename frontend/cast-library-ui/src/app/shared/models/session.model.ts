export interface Session {
  id: string;
  campaignId: string;
  sessionNumber: number;
  startTime: string;
  startInGameDay: number;
  isActive: boolean;
}

export interface ArchivedSession {
  id: string;
  campaignId: string;
  sessionNumber: number;
  title: string;
  alternateTitle: string;
  startTime: string;
  endTime: string;
  inGameDays: number[];
  archivedAt: string;
}

export interface StartSessionRequest {
  campaignId: string;
}

export interface UpdateSessionRequest {
}
