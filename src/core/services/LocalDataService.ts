import { NexusObject, SimpleLink, SimpleNote } from '../types';
import { ChatSession, MessageNode } from '../../features/universe-generator/types';
import { IDataService } from '../types/data-service';

// --- Internal Storage Helpers (Private to this module) ---
const _getStorageKey = (
  universeId: string,
  type: 'objects' | 'chats' | 'messages' | 'universes',
) => {
  return `ekrixi_local_${universeId}_${type}`;
};

const _getData = <T>(key: string): T[] => {
  const data = localStorage.getItem(key);
  return data ? JSON.parse(data) : [];
};

const _saveData = <T>(key: string, data: T[]) => {
  localStorage.setItem(key, JSON.stringify(data));
};

/**
 * LocalDataService
 * A localStorage-backed implementation of IDataService for offline development,
 * testing, and professional staging without Firebase costs or connectivity.
 */
export const LocalDataService: IDataService = {
  // --- NexusObject CRUD ---
  async createOrUpdateNexusObject(universeId: string, nexusObject: NexusObject): Promise<void> {
    const key = _getStorageKey(universeId, 'objects');
    const objects = _getData<NexusObject>(key);
    const index = objects.findIndex((o) => o.id === nexusObject.id);

    if (index >= 0) {
      objects[index] = { ...objects[index], ...nexusObject } as NexusObject;
    } else {
      objects.push(nexusObject);
    }

    _saveData(key, objects);
  },

  async getNexusObject(universeId: string, nexusObjectId: string): Promise<NexusObject | null> {
    const objects = _getData<NexusObject>(_getStorageKey(universeId, 'objects'));
    return objects.find((o) => o.id === nexusObjectId) || null;
  },

  async updateNexusObjectFields(
    universeId: string,
    nexusObjectId: string,
    updates: Partial<NexusObject>,
  ): Promise<void> {
    const key = _getStorageKey(universeId, 'objects');
    const objects = _getData<NexusObject>(key);
    const index = objects.findIndex((o) => o.id === nexusObjectId);

    if (index >= 0) {
      objects[index] = { ...objects[index], ...updates } as NexusObject;
      _saveData(key, objects);
    }
  },

  async deleteNexusObject(universeId: string, nexusObjectId: string): Promise<void> {
    const key = _getStorageKey(universeId, 'objects');
    const objects = _getData<NexusObject>(key);
    _saveData(
      key,
      objects.filter((o) => o.id !== nexusObjectId),
    );
  },

  async getAllNexusObjects(universeId: string): Promise<NexusObject[]> {
    return _getData<NexusObject>(_getStorageKey(universeId, 'objects'));
  },

  // --- Batch Operations ---
  async batchCreateOrUpdate(universeId: string, objects: NexusObject[]): Promise<void> {
    for (const obj of objects) {
      await this.createOrUpdateNexusObject(universeId, obj);
    }
  },

  // --- Real-time Listeners (Simulated) ---
  listenToAllNexusObjects(
    universeId: string,
    callback: (nexusObjects: NexusObject[]) => void,
  ): () => void {
    const key = _getStorageKey(universeId, 'objects');

    // Initial load
    callback(_getData<NexusObject>(key));

    // Simple polling for "real-time" feel in local dev
    const interval = setInterval(() => {
      callback(_getData<NexusObject>(key));
    }, 1000);

    return () => clearInterval(interval);
  },

  // --- Transactions ---
  async reifyLinkToNote(
    universeId: string,
    linkToReify: SimpleLink,
    newNoteData: Omit<SimpleNote, '_type' | 'id'>,
  ): Promise<SimpleNote | null> {
    const newNote: SimpleNote = {
      ...newNoteData,
      id: crypto.randomUUID(),
      _type: 'SIMPLE_NOTE',
    } as any;

    await this.createOrUpdateNexusObject(universeId, newNote as unknown as NexusObject);
    return newNote;
  },

  // --- Universe Management ---
  async createUniverse(name: string, description: string, ownerId: string): Promise<string> {
    const key = 'ekrixi_local_universes';
    const universes = _getData<any>(key);
    const id = crypto.randomUUID();

    const newUniverse = {
      id,
      name,
      description,
      ownerId,
      createdAt: new Date().toISOString(),
    };

    universes.push(newUniverse);
    _saveData(key, universes);
    return id;
  },

  async importUniverse(
    id: string,
    name: string,
    description: string,
    ownerId: string,
  ): Promise<void> {
    const key = 'ekrixi_local_universes';
    const universes = _getData<any>(key);

    if (!universes.find((u: any) => u.id === id)) {
      universes.push({ id, name, description, ownerId });
      _saveData(key, universes);
    }
  },

  async deleteUniverse(universeId: string): Promise<void> {
    const key = 'ekrixi_local_universes';
    const universes = _getData<any>(key);
    _saveData(
      key,
      universes.filter((u: any) => u.id !== universeId),
    );

    // Clean up associated data
    localStorage.removeItem(_getStorageKey(universeId, 'objects'));
    localStorage.removeItem(_getStorageKey(universeId, 'chats'));
    localStorage.removeItem(_getStorageKey(universeId, 'messages'));
  },

  async updateUniverseMeta(universeId: string, updates: any): Promise<void> {
    const key = 'ekrixi_local_universes';
    const universes = _getData<any>(key);
    const index = universes.findIndex((u: any) => u.id === universeId);

    if (index >= 0) {
      universes[index] = { ...universes[index], ...updates };
      _saveData(key, universes);
    }
  },

  listenToUniverses(callback: (universes: any[]) => void): () => void {
    const key = 'ekrixi_local_universes';
    callback(_getData<any>(key));

    const interval = setInterval(() => {
      callback(_getData<any>(key));
    }, 1000);

    return () => clearInterval(interval);
  },

  // --- Chat Management ---
  async createChatSession(universeId: string, session: ChatSession): Promise<void> {
    const key = _getStorageKey(universeId, 'chats');
    const sessions = _getData<ChatSession>(key);
    sessions.push(session);
    _saveData(key, sessions);
  },

  async deleteChatSession(universeId: string, sessionId: string): Promise<void> {
    const key = _getStorageKey(universeId, 'chats');
    const sessions = _getData<ChatSession>(key);
    _saveData(
      key,
      sessions.filter((s) => s.id !== sessionId),
    );
  },

  async updateChatSessionTitle(
    universeId: string,
    sessionId: string,
    title: string,
  ): Promise<void> {
    const key = _getStorageKey(universeId, 'chats');
    const sessions = _getData<ChatSession>(key);
    const index = sessions.findIndex((s) => s.id === sessionId);
    if (index >= 0) {
      sessions[index].title = title;
      _saveData(key, sessions);
    }
  },

  async updateChatSession(
    universeId: string,
    sessionId: string,
    updates: Partial<ChatSession>,
  ): Promise<void> {
    const key = _getStorageKey(universeId, 'chats');
    const sessions = _getData<ChatSession>(key);
    const index = sessions.findIndex((s) => s.id === sessionId);
    if (index >= 0) {
      sessions[index] = { ...sessions[index], ...updates };
      _saveData(key, sessions);
    }
  },

  listenToChatSessions(
    universeId: string,
    callback: (sessions: ChatSession[]) => void,
  ): () => void {
    const key = _getStorageKey(universeId, 'chats');
    callback(_getData<ChatSession>(key));

    const interval = setInterval(() => {
      callback(_getData<ChatSession>(key));
    }, 1000);

    return () => clearInterval(interval);
  },

  // --- Message Management ---
  listenToChatMessages(
    universeId: string,
    chatId: string,
    callback: (messages: MessageNode[]) => void,
  ): () => void {
    const key = `${_getStorageKey(universeId, 'messages')}_${chatId}`;
    callback(_getData<MessageNode>(key));

    const interval = setInterval(() => {
      callback(_getData<MessageNode>(key));
    }, 1000);

    return () => clearInterval(interval);
  },

  async addMessageToChat(
    universeId: string,
    chatId: string,
    message: MessageNode,
    parentId: string | null,
    rootUpdate?: { newRootId: string; isSelectionChange: boolean },
  ): Promise<void> {
    const msgKey = `${_getStorageKey(universeId, 'messages')}_${chatId}`;
    const messages = _getData<MessageNode>(msgKey);
    messages.push(message);
    _saveData(msgKey, messages);

    // Update parent
    if (parentId) {
      const index = messages.findIndex((m) => m.id === parentId);
      if (index >= 0) {
        messages[index].childrenIds = [...(messages[index].childrenIds || []), message.id];
        messages[index].selectedChildId = message.id;
        _saveData(msgKey, messages);
      }
    }

    // Update Session
    const chatKey = _getStorageKey(universeId, 'chats');
    const sessions = _getData<ChatSession>(chatKey);
    const sIdx = sessions.findIndex((s) => s.id === chatId);
    if (sIdx >= 0) {
      sessions[sIdx].currentLeafId = message.id;
      sessions[sIdx].updatedAt = new Date().toISOString();
      if (rootUpdate) {
        if (!sessions[sIdx].rootNodeIds.includes(rootUpdate.newRootId)) {
          sessions[sIdx].rootNodeIds.push(rootUpdate.newRootId);
        }
        if (rootUpdate.isSelectionChange) {
          sessions[sIdx].selectedRootId = rootUpdate.newRootId;
        }
      }
      _saveData(chatKey, sessions);
    }
  },

  async updateMessage(
    universeId: string,
    chatId: string,
    messageId: string,
    updates: Partial<MessageNode>,
  ): Promise<void> {
    const key = `${_getStorageKey(universeId, 'messages')}_${chatId}`;
    const messages = _getData<MessageNode>(key);
    const index = messages.findIndex((m) => m.id === messageId);
    if (index >= 0) {
      messages[index] = { ...messages[index], ...updates };
      _saveData(key, messages);
    }
  },
};
