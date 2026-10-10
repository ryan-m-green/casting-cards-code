import { ChronicleParticipant } from '../shared/models/chronicle.model';
import { QuicknoteLinkedEntity, QuicknoteQueueItem } from '../shared/models/quicknote-queue.model';

export interface QuicknoteChronicleRequest {
  contentType: string;
  sourceId: string;
  title: string;
  body: string;
  isGmOnly: boolean;
  participants: ChronicleParticipant[];
}

export const QUICKNOTE_CHRONICLE_CONTENT_TYPE = 'PlayerNote';

export const QUICKNOTE_PLAYER_NOTE_LABEL = 'Player Note';

export const PLAYER_NOTE_ENTITY_TYPE = 'player-note';

export const CHRONICLE_TITLE_MAX_LENGTH = 200;

export function chronicleTitleFor(content: string): string {
  const firstLine = (content ?? '')
    .split('\n')
    .map(line => line.trim())
    .find(line => line.length > 0) ?? '';

  const title = firstLine.slice(0, CHRONICLE_TITLE_MAX_LENGTH).trim();
  return title || QUICKNOTE_PLAYER_NOTE_LABEL;
}

export function playerNoteMarker(itemId: string): ChronicleParticipant {
  return {
    entityType: PLAYER_NOTE_ENTITY_TYPE,
    entityId: itemId,
    entityName: QUICKNOTE_PLAYER_NOTE_LABEL,
  };
}

export function participantsFor(links: readonly QuicknoteLinkedEntity[]): ChronicleParticipant[] {
  return (links ?? []).map(link => ({
    entityType: link.entityType,
    entityId: link.entityId,
    entityName: link.entityName,
  }));
}

export function buildQuicknoteChronicleRequest(
  item: Pick<QuicknoteQueueItem, 'id' | 'content' | 'linkedEntities' | 'visibleToPlayers'>,
  isDm: boolean
): QuicknoteChronicleRequest {
  const body = item.content ?? '';

  return {
    contentType: QUICKNOTE_CHRONICLE_CONTENT_TYPE,
    sourceId: item.id,
    title: chronicleTitleFor(body),
    body,
    isGmOnly: isDm && !item.visibleToPlayers,
    participants: [...participantsFor(item.linkedEntities), playerNoteMarker(item.id)],
  };
}
