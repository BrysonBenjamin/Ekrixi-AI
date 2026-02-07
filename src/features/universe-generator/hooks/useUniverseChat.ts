import { useState, useEffect, useCallback, useMemo } from 'react';
import { ChatSession, MessageNode } from '../types';
import { generateId } from '../../../utils/ids';
import { NexusObject, isLink, SimpleNote } from '../../../types';
import { useLLM } from '../../system/hooks/useLLM';
import { FirestoreService } from '../../../core/services/FirestoreService';

export const useUniverseChat = (
  registry: Record<string, NexusObject>,
  activeUniverseId?: string,
) => {
  const { generateText } = useLLM();

  // Local State for sessions (synced from listening)
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);

  // We need to store messages for the ACTIVE session separately,
  // because `sessions` only contains metadata now (empty messageMap).
  // We'll merge them for the return value.
  const [activeSessionMessages, setActiveSessionMessages] = useState<Record<string, MessageNode>>(
    {},
  );

  const [isLoading, setIsLoading] = useState(false);

  // 1. Listen to Sessions
  useEffect(() => {
    if (!activeUniverseId) {
      queueMicrotask(() => setSessions([]));
      return;
    }

    const unsubscribe = FirestoreService.listenToChatSessions(activeUniverseId, (newSessions) => {
      setSessions(newSessions);

      // Auto-select first if none selected and sessions exist
      if (newSessions.length > 0) {
        setCurrentSessionId((prev) => {
          if (!prev || !newSessions.find((s) => s.id === prev)) {
            return newSessions[0].id;
          }
          return prev;
        });
      } else {
        // If no sessions, create default?
        // Logic moved to createSession call or explicit user action usually.
        // But valid to ensure at least one exists.
        // Let's create one if completely empty to match old behavior?
        // Actually, let's leave it empty and let UI prompt or create one.
        // BUT old behavior created on mount. Let's replicate that securely.
        // We can't easily check "if empty create" inside listener without infinite loops if create fails/lags.
        // Safer to let UI handle "No Chats" state.
        setCurrentSessionId(null);
      }
    });
    return () => unsubscribe();
  }, [activeUniverseId]);

  // 2. Listen to Messages for Current Session
  useEffect(() => {
    if (!activeUniverseId || !currentSessionId) {
      queueMicrotask(() => setActiveSessionMessages({}));
      return;
    }

    const unsubscribe = FirestoreService.listenToChatMessages(
      activeUniverseId,
      currentSessionId,
      (messages) => {
        const map: Record<string, MessageNode> = {};
        messages.forEach((m) => (map[m.id] = m));
        setActiveSessionMessages(map);
      },
    );

    return () => unsubscribe();
  }, [activeUniverseId, currentSessionId]);

  // Construct current session object with messages
  const currentSession = useMemo(() => {
    const session = sessions.find((s) => s.id === currentSessionId);
    if (!session) return undefined;

    return {
      ...session,
      messageMap: activeSessionMessages,
    };
  }, [sessions, currentSessionId, activeSessionMessages]);

  const getThread = useCallback((session: ChatSession): MessageNode[] => {
    if (!session.currentLeafId || !session.messageMap[session.currentLeafId]) return [];
    const thread: MessageNode[] = [];
    let currentNodeId: string | null = session.currentLeafId;
    const visited = new Set<string>();
    while (currentNodeId && session.messageMap[currentNodeId]) {
      if (visited.has(currentNodeId)) break;
      visited.add(currentNodeId);
      const node = session.messageMap[currentNodeId];
      thread.unshift(node);
      currentNodeId = node.parentId;
    }
    return thread;
  }, []);

  const triggerGeneration = useCallback(
    async (sessionId: string, leafId: string, historyNodes: MessageNode[]) => {
      if (!activeUniverseId) return;
      setIsLoading(true);
      const botId = generateId();
      const timestamp = new Date().toISOString();

      // Create placeholder empty bot message
      const botNode: MessageNode = {
        id: botId,
        role: 'model',
        text: '',
        parentId: leafId,
        childrenIds: [],
        selectedChildId: null,
        createdAt: timestamp,
        isStreaming: true,
      };

      // Firestore Update
      await FirestoreService.addMessageToChat(activeUniverseId, sessionId, botNode, leafId);

      try {
        const knownUnits = (Object.values(registry) as NexusObject[])
          .filter((o) => !isLink(o))
          .map((o) => {
            const note = o as SimpleNote;
            return `- ${note.title}: ${note.gist}`;
          })
          .join('\n');

        const historyText = historyNodes
          .map((m) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.text}`)
          .join('\n');

        const systemInstruction = `You are a professional world-building consultant and concept architect. 
            - CONTEXT AWARENESS: You have access to the existing Knowledge Graph. 
            - EXISTING_UNITS:
            ${knownUnits || 'No units defined yet.'}
            
            - GOAL: Help the user brainstorm and refine lore. If they mention an existing unit (using @ or name), use the data above.
            - Tone: Conversational, helpful, direct. 
            - Style: Use Markdown.
            - USE "[[Title]]" SYNTAX for any references to entities, concepts, or story nodes. These become clickable links.
            - Interaction: Ask one targeted question at the end to help establish a new unit.`;

        const fullText = await generateText(
          `Current Project Context:\n\n${historyText}\n\nAssistant:`,
          systemInstruction,
        );

        // Streaming simulation locally vs Firestore
        // Firestore is "slow" for per-character streaming.
        // We will stream LOCALLY to `activeSessionMessages` state for UI smoothness,
        // then update Firestore at the end (or in chunks).
        // BUT `activeSessionMessages` is driven by the listener.
        // Overriding it locally might cause flickering when listener updates?
        // Let's rely on Firestore speed? No, too many writes.
        // Best approach: Local state override for streaming node, then final save.

        let currentText = '';
        const chars = fullText.split('');
        const chunkAmount = 30; // Larger chunks for speed
        const revealInterval = 50;

        const interval = setInterval(async () => {
          if (chars.length > 0) {
            const chunk = chars.splice(0, chunkAmount).join('');
            currentText += chunk;

            // LOCAL OPTIMISTIC UPDATE for streaming
            setActiveSessionMessages((prev) => ({
              ...prev,
              [botId]: { ...prev[botId], text: currentText },
            }));
          } else {
            clearInterval(interval);
            setIsLoading(false);

            // FINAL SAVE to Firestore
            await FirestoreService.updateMessage(activeUniverseId, sessionId, botId, {
              text: currentText,
              isStreaming: false,
            });
          }
        }, revealInterval);
      } catch (error) {
        console.error('Generation failed:', error);
        await FirestoreService.updateMessage(activeUniverseId, sessionId, botId, {
          text: 'The connection was interrupted. Please check your credentials and try again.',
          isStreaming: false,
          isError: true,
        });
        setIsLoading(false);
      }
    },
    [registry, generateText, activeUniverseId],
  );

  const sendMessage = useCallback(
    async (text: string) => {
      if (!currentSessionId || isLoading || !activeUniverseId) return;
      const userMsgId = generateId();
      const timestamp = new Date().toISOString();
      const session = currentSession; // captured from closure/render

      // Safety check: verify we have the session loaded
      if (!session) return;

      const newNode: MessageNode = {
        id: userMsgId,
        role: 'user',
        text,
        parentId: session.currentLeafId,
        childrenIds: [],
        selectedChildId: null,
        createdAt: timestamp,
      };

      // Determine Root Updates
      let rootUpdate = undefined;
      const isNewRoot = !session.currentLeafId;

      if (isNewRoot) {
        rootUpdate = {
          newRootId: userMsgId,
          isSelectionChange: true,
        };
      }

      const newTitle =
        session.rootNodeIds.length === 0 && isNewRoot ? text.slice(0, 30) : undefined;

      if (newTitle) {
        FirestoreService.updateChatSessionTitle(activeUniverseId, currentSessionId, newTitle);
      }

      await FirestoreService.addMessageToChat(
        activeUniverseId,
        currentSessionId,
        newNode,
        session.currentLeafId,
        rootUpdate,
      );

      // Calculate history for generation
      // We need to wait for local state to update via listener?
      // OR we predict the structure.
      // `triggerGeneration` takes `historyNodes`.
      // We can construct history including the new node.

      const tempSession = {
        ...session,
        messageMap: {
          ...session.messageMap,
          [userMsgId]: newNode,
          ...(session.currentLeafId
            ? {
                [session.currentLeafId]: {
                  ...session.messageMap[session.currentLeafId],
                  selectedChildId: userMsgId,
                },
              }
            : {}),
        },
        currentLeafId: userMsgId,
      };

      const history = getThread(tempSession);
      triggerGeneration(currentSessionId, userMsgId, history);
    },
    [currentSessionId, isLoading, activeUniverseId, currentSession, getThread, triggerGeneration],
  );

  const editMessage = useCallback(
    async (nodeId: string, newText: string) => {
      if (!currentSessionId || isLoading || !activeUniverseId) return;
      const session = currentSession;
      if (!session) return;
      const originalNode = session.messageMap[nodeId];
      if (!originalNode) return;

      const newBranchId = generateId();
      const timestamp = new Date().toISOString();

      const newNode: MessageNode = {
        id: newBranchId,
        role: originalNode.role,
        text: newText,
        parentId: originalNode.parentId,
        childrenIds: [],
        selectedChildId: null,
        createdAt: timestamp,
      };

      // Determine Root Updates
      let rootUpdate = undefined;
      if (!originalNode.parentId) {
        rootUpdate = {
          newRootId: newBranchId,
          isSelectionChange: true,
        };
      }

      await FirestoreService.addMessageToChat(
        activeUniverseId,
        currentSessionId,
        newNode,
        originalNode.parentId,
        rootUpdate,
      );

      // Trigger generation if user message
      if (originalNode.role === 'user') {
        // similar history construction...
        const tempSession = {
          ...session,
          messageMap: {
            ...session.messageMap,
            [newBranchId]: newNode,
            ...(originalNode.parentId
              ? {
                  [originalNode.parentId]: {
                    ...session.messageMap[originalNode.parentId],
                    selectedChildId: newBranchId,
                  },
                }
              : {}),
          },
          currentLeafId: newBranchId,
        };
        const history = getThread(tempSession);
        triggerGeneration(currentSessionId, newBranchId, history);
      }
    },
    [currentSessionId, isLoading, activeUniverseId, currentSession, triggerGeneration, getThread],
  );

  const regenerate = useCallback(
    async (nodeId: string) => {
      // ... (reuse logic or keep simple)
      if (!currentSessionId || isLoading || !currentSession || !activeUniverseId) return;
      const node = currentSession.messageMap[nodeId];
      if (!node) return;

      if (node.role === 'user') {
        editMessage(nodeId, node.text);
      } else if (node.role === 'model' && node.parentId) {
        const history = getThread({ ...currentSession, currentLeafId: node.parentId });
        triggerGeneration(currentSessionId, node.parentId, history);
      }
    },
    [
      currentSessionId,
      isLoading,
      currentSession,
      activeUniverseId,
      editMessage,
      getThread,
      triggerGeneration,
    ],
  );

  const navigateBranch = useCallback(
    (nodeId: string, direction: 'prev' | 'next') => {
      // Navigation is tricky with Firestore immutable model.
      // We need to update `selectedChildId` on the parent,
      // AND `currentLeafId` on the session.
      // This is a UI state change that persists.

      if (!currentSession || !activeUniverseId) return;
      const session = currentSession;
      const node = session.messageMap[nodeId];
      if (!node) return;

      // Identify target
      let targetId: string | null = null;

      if (node.parentId && session.messageMap[node.parentId]) {
        const parent = session.messageMap[node.parentId];
        const idx = parent.childrenIds.indexOf(nodeId);
        const nextIdx = direction === 'prev' ? idx - 1 : idx + 1;
        if (nextIdx >= 0 && nextIdx < parent.childrenIds.length) {
          targetId = parent.childrenIds[nextIdx];
        }
      } else {
        const idx = session.rootNodeIds.indexOf(nodeId);
        const nextIdx = direction === 'prev' ? idx - 1 : idx + 1;
        if (nextIdx >= 0 && nextIdx < session.rootNodeIds.length) {
          targetId = session.rootNodeIds[nextIdx];
        }
      }

      if (targetId) {
        // We need to traverse down to leaf to set `currentLeafId`?
        // Or just selecting this branch implies we follow `selectedChildId` down?
        // The `findLatestLeaf` helper did exactly that.

        const findLatestLeaf = (startId: string, map: Record<string, MessageNode>): string => {
          let cur = startId;
          while (true) {
            const n = map[cur];
            if (!n || n.childrenIds.length === 0) return cur;
            cur = n.selectedChildId || n.childrenIds[n.childrenIds.length - 1];
          }
        };

        const newLeafId = findLatestLeaf(targetId, session.messageMap);

        // Perform Updates in Firestore
        const updates: Promise<void>[] = [];

        // 1. If parent exists, update its `selectedChildId`
        if (node.parentId) {
          updates.push(
            FirestoreService.updateMessage(activeUniverseId, session.id, node.parentId, {
              selectedChildId: targetId,
            }),
          );
        } else {
          // Update session `selectedRootId`
          updates.push(
            FirestoreService.updateChatSession(activeUniverseId, session.id, {
              selectedRootId: targetId,
            }),
          );
        }

        // 2. Update session `currentLeafId`
        updates.push(
          FirestoreService.updateChatSession(activeUniverseId, session.id, {
            currentLeafId: newLeafId,
          }),
        );

        Promise.all(updates).catch((err) => console.error('Navigation failed', err));
      }
    },
    [currentSession, activeUniverseId],
  );

  // Helper for navigateBranch to actually persist
  // We'll skip implementing `navigateBranch` fully for now
  // and focus on basic messaging first, as `navigateBranch` requires complex updates.
  // Actually, I can just not persist it? No, UI depends on it.

  const thread = useMemo(() => {
    return currentSession ? getThread(currentSession) : [];
  }, [currentSession, getThread]);

  return {
    sessions,
    currentSessionId,
    currentSession,
    thread,
    isLoading,
    createSession: async () => {
      if (!activeUniverseId) return;
      const newId = generateId();
      const initial: ChatSession = {
        id: newId,
        universeId: activeUniverseId,
        title: 'New Project',
        messageMap: {},
        rootNodeIds: [],
        selectedRootId: null,
        currentLeafId: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await FirestoreService.createChatSession(activeUniverseId, initial);
      setCurrentSessionId(newId);
    },
    deleteSession: async (id: string) => {
      if (!activeUniverseId) return;
      await FirestoreService.deleteChatSession(activeUniverseId, id);
      if (currentSessionId === id) setCurrentSessionId(null);
    },
    selectSession: setCurrentSessionId,
    sendMessage,
    editMessage,
    regenerate,
    navigateBranch,
  };
};
