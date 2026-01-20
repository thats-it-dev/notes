import { create } from 'zustand';

interface AppStore {
  currentNoteId: string | null;
  authPanelOpen: boolean;
  commandPaletteOpen: boolean;

  setCurrentNote: (id: string | null) => void;
  toggleAuthPanel: () => void;
  setAuthPanelOpen: (open: boolean) => void;
  toggleCommandPalette: () => void;
  setCommandPaletteOpen: (open: boolean) => void;
}

export const useAppStore = create<AppStore>((set) => ({
  currentNoteId: null,
  authPanelOpen: false,
  commandPaletteOpen: false,

  setCurrentNote: (id) => set({ currentNoteId: id }),

  toggleAuthPanel: () => set((state) => ({ authPanelOpen: !state.authPanelOpen })),

  setAuthPanelOpen: (open) => set({ authPanelOpen: open }),

  toggleCommandPalette: () => set((state) => ({
    commandPaletteOpen: !state.commandPaletteOpen
  })),

  setCommandPaletteOpen: (open) => set({ commandPaletteOpen: open }),
}));
