import { CardLink } from './card-link.model';

/** One campaign card a queued quicknote is linked to, worn as a hashtag on the note. */
export type QuicknoteLinkedEntity = CardLink;

export interface QuicknoteQueueItem {
  id: string;
  campaignId: string;
  content: string;

  /** The cards the note is linked to, worn as hashtags until the note is sent to the chronicle. */
  linkedEntities: QuicknoteLinkedEntity[];

  /** False means the note will reach the chronicle as a GM-only entry. */
  visibleToPlayers: boolean;

  createdAt: string;
  updatedAt: string;
}

