import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

const useLayoutStore = create(
    persist(
        (set) => ({
            activeTab: "chats",
            selectedContact: null,
            setActiveTab: (tab) => set({ activeTab: tab }),
            setSelectedContact: (contact) => set({ selectedContact: contact }),
        }),
        {
            name: "layout-storage",
            storage: createJSONStorage(() => localStorage),
        }
    )
);

export default useLayoutStore;