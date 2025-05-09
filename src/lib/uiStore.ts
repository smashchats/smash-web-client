import { create } from 'zustand';

interface UIState {
    showBottomNav: boolean;
    setShowBottomNav: (show: boolean) => void;
}

export const useUIStore = create<UIState>((set) => ({
    showBottomNav: true,
    setShowBottomNav: (show) => set({ showBottomNav: show }),
}));
