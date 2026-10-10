import { ChronicleParticipant } from '../shared/models/chronicle.model';
import { QuicknoteLinkedEntity, QuicknoteQueueItem } from '../shared/models/quicknote-queue.model';

/** What the chronicle takes when a queued quicknote is sent on (see AddToChronicle). */
export interface QuicknoteChronicleRequest {
  contentType: string;
  sourceId: string;
  title: string;
  body: string;
  isGmOnly: boolean;
  participants: ChronicleParticipant[];
}

/**
 * The content type a quicknote is sent to the chronicle as.
 *
 * It is the enum's own name, not the row's storage spelling: the request binds to
 * `ChronicleContentType` through a plain `JsonStringEnumConverter` (see Program.cs), which matches
 * the name — `'PlayerNote'` — where `'player-note'` is what the column and the entry's own linked
 * entities are written with (see PLAYER_NOTE_ENTITY_TYPE and ChronicleMapper.ToStorageValue).
 */
export const QUICKNOTE_CHRONICLE_CONTENT_TYPE = 'PlayerNote';

/** What that content type is called where a name is needed. */
export const QUICKNOTE_PLAYER_NOTE_LABEL = 'Player Note';

/**
 * The type a note's own mark carries in the entry's linked entities: the storage spelling, which is
 * also the one the API checks for when it decides whether a non-DM may go on editing an entry.
 */
export const PLAYER_NOTE_ENTITY_TYPE = 'player-note';

/** As much title as a chronicle entry takes (see AddChronicleCommandHandler's own check). */
export const CHRONICLE_TITLE_MAX_LENGTH = 200;

/**
 * The title a quicknote reaches the chronicle under.
 *
 * A chronicle entry's title is required — the player-note strategy refuses a blank one — while a
 * queue line is a single field of prose, so the note's first line stands as its title, cut to what
 * the column takes. A note of nothing but blank lines still has to arrive with something.
 */
export function chronicleTitleFor(content: string): string {
  const firstLine = (content ?? '')
    .split('\n')
    .map(line => line.trim())
    .find(line => line.length > 0) ?? '';

  const title = firstLine.slice(0, CHRONICLE_TITLE_MAX_LENGTH).trim();
  return title || QUICKNOTE_PLAYER_NOTE_LABEL;
}

/**
 * The mark that says a chronicle entry is a note its author wrote.
 *
 * It is always sent, even when the note is linked to cards. The API only marks an entry as a
 * player's own when it is sent with no participants at all (see AddChronicleCommandHandler), and
 * the chronicle drawer lets a non-DM edit an entry only when that mark is on it — so a linked note
 * sent without it would be a note its own author could no longer open for editing.
 */
export function playerNoteMarker(itemId: string): ChronicleParticipant {
  return {
    entityType: PLAYER_NOTE_ENTITY_TYPE,
    entityId: itemId,
    entityName: QUICKNOTE_PLAYER_NOTE_LABEL,
  };
}

/** The cards a note is linked to, as the chronicle's own participants. */
export function participantsFor(links: readonly QuicknoteLinkedEntity[]): ChronicleParticipant[] {
  return (links ?? []).map(link => ({
    entityType: link.entityType,
    entityId: link.entityId,
    entityName: link.entityName,
  }));
}

/**
 * A queued quicknote as the chronicle takes it: its words as the body, its links as the entry's
 * participants, and GM-only only when the DM left the note unshared. A player's note is never
 * GM-only — the controller refuses that from anyone who does not own the campaign — so the flag is
 * the DM's alone to set.
 */
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
