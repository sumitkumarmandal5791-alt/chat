import React, { useState, useEffect } from 'react';
import { useLocation, Outlet } from 'react-router-dom';
import useThemeStore from '../store/themeStore';
import useLayoutStore from '../store/layoutStore';
import { useGroupStore } from '../store/groupStore';
import Sidebar from './SideBar';
import ChatWindow from '../page/chatSection/chatWindow';
import ChatList from '../page/chatSection/chatList';
import { getAllUsers } from '../services/user.services';

const Layout = () => {
    const selectedContact = useLayoutStore((state) => state.selectedContact);
    const setSelectedContact = useLayoutStore((state) => state.setSelectedContact);
    const activeGroup = useGroupStore((state) => state.activeGroup);
    const location = useLocation();
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
    const { theme } = useThemeStore();
    const [allUsers, setAllUsers] = useState([]);

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
    }, [theme]);

    useEffect(() => {
        const handleResize = () => {
            setIsMobile(window.innerWidth < 768);
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const getUsers = async () => {
        try {
            const result = await getAllUsers();
            if (result && result.users) {
                setAllUsers(result.users);
            }
        } catch (error) {
            console.error('Error fetching users:', error);
        }
    };

    useEffect(() => {
        getUsers();
    }, []);

    const isDark = theme === 'dark';
    const isChatRoute =
        location.pathname === '/homePage' ||
        location.pathname === '/homePage/' ||
        location.pathname === '/chat';

    return (
        <div
            className={`h-screen w-full overflow-hidden flex relative select-none ${
                isDark ? 'bg-[#0c1317] text-[#e9edef]' : 'bg-[#eae6df] text-[#111b21]'
            }`}
        >
            {/* Sidebar Rail on Desktop */}
            {!isMobile && <Sidebar />}

            <div className={`flex-1 flex overflow-hidden ${isMobile ? 'flex-col pb-14' : ''}`}>
                {isChatRoute ? (
                    <>
                        {/* Left Chat List Column */}
                        {(!isMobile || (!selectedContact && !activeGroup)) && (
                            <div className={`${isMobile ? 'flex-1 flex flex-col' : 'w-[380px] lg:w-[420px] shrink-0'} h-full overflow-hidden border-r ${isDark ? 'border-[#222d34]' : 'border-[#e9edef]'}`}>
                                <ChatList contacts={allUsers} setSelectedContact={setSelectedContact} />
                            </div>
                        )}

                        {/* Right Chat Window Column */}
                        {(!isMobile || selectedContact || activeGroup) && (
                            <div className="flex-1 h-full overflow-hidden flex flex-col">
                                <ChatWindow
                                    selectedContact={selectedContact}
                                    setSelectedContact={setSelectedContact}
                                    isMobile={isMobile}
                                    allContacts={allUsers}
                                />
                            </div>
                        )}
                    </>
                ) : (
                    <Outlet />
                )}
            </div>

            {/* Bottom Nav Bar on Mobile */}
            {isMobile && <Sidebar />}
        </div>
    );
};

export default Layout;
