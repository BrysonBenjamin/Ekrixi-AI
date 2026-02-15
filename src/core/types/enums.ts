// ============================================================
// Ekrixi Schema v2 — Enums
// ============================================================

export enum NexusType {
  SIMPLE_NOTE = 'SIMPLE_NOTE',
  AUTHOR_NOTE = 'AUTHOR_NOTE',
  STORY_NOTE = 'STORY_NOTE',
  SIMPLE_LINK = 'SIMPLE_LINK',
  HIERARCHICAL_LINK = 'HIERARCHICAL_LINK',
  AGGREGATED_SIMPLE_LINK = 'AGGREGATED_SIMPLE_LINK',
  AGGREGATED_HIERARCHICAL_LINK = 'AGGREGATED_HIERARCHICAL_LINK',
  MANIFESTO_BLOCK = 'MANIFESTO_BLOCK',
}

export enum NexusCategory {
  CHARACTER = 'CHARACTER',
  LOCATION = 'LOCATION',
  ITEM = 'ITEM',
  EVENT = 'EVENT',
  CONCEPT = 'CONCEPT',
  META = 'META',
  ORGANIZATION = 'ORGANIZATION',
  STORY = 'STORY',
  WORLD = 'WORLD',
  STATE = 'STATE', // Temporal Snapshot
}

export enum StoryType {
  BOOK = 'BOOK',
  MANUSCRIPT = 'MANUSCRIPT',
  CHAPTER = 'CHAPTER',
  SCENE = 'SCENE',
  BEAT = 'BEAT',
}

export enum NarrativeStatus {
  VOID = 'VOID',
  OUTLINE = 'OUTLINE',
  DRAFT = 'DRAFT',
  POLISHED = 'POLISHED',
}

export enum HierarchyType {
  PARENT_OF = 'PARENT_OF',
  PART_OF = 'PART_OF',
}

export type ConflictStatus = 'APPROVED' | 'IMPLIED' | 'REDUNDANT';

export enum ContainmentType {
  CALCULATED = 'CALCULATED',
  FOLDER = 'FOLDER',
  PLOT_ARC = 'PLOT_ARC',
  MANUSCRIPT = 'MANUSCRIPT',
  BOOK = 'BOOK',
  CHAPTER = 'CHAPTER',
  SCENE = 'SCENE',
}

export enum DefaultLayout {
  GRID = 'GRID',
  LIST = 'LIST',
  BOARD = 'BOARD',
  TIMELINE = 'TIMELINE',
  TREE = 'TREE',
}
