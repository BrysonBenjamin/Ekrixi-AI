import { useState, useEffect, useCallback, useMemo } from 'react';
import { ChatSession, MessageNode } from '../types';
import { generateId } from '../../../utils/ids';
import { NexusObject, isLink } from '../../../types';
import { useLLM } from '../../system/hooks/useLLM';
import { DataService } from '../../../core/services/DataService';
import { useSessionStore } from '../../../store/useSessionStore';
import {
  ContextAssemblyService,
  WeightedContextUnit,
} from '../../../core/services/ContextAssemblyService';

export const useUniverseChat = (
  registry: Record<string, NexusObject>,
  activeUniverseId?: string,
  isCanvasMode: boolean = false,
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

  const updateSession = useCallback(
    async (sessionId: string, updates: Partial<ChatSession>) => {
      if (!activeUniverseId) return;

      // Optimistic Update
      setSessions((prev) => prev.map((s) => (s.id === sessionId ? { ...s, ...updates } : s)));

      // Persistence
      await DataService.updateChatSession(activeUniverseId, sessionId, updates);
    },
    [activeUniverseId, setSessions],
  );

  const triggerGeneration = useCallback(
    async (
      sessionId: string,
      leafId: string,
      historyNodes: MessageNode[],
      isCanvasMode: boolean,
      explicitContext: WeightedContextUnit[] = [],
    ) => {
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
        const assemblyResult = ContextAssemblyService.assembleWorldContext(
          registry,
          explicitContext,
          historyNodes[historyNodes.length - 1]?.text || 'User Query',
        );

        const knownUnits = assemblyResult.contextString;

        const historyText = historyNodes
          .map((m) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.text}`)
          .join('\n');

        const systemInstruction = `You are an expert world-builder and concept architect for the Ekrixi system.
            ${
              isCanvasMode
                ? `
            **CANVAS MODE ACTIVE:** You are currently editing a document on the right. 
            - Your chat output (left) should be a briefly professional confirmation (1-2 sentences).
            - You MUST wrap your actual document updates in a \`---CANVAS_START---\` and \`---CANVAS_END---\` block.
            - Inside the canvas block, provide the COMPLETE updated Markdown.
            - **CRITICAL LINK RULE:** In the CANVAS block, ONLY use the [[Entity Name]] syntax for entities that already exist in the provided Context. Do NOT use brackets for new or potential entities in the document block.
            `
                : `
            - Provide helpful, concept-rich advice.
            `
            }
            
            - CONTEXT:
            ${knownUnits || 'No units defined yet.'}
            
            - RULES:
            - ALWAYS use [[Title]] syntax in your CHAT responses to reference entities.
            - Be concise but high-fidelity.`;

        const fullText = await generateText(
          `Current Project Context:\n\n${historyText}\n\nAssistant:`,
          systemInstruction,
        );

        let currentText = '';
        const chars = fullText.split('');
        const chunkAmount = 35;
        const revealInterval = 40;

        const interval = setInterval(async () => {
          if (chars.length > 0) {
            const chunk = chars.splice(0, chunkAmount).join('');
            currentText += chunk;

            // Update chat state (filtering out the canvas block from the visible chat bubble)
            let visibleChatText = currentText;
            if (currentText.includes('---CANVAS_START---')) {
              const parts = currentText.split('---CANVAS_START---');
              visibleChatText = parts[0].trim();
            }

            setActiveSessionMessages((prev) => ({
              ...prev,
              [botId]: { ...prev[botId], text: visibleChatText },
            }));

            // If we have a complete canvas block, we can start pushing it (optimistic)
            if (
              currentText.includes('---CANVAS_START---') &&
              currentText.includes('---CANVAS_END---')
            ) {
              const canvasContent = currentText
                .split('---CANVAS_START---')[1]
                .split('---CANVAS_END---')[0]
                .trim();
              if (canvasContent) {
                // We don't push to Firestore here to avoid extreme writes,
                // but we could trigger a local side effect if needed.
              }
            }
          } else {
            clearInterval(interval);
            setIsLoading(false);

            // POST-PROCESS DUAL OUTPUT
            let finalChatText = currentText;
            let canvasUpdate: string | null = null;

            if (currentText.includes('---CANVAS_START---')) {
              const parts = currentText.split('---CANVAS_START---');
              finalChatText = parts[0].trim();
              if (parts[1].includes('---CANVAS_END---')) {
                canvasUpdate = parts[1].split('---CANVAS_END---')[0].trim();

                // FILTER: Only keep brackets for existing entities in the Canvas
                const existingTitles = new Set(
                  Object.values(registry)
                    .filter((obj) => !isLink(obj)) // Assuming isLink is defined elsewhere or a helper
                    .map((obj) => (obj as any).title),
                );

                canvasUpdate = canvasUpdate.replace(/\[\[(.*?)\]\]/g, (match, title) => {
                  return existingTitles.has(title) ? match : title;
                });
              }
            }

            // FINAL SAVE to Firestore for Chat
            await DataService.updateMessage(activeUniverseId, sessionId, botId, {
              text: finalChatText,
              isStreaming: false,
            });

            // If we have a canvas update, push it to the active canvas
            if (canvasUpdate && isCanvasMode) {
              const session = sessions.find((s) => s.id === sessionId);
              if (session) {
                const currentCanvases = session.canvases || [];
                let updatedCanvases;
                let activeId = session.activeCanvasId;

                if (currentCanvases.length === 0) {
                  // AUTO-CREATE if none exist
                  const newCanvas = {
                    id: generateId(),
                    title: 'Main Document',
                    content: canvasUpdate,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                  };
                  updatedCanvases = [newCanvas];
                  activeId = newCanvas.id;
                } else {
                  // Update existing
                  activeId = session.activeCanvasId || currentCanvases[0].id;
                  updatedCanvases = currentCanvases.map((c) =>
                    c.id === activeId
                      ? { ...c, content: canvasUpdate!, updatedAt: new Date().toISOString() }
                      : c,
                  );
                }

                await updateSession(sessionId, {
                  canvases: updatedCanvases,
                  activeCanvasId: activeId,
                });
              }
            }
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
    [
      registry,
      generateText,
      activeUniverseId,
      currentUser?.id,
      sessions,
      updateSession,
      isCanvasMode,
    ],
  );

  const sendMessage = useCallback(
    async (text: string, context?: WeightedContextUnit[]) => {
      if (import.meta.env.DEV) {
        console.log('[useUniverseChat] sendMessage sequence started:', {
          text,
          context,
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
            canvases: [],
            activeCanvasId: null,
            messageMap: {},
            rootNodeIds: [],
            selectedRootId: null,
            currentLeafId: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          await DataService.createChatSession(activeUniverseId, { ...initial, senderId: 'system' });
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

        const history = getThread({ ...tempSession, senderId: 'system' });
        triggerGeneration(sessionId, userMsgId, history, isCanvasMode, context);
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
      isCanvasMode,
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
        triggerGeneration(currentSessionId, newBranchId, history, isCanvasMode);
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
      isCanvasMode,
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
        triggerGeneration(currentSessionId, node.parentId, history, isCanvasMode);
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
      isCanvasMode,
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
        senderId: 'system',
        universeId: activeUniverseId,
        title: 'New Project',
        canvases: [],
        activeCanvasId: null,
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
    updateSession: async (id: string, updates: Partial<ChatSession>) => {
      if (!activeUniverseId) return;
      await DataService.updateChatSession(activeUniverseId, id, updates);
    },
    navigateBranch,
  };
};
