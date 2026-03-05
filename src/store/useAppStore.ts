import { create } from 'zustand';

interface AppState {
    activeBlockId: number | null;
    setActiveBlockId: (id: number | null) => void;
    // We can add more global UI state here (like a loading flag, or menu toggle)
}

export const useAppStore = create<AppState>((set) => ({
    activeBlockId: null,
    setActiveBlockId: (id) => set({ activeBlockId: id }),
}));
