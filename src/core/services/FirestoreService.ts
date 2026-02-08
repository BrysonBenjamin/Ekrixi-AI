import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  limit,
  orderBy,
  onSnapshot,
  runTransaction,
  writeBatch,
  QueryConstraint,
  CollectionReference,
} from 'firebase/firestore';
import { db } from '../firebase';
import {
  NexusObject,
  SimpleLink,
  SimpleNote,
  NexusType,
  NexusCategory,
  ContainmentType,
  DefaultLayout,
} from '../../types';
import { Universe, UniverseUpdates } from '../types/data-service';
import { ChatSession, MessageNode } from '../../features/universe-generator/types';

// Collection References
const getNexusObjectsCollectionRef = (universeId: string) =>
  collection(db, 'universes', universeId, 'nexusObjects');

const getNexusObjectDocRef = (universeId: string, nexusObjectId: string) =>
  doc(db, 'universes', universeId, 'nexusObjects', nexusObjectId);

const getUniversesCollectionRef = () => collection(db, 'universes');
const getUniverseDocRef = (universeId: string) => doc(db, 'universes', universeId);

const getChatsCollectionRef = (universeId: string) =>
  collection(db, 'universes', universeId, 'chats');

const getChatDocRef = (universeId: string, chatId: string) =>
  doc(db, 'universes', universeId, 'chats', chatId);

const getMessagesCollectionRef = (universeId: string, chatId: string) =>
  collection(db, 'universes', universeId, 'chats', chatId, 'messages');

const getMessageDocRef = (universeId: string, chatId: string, messageId: string) =>
  doc(db, 'universes', universeId, 'chats', chatId, 'messages', messageId);

