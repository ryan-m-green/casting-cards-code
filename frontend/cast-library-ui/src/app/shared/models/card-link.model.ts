import { Observable } from 'rxjs';

export interface CardLink {
  entityType: 'location' | 'sublocation' | 'cast' | 'faction' | string;
  entityId: string;
  entityName: string;
}

export interface CardLinkSubject {
  campaignId: string;
  subjectId: string;
}

export type CardLinkWriter = (cards: CardLink[], subject: CardLinkSubject) => Observable<CardLink[]>;

export interface CardLinkTarget extends CardLinkSubject {
  linkedCards: CardLink[];
  save: CardLinkWriter;
}

export interface CardLinkResult {
  subjectId: string;
  linkedCards: CardLink[];
}
