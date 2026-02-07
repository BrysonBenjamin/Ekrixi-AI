import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { FirestoreService } from '../core/services/FirestoreService';

export interface UniverseMetadata {
  id: string;
  name: string;
  description?: string;
  nodeCount: number;
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
        set({ isLoadingUniverses: true });
        const unsubscribe = FirestoreService.listenToUniverses((universesData) => {
          // Map Firestore data to UniverseMetadata
          const universes = universesData.map((u) => ({
            id: u.id,
            name: u.name,
            description: u.description,
            nodeCount: u.nodeCount || 0,
            lastActive: u.lastActive,
            createdAt: u.createdAt,
            ownerId: u.ownerId,
          })) as UniverseMetadata[];

          set((state) => {
            // If we have no active universe and universes exist, select first?
            // Or keep null and let UI force selection/creation.
            // For now, if activeUniverseId is set but not in list (deleted?), unset it.
            let newActive = state.activeUniverseId;
            if (newActive && !universes.find((u) => u.id === newActive)) {
              newActive = universes.length > 0 ? universes[0].id : null;
            }
            // If no active and we have universes, select one?
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
        const id = await FirestoreService.createUniverse(name, description || '', user?.id || '');
        // Listener will update state
        set({ activeUniverseId: id });
        return id;
      },

      setActiveUniverse: (id) =>
        set((state) => {
          if (!state.universes.find((u) => u.id === id)) return state;
          // TODO: Update 'lastActive' in Firestore?
          // For now just local state switch.
          return { activeUniverseId: id };
        }),

      deleteUniverse: async (id) => {
        await FirestoreService.deleteUniverse(id);
        // Listener handles state update
      },

      updateUniverseMeta: (id, updates) => {
        // This was used for nodeCount updates.
        // We probably want to push this to Firestore if it's critical,
        // OR just keep it local/optimistic for node counts until a proper counter is implemented.
        set((state) => ({
          universes: state.universes.map((u) => (u.id === id ? { ...u, ...updates } : u)),
        }));
      },

      setUser: (user, token) => set({ currentUser: user, authToken: token }),

      setApiKey: (service, key) =>
        set((state) => ({
          apiKeys: { ...state.apiKeys, [service]: key },
        })),

      registerUniverse: (meta) => {
        // Legacy/Import support.
        // If importing a universe, we should probably save it to Firestore?
        // For now, just add to local state to allow viewing?
        // Or strictly push to DB. Let's push to DB to be consistent.
        FirestoreService.importUniverse(
          meta.id,
          meta.name,
          meta.description || '',
          meta.ownerId || '',
        );
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
