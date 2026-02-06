import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { generateId } from '../utils/ids';

export interface UniverseMetadata {
  id: string;
  name: string;
  description?: string;
  nodeCount: number;
  lastActive: string;
  createdAt: string;
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

  // Auth State
  currentUser: UserProfile | null;
  authToken: string | null;
  apiKeys: {
    gemini?: string;
  };

  // Actions
  createUniverse: (name: string, description?: string) => string;
  setActiveUniverse: (id: string) => void;
  deleteUniverse: (id: string) => void;
  updateUniverseMeta: (id: string, updates: Partial<UniverseMetadata>) => void;

  // Auth Actions
  setUser: (user: UserProfile | null, token: string | null) => void;
  setApiKey: (service: 'gemini', key: string) => void;

  // Internal use for import flow
  registerUniverse: (meta: UniverseMetadata) => void;
}

const DEFAULT_UNIVERSE_ID = 'default';

export const useSessionStore = create<SessionState>()(
  persist(
    (set, _get) => ({
      universes: [
        {
          id: DEFAULT_UNIVERSE_ID,
          name: 'Default Universe',
          description: 'Main registry',
          nodeCount: 0,
          lastActive: new Date().toISOString(),
          createdAt: new Date().toISOString(),
        },
      ],
      activeUniverseId: DEFAULT_UNIVERSE_ID,
      currentUser: null,
      authToken: null,
      apiKeys: {},

      createUniverse: (name, description) => {
        const id = generateId();
        const newUniverse: UniverseMetadata = {
          id,
          name,
          description,
          nodeCount: 0,
          lastActive: new Date().toISOString(),
          createdAt: new Date().toISOString(),
        };
        set((state) => ({
          universes: [...state.universes, newUniverse],
          activeUniverseId: id,
        }));
        return id;
      },

      setActiveUniverse: (id) =>
        set((state) => {
          if (!state.universes.find((u) => u.id === id)) return state;
          const updatedUniverses = state.universes.map((u) =>
            u.id === id ? { ...u, lastActive: new Date().toISOString() } : u,
          );
          return { activeUniverseId: id, universes: updatedUniverses };
        }),

      deleteUniverse: (id) =>
        set((state) => {
          if (state.universes.length <= 1) return state; // Prevent deleting last universe
          const newUniverses = state.universes.filter((u) => u.id !== id);
          // If we deleted the active one, switch to the first available
          const newActive =
            state.activeUniverseId === id ? newUniverses[0].id : state.activeUniverseId;
          return { universes: newUniverses, activeUniverseId: newActive };
        }),

      updateUniverseMeta: (id, updates) =>
        set((state) => ({
          universes: state.universes.map((u) => (u.id === id ? { ...u, ...updates } : u)),
        })),

      setUser: (user, token) => set({ currentUser: user, authToken: token }),

      setApiKey: (service, key) =>
        set((state) => ({
          apiKeys: { ...state.apiKeys, [service]: key },
        })),

      registerUniverse: (meta) =>
        set((state) => {
          const exists = state.universes.find((u) => u.id === meta.id);
          if (exists) return state;
          return { universes: [...state.universes, meta] };
        }),
    }),
    {
      name: 'nexus-session-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        universes: state.universes,
        activeUniverseId: state.activeUniverseId,
        currentUser: state.currentUser, // Persist user
        // We typically DO persist tokens in local-first apps if we want "Remember Me",
        // but security-wise it's a tradeoff. For this MVP, we persist it (Implicit Flow token).
        // Note: Google Access Tokens expire in 1hr. Logic to handle expiry is needed,
        // or we just accept user has to re-login if token is invalid.
        authToken: state.authToken,
        apiKeys: state.apiKeys, // Persist API keys
      }),
    },
  ),
);
