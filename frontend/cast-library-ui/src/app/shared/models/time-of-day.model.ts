export interface TimeOfDay {
  id: string;
  campaignId: string;
  dayLengthHours: number;
  cursorPositionPercent: number;
  slices: TimeOfDaySlice[];
}

export interface TimeOfDaySlice {
  id: string;
  label: string;
  color: string;
  durationHours: number;
  startPercent: number;
  endPercent: number;
  dmNotes: string;
  playerNotes: string;
}

export interface TimeCursorMovedEvent {
  campaignId: string;
  positionPercent: number;
}

export interface PlayerNotesUpdatedEvent {
  campaignId: string;
  sliceId: string;
  playerNotes: string;
}

export interface DmNotesUpdatedEvent {
  campaignId: string;
  sliceId: string;
  dmNotes: string;
}
