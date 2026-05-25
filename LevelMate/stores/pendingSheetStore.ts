import { create } from 'zustand';

interface PendingSheetStore {
  isOpen: boolean;
  open: () => void;
  close: () => void;
}

export const usePendingSheetStore = create<PendingSheetStore>((set) => ({
  isOpen: false,
  open: () => set({ isOpen: true }),
  close: () => set({ isOpen: false }),
}));