export const FirestoreService = {
  // --- NexusObject CRUD ---

  async createOrUpdateNexusObject(universeId: string, nexusObject: NexusObject): Promise<void> {
    try {
      const docRef = getNexusObjectDocRef(universeId, nexusObject.id);
      await setDoc(docRef, nexusObject, { merge: true });
    } catch (err) {
      console.error(`[FirestoreService] Failed to create/update object ${nexusObject.id}:`, err);
      throw err;
    }
  },

  async getNexusObject(universeId: string, nexusObjectId: string): Promise<NexusObject | null> {
    const docRef = getNexusObjectDocRef(universeId, nexusObjectId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      return docSnap.data() as NexusObject;
    } else {
      return null;
    }
  },

  async updateNexusObjectFields(
    universeId: string,
    nexusObjectId: string,
    updates: Partial<NexusObject>,
  ): Promise<void> {
    try {
      const docRef = getNexusObjectDocRef(universeId, nexusObjectId);
      await updateDoc(docRef, updates);
    } catch (err) {
      console.error(`[FirestoreService] Failed to update fields for ${nexusObjectId}:`, err);
      throw err;
    }
  },

  async deleteNexusObject(universeId: string, nexusObjectId: string): Promise<void> {
    try {
      const docRef = getNexusObjectDocRef(universeId, nexusObjectId);
      await deleteDoc(docRef);
    } catch (err) {
      console.error(`[FirestoreService] Failed to delete object ${nexusObjectId}:`, err);
      throw err;
    }
  },

  async getAllNexusObjects(universeId: string): Promise<NexusObject[]> {
    const q = query(getNexusObjectsCollectionRef(universeId));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map((doc) => doc.data() as NexusObject);
  },

  // --- Batch Operations ---

  async batchCreateOrUpdate(universeId: string, objects: NexusObject[]): Promise<void> {
    try {
      const BATCH_LIMIT = 500;
      for (let i = 0; i < objects.length; i += BATCH_LIMIT) {
        const batch = writeBatch(db);
        const chunk = objects.slice(i, i + BATCH_LIMIT);
        chunk.forEach((obj) => {
          const docRef = getNexusObjectDocRef(universeId, obj.id);
          batch.set(docRef, obj, { merge: true });
        });
        await batch.commit();
      }
    } catch (err) {
      console.error(`[FirestoreService] Batch operation failed for universe ${universeId}:`, err);
      throw err;
    }
  },

  // --- Real-time Listeners ---

  listenToAllNexusObjects(
    universeId: string,
    callback: (nexusObjects: NexusObject[]) => void,
  ): () => void {
    const q = query(getNexusObjectsCollectionRef(universeId));
    const unsubscribe = onSnapshot(
      q,
      (querySnapshot) => {
        const nexusObjects = querySnapshot.docs.map((doc) => doc.data() as NexusObject);
        callback(nexusObjects);
      },
      (error) => {
        console.error(`[FirestoreService] listenToAllNexusObjects error for ${universeId}:`, error);
      },
    );
    return unsubscribe;
  },

  // --- Reification Transaction ---

  async reifyLinkToNote(
    universeId: string,
    linkToReify: SimpleLink,
    newNoteData: Omit<SimpleNote, '_type' | 'id'>,
  ): Promise<SimpleNote | null> {
    let newNote: SimpleNote | null = null;
    const nexusObjectsRef = getNexusObjectsCollectionRef(universeId);

    try {
      await runTransaction(db, async (transaction) => {
        // 1. Get source
        const sourceDocRef = getNexusObjectDocRef(universeId, linkToReify.source_id);
        const sourceDocSnap = await transaction.get(sourceDocRef);

        if (!sourceDocSnap.exists()) {
          throw new Error(`Source node ${linkToReify.source_id} not found.`);
        }
        const sourceData = sourceDocSnap.data() as NexusObject;

        // 2. Prepare new Note
        const newNoteId = doc(nexusObjectsRef).id;
        newNote = {
          id: newNoteId,
          _type: NexusType.SIMPLE_NOTE,
          ...newNoteData,
          internal_weight: sourceData.internal_weight || 1,
          total_subtree_mass: sourceData.total_subtree_mass || 1,
          created_at: new Date().toISOString(),
          last_modified: new Date().toISOString(),
          link_ids: [],
          // Ensure mandatory fields from interface are present
          aliases: [],
          tags: [],
          is_ghost: false,
          category_id: NexusCategory.WORLD,
          containment_type: ContainmentType.FOLDER,
          default_layout: DefaultLayout.GRID,
          is_collapsed: false,
          children_ids: [],
          gist: newNoteData.gist || '',
          prose_content: newNoteData.prose_content || '',
        } as SimpleNote;

        const newNoteDocRef = getNexusObjectDocRef(universeId, newNoteId);

        // 3. Update source link_ids
        const updatedLinkIds = (sourceData.link_ids || []).filter((id) => id !== linkToReify.id);
        // Add new note ID if it effectively replaces the link as a child/connection?
        // For now, mirroring user's example which just removes old link.

        transaction.update(sourceDocRef, { link_ids: updatedLinkIds });

        // 4. Create new Note
        transaction.set(newNoteDocRef, newNote);

        // 5. Delete old Link
        const linkDocRef = getNexusObjectDocRef(universeId, linkToReify.id);
        transaction.delete(linkDocRef);
      });
      return newNote;
    } catch (e) {
      console.error('Transaction failed: ', e);
      throw e;
    }
  },

  // --- Universe Management ---

  async createUniverse(name: string, description: string, ownerId: string): Promise<string> {
    const newUniverseId = doc(getUniversesCollectionRef()).id;
    const universeRef = getUniverseDocRef(newUniverseId);

    await setDoc(universeRef, {
      id: newUniverseId,
      name,
      description,
      ownerId,
      participants: [ownerId],
      createdAt: new Date().toISOString(),
      lastActive: new Date().toISOString(),
      nodeCount: 0,
    });

    return newUniverseId;
  },

  async importUniverse(
    id: string,
    name: string,
    description: string,
    ownerId: string,
  ): Promise<void> {
    const universeRef = getUniverseDocRef(id);
    // Check if exists? Overwrite? For import, overwrite is usually intended or we should check.
    // Let's assume overwrite for now or merge.
    const snap = await getDoc(universeRef);

    await setDoc(
      universeRef,
      {
        id,
        name,
        description: description || '',
        ownerId: ownerId || '',
        participants: [ownerId || ''],
        createdAt: snap.exists() ? snap.data()?.createdAt : new Date().toISOString(),
        lastActive: new Date().toISOString(),
        nodeCount: snap.exists() ? snap.data()?.nodeCount : 0,
      },
      { merge: true },
    );
  },

  async deleteUniverse(universeId: string): Promise<void> {
    // Recursive delete of subcollections manually
    // 1. Delete NexusObjects
    await this.deleteCollection(getNexusObjectsCollectionRef(universeId));

    // 2. Delete Chats and their Messages
    const chatsRef = getChatsCollectionRef(universeId);
    const chatsSnapshot = await getDocs(chatsRef);
    for (const chatDoc of chatsSnapshot.docs) {
      const messagesRef = getMessagesCollectionRef(universeId, chatDoc.id);
      await this.deleteCollection(messagesRef);
      await deleteDoc(chatDoc.ref);
    }

    // 3. Delete Universe Doc
    await deleteDoc(getUniverseDocRef(universeId));
  },

  async updateUniverseMeta(universeId: string, updates: UniverseUpdates): Promise<void> {
    const universeRef = getUniverseDocRef(universeId);
    await updateDoc(universeRef, {
      ...updates,
      lastActive: new Date().toISOString(),
    });
  },

  listenToUniverses(userId: string | null, callback: (universes: Universe[]) => void): () => void {
    if (import.meta.env.DEV) {
      console.log(
        `[FirestoreService] listenToUniverses called with userId:`,
        userId,
        typeof userId,
      );
    }

    const queryConstraints: QueryConstraint[] = [];

    if (userId && typeof userId === 'string') {
      queryConstraints.push(where('ownerId', '==', userId));
    }

    queryConstraints.push(orderBy('lastActive', 'desc'));

    const q = query(getUniversesCollectionRef(), ...queryConstraints);
    return onSnapshot(
      q,
      (snapshot) => {
        callback(snapshot.docs.map((doc) => doc.data() as Universe));
      },
      (error) => {
        console.error('[FirestoreService] listenToUniverses error:', error);
      },
    );
  },

  // --- Helpers ---

  async deleteCollection(
    collectionRef: CollectionReference,
    batchSize: number = 50,
  ): Promise<void> {
    const q = query(collectionRef, limit(batchSize));
    const snapshot = await getDocs(q);

    if (snapshot.size === 0) {
      return;
    }

    const batch = writeBatch(db);
    snapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });

    await batch.commit();

    // Recurse if there might be more
    if (snapshot.size >= batchSize) {
      await this.deleteCollection(collectionRef, batchSize);
    }
  },

  // --- Chat Management ---

  async createChatSession(universeId: string, session: ChatSession): Promise<void> {
    // We only save the session metadata here. Messages are empty initially.
    // We strip the messageMap to avoid saving it in the main doc if we were passing full object
    // But for consistency we'll save the "root" structure fields.
    const sessionData = { ...session };
    delete (sessionData as any).messageMap;
    const docRef = getChatDocRef(universeId, session.id);
    await setDoc(docRef, sessionData);
  },

  async deleteChatSession(universeId: string, sessionId: string): Promise<void> {
    await deleteDoc(getChatDocRef(universeId, sessionId));
    // Note: Subcollections (messages) need recursive delete if on client.
  },

  async updateChatSessionTitle(
    universeId: string,
    sessionId: string,
    title: string,
  ): Promise<void> {
    const docRef = getChatDocRef(universeId, sessionId);
    await updateDoc(docRef, { title, updatedAt: new Date().toISOString() });
  },

  async updateChatSession(
    universeId: string,
    sessionId: string,
    updates: Partial<ChatSession>,
  ): Promise<void> {
    const docRef = getChatDocRef(universeId, sessionId);
    // Ensure we don't accidentally write messageMap if it was passed
    const safeUpdates = { ...updates };
    delete (safeUpdates as any).messageMap;
    await updateDoc(docRef, { ...safeUpdates, updatedAt: new Date().toISOString() });
  },

  listenToChatSessions(
    universeId: string,
    callback: (sessions: ChatSession[]) => void,
  ): () => void {
    const q = query(getChatsCollectionRef(universeId), orderBy('updatedAt', 'desc'));
    return onSnapshot(
      q,
      (snapshot) => {
        const sessions = snapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            ...data,
            messageMap: {},
          } as ChatSession;
        });
        callback(sessions);
      },
      (error) => {
        console.error(`[FirestoreService] listenToChatSessions error for ${universeId}:`, error);
      },
    );
  },

  // --- Message Management ---

  listenToChatMessages(
    universeId: string,
    chatId: string,
    callback: (messages: MessageNode[]) => void,
  ): () => void {
    const q = query(getMessagesCollectionRef(universeId, chatId));
    return onSnapshot(
      q,
      (snapshot) => {
        const messages = snapshot.docs.map((doc) => doc.data() as MessageNode);
        callback(messages);
      },
      (error) => {
        console.error(`[FirestoreService] listenToChatMessages error for ${chatId}:`, error);
      },
    );
  },

  async addMessageToChat(
    universeId: string,
    chatId: string,
    message: MessageNode,
    parentId: string | null, // If null, it's a root
    rootUpdate?: {
      newRootId: string;
      isSelectionChange: boolean;
    },
  ): Promise<void> {
    await runTransaction(db, async (transaction) => {
      const chatDocRef = getChatDocRef(universeId, chatId);
      const messageDocRef = getMessageDocRef(universeId, chatId, message.id);

      // 1. ALL READS FIRST
      let parentSnap;
      if (parentId) {
        const parentDocRef = getMessageDocRef(universeId, chatId, parentId);
        parentSnap = await transaction.get(parentDocRef);
      }

      let chatSnap;
      if (rootUpdate) {
        chatSnap = await transaction.get(chatDocRef);
      }

      // 2. ALL WRITES AFTER READS
      // A. Create Message
      transaction.set(messageDocRef, message);

      // B. Update Parent if exists
      if (parentId && parentSnap?.exists()) {
        const parentDocRef = getMessageDocRef(universeId, chatId, parentId);
        const parentData = parentSnap.data() as MessageNode;
        const updatedChildren = [...(parentData.childrenIds || []), message.id];
        transaction.update(parentDocRef, {
          childrenIds: updatedChildren,
          selectedChildId: message.id,
        });
      }

      // C. Update Session
      const sessionUpdates: Partial<ChatSession> & { updatedAt: string } = {
        currentLeafId: message.id,
        updatedAt: new Date().toISOString(),
      };

      if (rootUpdate && chatSnap?.exists()) {
        const chatData = chatSnap.data();
        const currentRoots = chatData?.rootNodeIds || [];
        // Avoid duplicates just in case
        if (!currentRoots.includes(rootUpdate.newRootId)) {
          sessionUpdates.rootNodeIds = [...currentRoots, rootUpdate.newRootId];
        }
        if (rootUpdate.isSelectionChange) {
          sessionUpdates.selectedRootId = rootUpdate.newRootId;
        }
      }

      transaction.update(chatDocRef, sessionUpdates);
    });
  },

  async updateMessage(
    universeId: string,
    chatId: string,
    messageId: string,
    updates: Partial<MessageNode>,
  ): Promise<void> {
    const docRef = getMessageDocRef(universeId, chatId, messageId);
    await updateDoc(docRef, updates);
  },
};
