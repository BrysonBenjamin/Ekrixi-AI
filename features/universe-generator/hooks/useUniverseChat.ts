
import { useState, useEffect, useCallback, useMemo } from 'react';
import { GoogleGenAI } from "@google/genai";
import { ChatSession, MessageNode } from '../types';
import { generateId } from '../../../utils/ids';
import { NexusObject, isLink } from '../../../types';

const STORAGE_KEY = 'ekrixi_nexus_chats';

export const useUniverseChat = (registry: Record<string, NexusObject>) => {
    // Persistent initial state
    const [sessions, setSessions] = useState<ChatSession[]>(() => {
        const saved = localStorage.getItem(STORAGE_KEY);
        try {
            return saved ? JSON.parse(saved) : [];
        } catch (e) {
            console.error("Failed to parse saved sessions", e);
            return [];
        }
    });
    const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    // Persistence Effect
    useEffect(() => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
    }, [sessions]);

    // Initial session creation if empty
    useEffect(() => {
        if (sessions.length === 0 && !isLoading) {
            const newId = generateId();
            const initial: ChatSession = {
                id: newId,
                title: 'New Project',
                messageMap: {},
                rootNodeIds: [],
                selectedRootId: null,
                currentLeafId: null,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };
            setSessions([initial]);
            setCurrentSessionId(newId);
        } else if (sessions.length > 0 && !currentSessionId) {
            // Default to most recent session
            setCurrentSessionId(sessions[0].id);
        }
    }, [sessions.length, isLoading, currentSessionId]);

    const currentSession = useMemo(() => 
        sessions.find(s => s.id === currentSessionId), 
        [sessions, currentSessionId]
    );

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

    const triggerGeneration = useCallback(async (sessionId: string, leafId: string, historyNodes: MessageNode[]) => {
        setIsLoading(true);
        const botId = generateId();
        const timestamp = new Date().toISOString();

        setSessions(prev => prev.map(s => {
            if (s.id !== sessionId) return s;
            const leafNode = s.messageMap[leafId];
            if (!leafNode) return s;
            const botNode: MessageNode = {
                id: botId,
                role: 'model',
                text: '', 
                parentId: leafId,
                childrenIds: [],
                selectedChildId: null,
                createdAt: timestamp,
                isStreaming: true
            };
            const updatedLeaf = { ...leafNode, childrenIds: [...leafNode.childrenIds, botId], selectedChildId: botId };
            const newMap = { ...s.messageMap, [leafId]: updatedLeaf, [botId]: botNode };
            return { ...s, messageMap: newMap, currentLeafId: botId, updatedAt: timestamp };
        }));

        try {
            const knownUnits = (Object.values(registry) as NexusObject[])
                .filter(o => !isLink(o))
                .map(o => `- ${(o as any).title}: ${(o as any).gist}`)
                .join('\n');

            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const historyText = historyNodes.map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.text}`).join('\n');
            
            const response = await ai.models.generateContent({
                model: 'gemini-3-flash-preview',
                config: {
                    systemInstruction: `You are a professional world-building consultant and concept architect. 
                    - CONTEXT AWARENESS: You have access to the existing Knowledge Graph. 
                    - EXISTING_UNITS:
                    ${knownUnits || "No units defined yet."}
                    
                    - GOAL: Help the user brainstorm and refine lore. If they mention an existing unit (using @ or name), use the data above.
                    - Tone: Conversational, helpful, direct. 
                    - Style: Use Markdown.
                    - Interaction: Ask one targeted question at the end to help establish a new unit.`
                },
                contents: [{ parts: [{ text: `Current Project Context:\n\n${historyText}\n\nAssistant:` }] }],
            });

            const fullText = response.text || "I'm sorry, I couldn't generate a response. Please try again.";
            
            let currentText = "";
            const chars = fullText.split("");
            const revealInterval = 1; 
            const chunkAmount = 30;   

            const interval = setInterval(() => {
                if (chars.length > 0) {
                    const chunk = chars.splice(0, chunkAmount).join("");
                    currentText += chunk;
                    setSessions(prev => prev.map(s => {
                        if (s.id !== sessionId) return s;
                        const node = s.messageMap[botId];
                        if (!node) return s;
                        return { ...s, messageMap: { ...s.messageMap, [botId]: { ...node, text: currentText } } };
                    }));
                } else {
                    clearInterval(interval);
                    setSessions(prev => prev.map(s => {
                        if (s.id !== sessionId) return s;
                        const node = s.messageMap[botId];
                        if (!node) return s;
                        return { ...s, messageMap: { ...s.messageMap, [botId]: { ...node, isStreaming: false } } };
                    }));
                    setIsLoading(false);
                }
            }, revealInterval);

        } catch (error) {
            console.error("Generation failed:", error);
            setSessions(prev => prev.map(s => {
                if (s.id !== sessionId) return s;
                const node = s.messageMap[botId];
                if (!node) return s;
                return { ...s, messageMap: { ...s.messageMap, [botId]: { ...node, text: "The connection was interrupted. Please check your credentials and try again.", isStreaming: false, isError: true } } };
            }));
            setIsLoading(false);
        }
    }, [registry]);

    const sendMessage = useCallback(async (text: string) => {
        if (!currentSessionId || isLoading) return;
        const userMsgId = generateId();
        const timestamp = new Date().toISOString();

        let updatedHistory: MessageNode[] = [];
        setSessions(prev => {
            const sessionsCopy = [...prev];
            const sessionIdx = sessionsCopy.findIndex(s => s.id === currentSessionId);
            if (sessionIdx === -1) return prev;

            const s = sessionsCopy[sessionIdx];
            const newNode: MessageNode = {
                id: userMsgId,
                role: 'user',
                text,
                parentId: s.currentLeafId,
                childrenIds: [],
                selectedChildId: null,
                createdAt: timestamp
            };

            const newMap = { ...s.messageMap, [userMsgId]: newNode };
            const rootNodeIds = [...(s.rootNodeIds || [])];
            let selectedRootId = s.selectedRootId;

            if (s.currentLeafId && newMap[s.currentLeafId]) {
                const parent = newMap[s.currentLeafId];
                newMap[s.currentLeafId] = { ...parent, childrenIds: [...parent.childrenIds, userMsgId], selectedChildId: userMsgId };
            } else {
                rootNodeIds.push(userMsgId);
                selectedRootId = userMsgId;
            }

            const updatedSession: ChatSession = { 
                ...s, 
                title: (rootNodeIds.length > 1 || (s.rootNodeIds && s.rootNodeIds.length > 0)) ? s.title : text.slice(0, 30), 
                messageMap: newMap, 
                rootNodeIds,
                selectedRootId,
                currentLeafId: userMsgId,
                updatedAt: timestamp 
            };
            sessionsCopy[sessionIdx] = updatedSession;
            updatedHistory = getThread(updatedSession);
            return sessionsCopy;
        });

        if (updatedHistory.length > 0) {
            triggerGeneration(currentSessionId, userMsgId, updatedHistory);
        }
    }, [currentSessionId, isLoading, getThread, triggerGeneration]);

    const editMessage = useCallback(async (nodeId: string, newText: string) => {
        if (!currentSessionId || isLoading) return;
        
        const session = sessions.find(s => s.id === currentSessionId);
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
            createdAt: timestamp
        };

        const newMap = { ...session.messageMap, [newBranchId]: newNode };
        let rootNodeIds = [...(session.rootNodeIds || [])];
        let selectedRootId = session.selectedRootId;

        if (originalNode.parentId && newMap[originalNode.parentId]) {
            const parent = newMap[originalNode.parentId];
            newMap[originalNode.parentId] = { 
                ...parent, 
                childrenIds: [...parent.childrenIds, newBranchId], 
                selectedChildId: newBranchId 
            };
        } else {
            rootNodeIds.push(newBranchId);
            selectedRootId = newBranchId;
        }

        const updatedSession = { 
            ...session, 
            messageMap: newMap, 
            rootNodeIds, 
            selectedRootId, 
            currentLeafId: newBranchId, 
            updatedAt: timestamp 
        };
        const updatedHistory = getThread(updatedSession);

        setSessions(prev => prev.map(s => s.id === currentSessionId ? updatedSession : s));

        if (originalNode.role === 'user') {
            triggerGeneration(currentSessionId, newBranchId, updatedHistory);
        }
    }, [currentSessionId, isLoading, sessions, getThread, triggerGeneration]);

    const regenerate = useCallback(async (nodeId: string) => {
        if (!currentSessionId || isLoading) return;
        const session = sessions.find(s => s.id === currentSessionId);
        if (!session) return;
        const node = session.messageMap[nodeId];
        if (!node) return;
        
        if (node.role === 'user') {
            editMessage(nodeId, node.text);
        } else if (node.role === 'model' && node.parentId) {
            const history = getThread({ ...session, currentLeafId: node.parentId });
            triggerGeneration(currentSessionId, node.parentId, history);
        }
    }, [currentSessionId, isLoading, sessions, editMessage, getThread, triggerGeneration]);

    const navigateBranch = useCallback((nodeId: string, direction: 'prev' | 'next') => {
        setSessions(prev => prev.map(s => {
            if (s.id !== currentSessionId) return s;
            const node = s.messageMap[nodeId];
            if (!node) return s;

            let newActiveId = '';
            const newMap = { ...s.messageMap };
            let newRootIds = s.rootNodeIds;
            let newSelectedRoot = s.selectedRootId;

            if (node.parentId && s.messageMap[node.parentId]) {
                const parent = s.messageMap[node.parentId];
                const currentIndex = parent.childrenIds.indexOf(nodeId);
                const nextIndex = direction === 'prev' ? currentIndex - 1 : currentIndex + 1;
                if (nextIndex >= 0 && nextIndex < parent.childrenIds.length) {
                    const targetId = parent.childrenIds[nextIndex];
                    newMap[parent.id] = { ...parent, selectedChildId: targetId };
                    newActiveId = findLatestLeaf(targetId, newMap);
                }
            } else {
                const currentIndex = s.rootNodeIds.indexOf(nodeId);
                const nextIndex = direction === 'prev' ? currentIndex - 1 : currentIndex + 1;
                if (nextIndex >= 0 && nextIndex < s.rootNodeIds.length) {
                    const targetId = s.rootNodeIds[nextIndex];
                    newSelectedRoot = targetId;
                    newActiveId = findLatestLeaf(targetId, newMap);
                }
            }

            if (!newActiveId) return s;
            return { ...s, messageMap: newMap, selectedRootId: newSelectedRoot, currentLeafId: newActiveId };
        }));
    }, [currentSessionId]);

    const findLatestLeaf = (startNodeId: string, map: Record<string, MessageNode>): string => {
        let currentId = startNodeId;
        while (true) {
            const node = map[currentId];
            if (!node || node.childrenIds.length === 0) return currentId;
            currentId = node.selectedChildId || node.childrenIds[node.childrenIds.length - 1];
        }
    };

    const thread = useMemo(() => {
        return currentSession ? getThread(currentSession) : [];
    }, [currentSession, getThread]);

    return {
        sessions,
        currentSessionId,
        currentSession,
        thread,
        isLoading,
        createSession: () => {
            const newId = generateId();
            const session: ChatSession = { id: newId, title: 'New Project', messageMap: {}, rootNodeIds: [], selectedRootId: null, currentLeafId: null, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
            setSessions(prev => [session, ...prev]);
            setCurrentSessionId(newId);
        },
        deleteSession: (id: string) => {
            setSessions(prev => prev.filter(s => s.id !== id));
            if (currentSessionId === id) setCurrentSessionId(null);
        },
        selectSession: setCurrentSessionId,
        sendMessage,
        editMessage,
        regenerate,
        navigateBranch
    };
};
