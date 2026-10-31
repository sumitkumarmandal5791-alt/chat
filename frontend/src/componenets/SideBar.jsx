import React, { useEffect, useState } from "react";
import { useLocation, Link } from "react-router-dom";
import { MessageSquare, CircleDashed, User, Settings } from "lucide-react";
import useLayoutStore from "../store/layoutStore";
import useThemeStore from "../store/themeStore";
import useuserStore from "../store/useruserStore";
import { useStatusStore } from "../store/statusStore";

const SideBar = () => {
    const location = useLocation();
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
    const { theme } = useThemeStore();
    const { user } = useuserStore();
    const { activeTab, setActiveTab, selectedContact } = useLayoutStore();
    const hasUnviewed = useStatusStore((state) => state.hasUnviewed);

    const isDark = theme === "dark";

    useEffect(() => {
        const handleResize = () => {
            setIsMobile(window.innerWidth < 768);
        };
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, []);

    useEffect(() => {
        if (location.pathname === "/homePage" || location.pathname === "/homePage/" || location.pathname === "/chat") {
            setActiveTab("chats");
        } else if (location.pathname === "/status") {
            setActiveTab("status");
        } else if (location.pathname === "/userDetail") {
            setActiveTab("userDetail");
        } else if (location.pathname === "/setting") {
            setActiveTab("setting");
        }
    }, [location, setActiveTab]);

    if (isMobile && selectedContact) {
        return null;
    }

    const navItems = [
        {
            id: "chats",
            to: "/homePage",
            icon: MessageSquare,
            label: "Chats",
            badge: false
        },
        {
            id: "status",
            to: "/status",
            icon: CircleDashed,
            label: "Status",
            badge: hasUnviewed
        },
        {
            id: "setting",
            to: "/setting",
            icon: Settings,
            label: "Settings",
            badge: false
        }
    ];

    return (
        <aside
            aria-label="Navigation Rail"
            className={`${
                isMobile
                    ? "fixed bottom-0 left-0 right-0 h-14 z-40 border-t flex flex-row justify-around items-center px-4 pb-[env(safe-area-inset-bottom)]"
                    : "w-16 h-screen border-r flex flex-col justify-between items-center py-4 shrink-0 z-20"
            } ${
                isDark
                    ? "bg-[#202c33] border-[#222d34] text-[#8696a0]"
                    : "bg-[#f0f2f5] border-[#e9edef] text-[#54656f]"
            } transition-colors duration-150 select-none`}
        >
            {/* Main Navigation Icons */}
            <nav className={`flex ${isMobile ? "flex-row w-full justify-around items-center" : "flex-col gap-2 items-center"}`}>
                {navItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = activeTab === item.id;

                    return (
                        <Link
                            key={item.id}
                            to={item.to}
                            aria-label={item.label}
                            title={item.label}
                            className={`relative p-2.5 rounded-full transition-colors duration-150 flex items-center justify-center ${
                                isActive
                                    ? isDark
                                        ? "bg-[#374248] text-[#00a884]"
                                        : "bg-[#e9edef] text-[#00a884]"
                                    : isDark
                                    ? "hover:bg-[#2a3942] hover:text-[#d1d7db]"
                                    : "hover:bg-[#e9edef] hover:text-[#111b21]"
                            }`}
                        >
                            <Icon size={20} strokeWidth={isActive ? 2.3 : 1.8} />

                            {/* Unviewed Status notification dot */}
                            {item.badge && (
                                <span className="absolute top-2 right-2 w-2 h-2 bg-[#00a884] rounded-full ring-2 ring-[#202c33]" />
                            )}
                        </Link>
                    );
                })}
            </nav>

            {/* Bottom Profile Avatar on Desktop */}
            {!isMobile && (
                <Link
                    to="/userDetail"
                    aria-label="Profile"
                    title={user?.username || "Profile"}
                    className="p-0.5 rounded-full hover:ring-2 hover:ring-[#00a884] transition-all"
                >
                    <img
                        src={user?.profilePicture || "https://via.placeholder.com/40"}
                        alt={user?.username || "User avatar"}
                        className="w-8 h-8 rounded-full object-cover"
                    />
                </Link>
            )}
        </aside>
    );
};

export default SideBar;
