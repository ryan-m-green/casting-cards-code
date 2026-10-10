import { CardLink } from '../shared/models/card-link.model';
import { ChronicleParticipant } from '../shared/models/chronicle.model';

export interface StorylineChronicleItem {
  id: string;
  sceneType: string;
  linkedEntities: readonly CardLink[];
}

export interface StorylineChronicleRequest {
  contentType: string;
  sourceId: string;
  isGmOnly: boolean;
  participants: ChronicleParticipant[];
}

export const STORYLINE_SCENE_CONTENT_TYPE = 'scene';
export const STORYLINE_HANDOUT_CONTENT_TYPE = 'handout';
export const STORYLINE_SCENE_LABEL = 'Scene';
export const STORYLINE_HANDOUT_LABEL = 'Handout';
export const CAMPAIGN_HANDOUT_SCENE_TYPE = 'campaign-handout';

export function storylineChronicleContentType(sceneType: string): string {
  return sceneType === CAMPAIGN_HANDOUT_SCENE_TYPE
    ? STORYLINE_HANDOUT_CONTENT_TYPE
    : STORYLINE_SCENE_CONTENT_TYPE;
}

export function storylineChronicleLabel(sceneType: string): string {
  return sceneType === CAMPAIGN_HANDOUT_SCENE_TYPE
    ? STORYLINE_HANDOUT_LABEL
    : STORYLINE_SCENE_LABEL;
}

export function storylineChronicleParticipants(item: StorylineChronicleItem): ChronicleParticipant[] {
  const links = item.linkedEntities ?? [];

  return [
    ...links.map(link => ({
      entityType: link.entityType,
      entityId: link.entityId,
      entityName: link.entityName,
    })),
    {
      entityType: storylineChronicleContentType(item.sceneType),
      entityId: item.id,
      entityName: storylineChronicleLabel(item.sceneType),
    },
  ];
}

export function buildStorylineChronicleRequest(
  item: StorylineChronicleItem,
  isGmOnly: boolean
): StorylineChronicleRequest {
  return {
    contentType: storylineChronicleContentType(item.sceneType),
    sourceId: item.id,
    isGmOnly,
    participants: storylineChronicleParticipants(item),
  };
}
