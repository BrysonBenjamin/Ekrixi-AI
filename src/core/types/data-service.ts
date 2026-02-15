import { NexusObject, NexusLink, NexusNote } from '../types';
import { ChatSession, MessageNode } from '../../features/universe-generator/types';

export interface Universe {
  id: string;
  name: string;
  description: string;
  ownerId: string;
  createdAt: string;
  lastActive: string;
  nodeCount: number;
  chatCount?: number;
}

export type UniverseUpdates = Partial<Omit<Universe, 'id' | 'createdAt'>>;

export interface IDataService {
  // NexusObject CRUD
  createOrUpdateNexusObject(universeId: string, nexusObject: NexusObject): Promise<void>;
  getNexusObject(universeId: string, nexusObjectId: string): Promise<NexusObject | null>;
  updateNexusObjectFields(
    universeId: string,
    nexusObjectId: string,
    updates: Partial<NexusObject>,
  ): Promise<void>;
  deleteNexusObject(universeId: string, nexusObjectId: string): Promise<void>;
  getAllNexusObjects(universeId: string): Promise<NexusObject[]>;

  // Batch Operations
  batchCreateOrUpdate(universeId: string, objects: NexusObject[]): Promise<void>;
  batchDelete(universeId: string, ids: string[]): Promise<void>;

  // Real-time Listeners
  listenToAllNexusObjects(
    universeId: string,
    callback: (nexusObjects: NexusObject[]) => void,
  ): () => void;

  // Transactions
  reifyLinkToNote(
    universeId: string,
    linkToReify: NexusLink,
    newNoteData: Omit<NexusNote, '_type' | 'id'>,
  ): Promise<NexusNote | null>;

  // Universe Management
  createUniverse(name: string, description: string, ownerId: string): Promise<string>;
  importUniverse(id: string, name: string, description: string, ownerId: string): Promise<void>;
  deleteUniverse(universeId: string): Promise<void>;
  updateUniverseMeta(universeId: string, updates: UniverseUpdates): Promise<void>;
  listenToUniverses(userId: string | null, callback: (universes: Universe[]) => void): () => void;

  // Chat Management
  createChatSession(universeId: string, session: ChatSession): Promise<void>;
  deleteChatSession(universeId: string, sessionId: string): Promise<void>;
  updateChatSessionTitle(universeId: string, sessionId: string, title: string): Promise<void>;
  updateChatSession(
    universeId: string,
    sessionId: string,
    updates: Partial<ChatSession>,
  ): Promise<void>;
  listenToChatSessions(universeId: string, callback: (sessions: ChatSession[]) => void): () => void;

  // Message Management
  listenToChatMessages(
    universeId: string,
    chatId: string,
    callback: (messages: MessageNode[]) => void,
  ): () => void;
  addMessageToChat(
    universeId: string,
    chatId: string,
    message: MessageNode,
    parentId: string | null,
    rootUpdate?: { newRootId: string; isSelectionChange: boolean },
  ): Promise<void>;
  updateMessage(
    universeId: string,
    chatId: string,
    messageId: string,
    updates: Partial<MessageNode>,
  ): Promise<void>;

  // Manifesto Block Management
  saveManifestoBlocks(universeId: string, manuscriptId: string, blocks: any[]): Promise<void>;
  getManifestoBlocks(universeId: string, manuscriptId: string): Promise<any[]>;
  deleteManuscript(universeId: string, manuscriptId: string): Promise<void>;
}
