import { create } from 'zustand';

interface AppStore {
  currentNoteId: string | null;
  taskPanelOpen: boolean;
  settingsPanelOpen: boolean;
  commandPaletteOpen: boolean;
  selectedTags: string[];
  taskFilter: 'all' | 'active' | 'completed';

  setCurrentNote: (id: string | null) => void;
  toggleTaskPanel: () => void;
  setTaskPanelOpen: (open: boolean) => void;
  toggleSettingsPanel: () => void;
  setSettingsPanelOpen: (open: boolean) => void;
  toggleCommandPalette: () => void;
  setCommandPaletteOpen: (open: boolean) => void;
  addTagFilter: (tag: string) => void;
  removeTagFilter: (tag: string) => void;
  clearTagFilters: () => void;
  setTaskFilter: (filter: 'all' | 'active' | 'completed') => void;
}

export const useAppStore = create<AppStore>((set) => ({
  currentNoteId: null,
  taskPanelOpen: false,
  settingsPanelOpen: false,
  commandPaletteOpen: false,
  selectedTags: [],
  taskFilter: 'all',

  setCurrentNote: (id) => set({ currentNoteId: id }),

  toggleTaskPanel: () => set((state) => ({ taskPanelOpen: !state.taskPanelOpen })),

  setTaskPanelOpen: (open) => set({ taskPanelOpen: open }),

  toggleSettingsPanel: () => set((state) => ({ settingsPanelOpen: !state.settingsPanelOpen })),

  setSettingsPanelOpen: (open) => set({ settingsPanelOpen: open }),

  toggleCommandPalette: () => set((state) => ({
    commandPaletteOpen: !state.commandPaletteOpen
  })),

  setCommandPaletteOpen: (open) => set({ commandPaletteOpen: open }),

  addTagFilter: (tag) => set((state) => ({
    selectedTags: [...state.selectedTags, tag]
  })),

  removeTagFilter: (tag) => set((state) => ({
    selectedTags: state.selectedTags.filter(t => t !== tag)
  })),

  clearTagFilters: () => set({ selectedTags: [] }),

  setTaskFilter: (filter) => set({ taskFilter: filter }),
}));
