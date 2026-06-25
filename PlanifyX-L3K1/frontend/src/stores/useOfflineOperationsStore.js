import { create } from "zustand";
import { getOfflineSales } from "../utils/offlineDb";

export const useOfflineOperationsStore = create((set) => ({
  offlineOperationsCount: 0,

  setOfflineOperationsCount: (count) =>
    set({ offlineOperationsCount: count }),

  refreshOfflineOperationsCount: async () => {
    try {
      const sales = await getOfflineSales();
      set({ offlineOperationsCount: sales.length });
    } catch (error) {
      console.error("Impossible de charger le compteur des opérations hors-ligne :", error);
      set({ offlineOperationsCount: 0 });
    }
  },
}));