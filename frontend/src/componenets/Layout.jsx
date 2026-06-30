import React, { useState, useEffect } from 'react';
import { useLocation, Outlet } from 'react-router-dom';
import useThemeStore from '../store/themeStore';
import useLayoutStore from '../store/layoutStore';
import Sidebar from './SideBar';
import { AnimatePresence, motion } from 'framer-motion';
import ChatWindow from '../page/chatSection/chatWindow';
import ChatList from "../page/chatSection/chatList"
import { getAllUsers } from '../services/user.services';

const Layout = ({ children, isThemeDialogOpen, toggleThemeDialog, isStatusPreviewOpen, statusPreviewContent }) => {
    const selectedContact = useLayoutStore(state => state.selectedContact);
    const setSelectedContact = useLayoutStore(state => state.setSelectedContact);
    const location = useLocation();
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
    const { theme, setTheme } = useThemeStore();
    const [allUsers, setAllUsers] = useState([])

    useEffect(() => {
        const handleResize = () => {
            setIsMobile(window.innerWidth < 768);
        };
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, []);

    const getUsers = async () => {
        try {
            const result = await getAllUsers();
            if (result && result.users) {
                setAllUsers(result.users);
            }
        }
        catch (error) {
            console.log(error)
        }
    }

    useEffect(() => {
        getUsers()
    }, []);


    return (
        <div className={`h-screen w-full overflow-hidden ${theme === 'dark' ? "bg-[#111b21] text-white" : "bg-gray-100 text-black"} flex relative`}>
            {/* Sidebar for Desktop */}
            {!isMobile && <Sidebar />}

            <div
                className={`flex-1 flex overflow-hidden ${isMobile ? "flex-col pb-16" : ""}`}>
                {location.pathname === '/homePage' || location.pathname === '/homePage/' || location.pathname === '/chat' ? (
                    <AnimatePresence initial={false}>
                        {(!isMobile || !selectedContact) && (
                            <div className={`${isMobile ? "flex-1 flex flex-col" : "w-96 lg:w-[400px] xl:w-[420px] flex-shrink-0"} h-full overflow-hidden`}>
                                <motion.div
                                    key="chatlist"
                                    initial={{ opacity: 0, x: isMobile ? "-100%" : 0 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: "-100%" }}
                                    transition={{ type: "tween" }}
                                    className="w-full h-full"
                                >
                                    <ChatList contacts={allUsers} setSelectedContact={setSelectedContact} />
                                </motion.div>
                            </div>
                        )}
                        {(!isMobile || selectedContact) && (
                            <div className="flex-1 h-full overflow-hidden">
                                <motion.div
                                    key="chatWindow"
                                    initial={{ opacity: 0, x: isMobile ? "-100%" : 0 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: "-100%" }}
                                    transition={{ type: "tween" }}
                                    className="w-full h-full"
                                >
                                    <ChatWindow
                                        selectedContact={selectedContact}
                                        setSelectedContact={setSelectedContact}
                                        isMobile={isMobile}
                                    />
                                </motion.div>
                            </div>
                        )}
                    </AnimatePresence>
                ) : (
                    <Outlet />
                )}
            </div>

            {isMobile && <Sidebar />}
            {/* Theme Dialog Modal */}
            {isThemeDialogOpen && (
                <div className='fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50'>
                    <div className={`${theme === 'dark' ? "bg-[#202c33] text-white" : "bg-white text-black"} p-6 rounded-lg max-w-sm w-full`}>
                        <h2 className='text-2xl font-semibold mb-4'>Choose a theme</h2>
                        <div className='space-y-4'>
                            <label className='flex items-center space-x-3 cursor-pointer'>
                                <input
                                    type='radio'
                                    value='light'
                                    checked={theme === 'light'}
                                    onChange={() => setTheme("light")}
                                    className='from-radio text-blue-600'
                                />
                                <span>Light</span>
                            </label>
                            <label className='flex items-center space-x-3 cursor-pointer'>
                                <input
                                    type='radio'
                                    value='dark'
                                    checked={theme === 'dark'}
                                    onChange={() => setTheme("dark")}
                                    className='from-radio text-blue-600'
                                />
                                <span>Dark</span>
                            </label>
                        </div>
                        <button
                            onClick={toggleThemeDialog}
                            className='mt-6 w-full bg-blue-500 text-white py-2 rounded hover:bg-blue-600 transition duration-200'
                        >
                            Close
                        </button>
                    </div>
                </div>
            )}
            {/* Status Preview Modal */}
            {isStatusPreviewOpen && (
                <div className='fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50'>
                    {statusPreviewContent}
                </div>
            )}
        </div>
    );
};

export default Layout;