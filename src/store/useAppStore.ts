import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AppState {
    activeBlockId: number | null;
    setActiveBlockId: (id: number | null) => void;
}

export const useAppStore = create<AppState>()(
    persist(
        (set) => ({
            activeBlockId: null,
            setActiveBlockId: (id) => set({ activeBlockId: id }),
        }),
        {
            name: 'evogym-storage',
        }
    )
);
