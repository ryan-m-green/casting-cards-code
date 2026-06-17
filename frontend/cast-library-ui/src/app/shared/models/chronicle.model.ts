export interface LinkedEntityTrigger {
  entityType: string;
  entityId: string;
  entityName: string;
}

export interface ChronicleItem {
  id: string;
  title: string;
  body: string;
  linkedEntities: LinkedEntityTrigger[];
  imageUrl?: string;
  todSliceName?: string;
  isGmOnly: boolean;
  archivedAt: string;
  sessionId: string;
  sortOrder: number;
}

export interface ChronicleSession {
  sessionId: string;
  sessionNumber: number;
  alternateTitle: string;
  startTime: string;
  inGameDays: number[];
  chronicleCount: number;
  chronicles: ChronicleItem[];
}

export interface ChroniclesResponse {
  sessions: ChronicleSession[];
  totalSessions: number;
  totalChronicles: number;
  currentPage: number;
  totalPages: number;
}
