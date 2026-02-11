import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { DataService } from '../core/services/DataService';

export interface UniverseMetadata {
  id: string;
  name: string;
  description?: string;
  type?: 'CREATIVE' | 'ACADEMIC' | 'CONSULTING';
  nodeCount: number;
  chatCount: number;
  lastActive: string;
  createdAt: string;
  ownerId?: string;
}

export interface UserProfile {
  email: string;
  name: string;
  picture?: string;
  id: string;
}

interface SessionState {
  universes: UniverseMetadata[];
  activeUniverseId: string | null;
  isLoadingUniverses: boolean;

  // Auth State
  currentUser: UserProfile | null;
  authToken: string | null;
  apiKeys: {
    gemini?: string;
  };

  // Actions
  initializeUniversesListener: () => () => void;
  createUniverse: (name: string, description?: string) => Promise<string>;
  setActiveUniverse: (id: string) => void;
  deleteUniverse: (id: string) => Promise<void>;
  updateUniverseMeta: (id: string, updates: Partial<UniverseMetadata>) => void; // Local opt-update or DB update?

  // Auth Actions
  setUser: (user: UserProfile | null, token: string | null) => void;
  setApiKey: (service: 'gemini', key: string) => void;

  // Internal use for import flow
  registerUniverse: (meta: UniverseMetadata) => void;
}

export const useSessionStore = create<SessionState>()(
  persist(
    (set, get) => ({
      universes: [],
      activeUniverseId: null, // Start null, let UI or listener decide
      isLoadingUniverses: false,
      currentUser: null,
      authToken: null,
      apiKeys: {},

      initializeUniversesListener: () => {
        const userId = get().currentUser?.id;
        if (!userId) {
          console.warn('[SessionStore] Skipping universe listener: No user ID available.');
          return () => {};
        }

        set({ isLoadingUniverses: true });

        // Track initial load to trigger default creation only once
        let isInitialLoad = true;

        const unsubscribe = DataService.listenToUniverses(userId, async (universesData) => {
          // Map Firestore data to UniverseMetadata
          const universes = universesData.map((u) => ({
            id: u.id,
            name: u.name,
            description: u.description,
            nodeCount: u.nodeCount || 0,
            chatCount: u.chatCount || 0,
            lastActive: u.lastActive,
            createdAt: u.createdAt,
            ownerId: u.ownerId,
          })) as UniverseMetadata[];

          // Handle "New Account" initialization
          if (universes.length === 0 && isInitialLoad) {
            isInitialLoad = false; // Prevent multiple creation attempts
            console.log('[SessionStore] No universes found for user. Creating default...');
            try {
              await DataService.createUniverse(
                'Primal Nexus',
                'Your initial playground for knowledge synthesis.',
                userId,
              );
            } catch (err) {
              console.error('[SessionStore] Failed to create default universe:', err);
            }
            return;
          }

          isInitialLoad = false;
          set((state) => {
            let newActive = state.activeUniverseId;
            if (newActive && !universes.find((u) => u.id === newActive)) {
              newActive = universes.length > 0 ? universes[0].id : null;
            }
            if (!newActive && universes.length > 0) {
              newActive = universes[0].id;
            }

            return { universes, isLoadingUniverses: false, activeUniverseId: newActive };
          });
        });
        return unsubscribe;
      },

      createUniverse: async (name, description) => {
        const user = get().currentUser;
        if (!user?.id) throw new Error('Cannot create universe: Not authenticated');

        try {
          const id = await DataService.createUniverse(name, description || '', user.id);
          set({ activeUniverseId: id });
          return id;
        } catch (err) {
          console.error('[SessionStore] createUniverse failed:', err);
          throw err;
        }
      },

      setActiveUniverse: (id) => {
        const state = get();
        if (!state.universes.find((u) => u.id === id)) return;

        set({ activeUniverseId: id });

        // Update lastActive in DB (side effect outside of set)
        DataService.updateUniverseMeta(id, { lastActive: new Date().toISOString() }).catch((err) =>
          console.warn('[SessionStore] Failed to update lastActive:', err),
        );
      },

      deleteUniverse: async (id) => {
        try {
          await DataService.deleteUniverse(id);
        } catch (err) {
          console.error('[SessionStore] deleteUniverse failed:', err);
          throw err;
        }
      },

      updateUniverseMeta: async (id, updates) => {
        // Update local state for immediate feedback
        set((state) => ({
          universes: state.universes.map((u) => (u.id === id ? { ...u, ...updates } : u)),
        }));

        // Persist to DB
        try {
          await DataService.updateUniverseMeta(id, updates);
        } catch (err) {
          console.error('[SessionStore] updateUniverseMeta failed:', err);
          // Rollback local state if critical? For now just log.
        }
      },

      setUser: (user, token) => set({ currentUser: user, authToken: token }),

      setApiKey: (service, key) =>
        set((state) => ({
          apiKeys: { ...state.apiKeys, [service]: key },
        })),

      registerUniverse: (meta) => {
        DataService.importUniverse(meta.id, meta.name, meta.description || '', meta.ownerId || '');
      },
    }),
    {
      name: 'nexus-session-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        // We DO persist universes to show them while loading
        universes: state.universes,
        activeUniverseId: state.activeUniverseId,
        currentUser: state.currentUser,
        authToken: state.authToken,
        apiKeys: state.apiKeys,
      }),
    },
  ),
);
