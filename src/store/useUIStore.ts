import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ThemeMode = 'modern' | 'legacy' | 'vanilla-dark' | 'vanilla-light';

interface UIState {
  theme: ThemeMode;
  selectedNoteId: string | null;
  pendingScanText: string;
  integrityFocus: { linkId: string; path?: string[]; mode: 'CENTER' | 'DRILL' } | null;

  // Actions
  setTheme: (theme: ThemeMode) => void;
  setSelectedNoteId: (id: string | null) => void;
  setPendingScanText: (text: string) => void;
  setIntegrityFocus: (
    focus: { linkId: string; path?: string[]; mode: 'CENTER' | 'DRILL' } | null,
  ) => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      theme: 'vanilla-light', // Default
      selectedNoteId: null,
      pendingScanText: '',
      integrityFocus: null,

      setTheme: (theme) => set({ theme }),
      setSelectedNoteId: (id) => set({ selectedNoteId: id }),
      setPendingScanText: (text) => set({ pendingScanText: text }),
      setIntegrityFocus: (focus) => set({ integrityFocus: focus }),
    }),
    {
      name: 'nexus-ui-storage',
      partialize: (state) => ({ theme: state.theme }), // Only persist theme, not transient UI state
    },
  ),
);
