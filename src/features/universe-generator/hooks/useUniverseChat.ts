import { useState, useEffect, useCallback, useMemo } from 'react';
import { ChatSession, MessageNode } from '../types';
import { generateId } from '../../../utils/ids';
import { NexusObject, isLink, SimpleNote } from '../../../types';
import { useLLM } from '../../system/hooks/useLLM';
import { DataService } from '../../../core/services/DataService';
import { useSessionStore } from '../../../store/useSessionStore';

export const useUniverseChat = (
  registry: Record<string, NexusObject>,
  activeUniverseId?: string,
) => {
  const { generateText } = useLLM();
  const { currentUser } = useSessionStore();

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

    const unsubscribe = DataService.listenToChatSessions(activeUniverseId, (newSessions) => {
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

    const unsubscribe = DataService.listenToChatMessages(
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
        senderId: currentUser?.id || 'system',
        isStreaming: true,
      };

      // Firestore Update
      await DataService.addMessageToChat(activeUniverseId, sessionId, botNode, leafId);

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
            await DataService.updateMessage(activeUniverseId, sessionId, botId, {
              text: currentText,
              isStreaming: false,
            });
          }
        }, revealInterval);
      } catch (error) {
        console.error('Generation failed:', error);
        await DataService.updateMessage(activeUniverseId, sessionId, botId, {
          text: 'The connection was interrupted. Please check your credentials and try again.',
          isStreaming: false,
          isError: true,
        });
        setIsLoading(false);
      }
    },
    [registry, generateText, activeUniverseId, currentUser?.id],
  );

  const sendMessage = useCallback(
    async (text: string) => {
      if (import.meta.env.DEV) {
        console.log('[useUniverseChat] sendMessage sequence started:', {
          text,
          currentSessionId,
          activeUniverseId,
          isLoading,
        });
      }

      if (isLoading || !activeUniverseId) {
        if (import.meta.env.DEV) {
          console.warn('[useUniverseChat] sendMessage cancelled: busy or no universe', {
            isLoading,
            activeUniverseId,
          });
        }
        return;
      }

      setIsLoading(true); // Immediate feedback

      try {
        let sessionId = currentSessionId;

        // Auto-create session if none exists
        if (!sessionId) {
          if (import.meta.env.DEV) {
            console.log('[useUniverseChat] No active session. Creating one...');
          }
          const newSessionId = generateId();
          const initial = {
            id: newSessionId,
            universeId: activeUniverseId,
            title: text.slice(0, 30) || 'New Project',
            messageMap: {},
            rootNodeIds: [],
            selectedRootId: null,
            currentLeafId: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          await DataService.createChatSession(activeUniverseId, initial);
          sessionId = newSessionId;
          setCurrentSessionId(newSessionId); // Select it locally
        }

        const userMsgId = generateId();
        const timestamp = new Date().toISOString();
        const session = currentSession || {
          id: sessionId,
          universeId: activeUniverseId,
          title: text.slice(0, 30),
          messageMap: {},
          rootNodeIds: [],
          selectedRootId: null,
          currentLeafId: null,
          createdAt: timestamp,
          updatedAt: timestamp,
        };

        const newNode: MessageNode = {
          id: userMsgId,
          role: 'user',
          text,
          parentId: session.currentLeafId,
          childrenIds: [],
          selectedChildId: null,
          createdAt: timestamp,
          senderId: currentUser?.id || 'system',
        };

        // OPTIMISTIC UPDATE: Local state update for immediate UI feedback
        setActiveSessionMessages((prev) => ({
          ...prev,
          [userMsgId]: newNode,
          ...(session.currentLeafId
            ? {
                [session.currentLeafId]: {
                  ...session.messageMap[session.currentLeafId],
                  selectedChildId: userMsgId,
                },
              }
            : {}),
        }));

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
          DataService.updateChatSessionTitle(activeUniverseId, sessionId, newTitle);
        }

        await DataService.addMessageToChat(
          activeUniverseId,
          sessionId,
          newNode,
          session.currentLeafId,
          rootUpdate,
        );

        // Calculate history for generation
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
        triggerGeneration(sessionId, userMsgId, history);
      } catch (error) {
        console.error('[useUniverseChat] Failed to send message:', error);
        setIsLoading(false);
      }
    },
    [
      currentSessionId,
      isLoading,
      activeUniverseId,
      currentSession,
      getThread,
      triggerGeneration,
      currentUser,
    ],
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
        senderId: currentUser?.id || 'system',
      };

      // Determine Root Updates
      let rootUpdate = undefined;
      if (!originalNode.parentId) {
        rootUpdate = {
          newRootId: newBranchId,
          isSelectionChange: true,
        };
      }

      await DataService.addMessageToChat(
        activeUniverseId,
        currentSessionId,
        newNode,
        originalNode.parentId,
        rootUpdate,
      );

      // Trigger generation if user message
      if (originalNode.role === 'user') {
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
    [
      currentSessionId,
      isLoading,
      activeUniverseId,
      currentSession,
      triggerGeneration,
      getThread,
      currentUser?.id,
    ],
  );

  const regenerate = useCallback(
    async (nodeId: string) => {
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
      if (!currentSession || !activeUniverseId) return;
      const session = currentSession;
      const node = session.messageMap[nodeId];
      if (!node) return;

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
        const findLatestLeaf = (startId: string, map: Record<string, MessageNode>): string => {
          let cur = startId;
          while (true) {
            const n = map[cur];
            if (!n || n.childrenIds.length === 0) return cur;
            cur = n.selectedChildId || n.childrenIds[n.childrenIds.length - 1];
          }
        };

        const newLeafId = findLatestLeaf(targetId, session.messageMap);
        const updates: Promise<void>[] = [];

        if (node.parentId) {
          updates.push(
            DataService.updateMessage(activeUniverseId, session.id, node.parentId, {
              selectedChildId: targetId,
            }),
          );
        } else {
          updates.push(
            DataService.updateChatSession(activeUniverseId, session.id, {
              selectedRootId: targetId,
            }),
          );
        }

        updates.push(
          DataService.updateChatSession(activeUniverseId, session.id, {
            currentLeafId: newLeafId,
          }),
        );

        Promise.all(updates).catch((err) => console.error('Navigation failed', err));
      }
    },
    [currentSession, activeUniverseId],
  );

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
      await DataService.createChatSession(activeUniverseId, initial);

      const newCount = sessions.length + 1;
      useSessionStore.getState().updateUniverseMeta(activeUniverseId, { chatCount: newCount });

      setCurrentSessionId(newId);
    },
    deleteSession: async (id: string) => {
      if (!activeUniverseId) return;
      await DataService.deleteChatSession(activeUniverseId, id);

      const newCount = Math.max(0, sessions.length - 1);
      useSessionStore.getState().updateUniverseMeta(activeUniverseId, { chatCount: newCount });

      if (currentSessionId === id) setCurrentSessionId(null);
    },
    selectSession: setCurrentSessionId,
    sendMessage,
    editMessage,
    regenerate,
    updateTitle: async (id: string, title: string) => {
      if (!activeUniverseId) return;
      await DataService.updateChatSessionTitle(activeUniverseId, id, title);
    },
    navigateBranch,
  };
};
