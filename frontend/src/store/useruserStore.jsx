import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

const userUserStore = create(
    persist(
        (set) => ({
            user: null,
            isAuthenticated: false,
            setUser: (user) => {
                set({ user, isAuthenticated: true });
            },
            clearuser: () => {
                set({ user: null, isAuthenticated: false });
            },
        }),
        {
            name: "user-user-store",
            getStorage: () => localStorage
            //storage: createJSONStorage(() => localStorage),
        }
    )
);

export default userUserStore;