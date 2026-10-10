import { CardLink } from './card-link.model';

export type QuicknoteLinkedEntity = CardLink;

export interface QuicknoteQueueItem {
  id: string;
  campaignId: string;
  content: string;

  linkedEntities: QuicknoteLinkedEntity[];

  visibleToPlayers: boolean;

  createdAt: string;
  updatedAt: string;
}

