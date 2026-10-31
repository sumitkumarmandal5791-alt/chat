import React, { useState, useEffect } from 'react';
import {
    Moon,
    Sun,
    Bell,
    Lock,
    Shield,
    MessageSquare,
    HelpCircle,
    HardDrive,
    LogOut,
    ChevronRight,
    ArrowLeft,
    User as UserIcon,
    X
} from 'lucide-react';
import useuserStore from '../../store/useruserStore';
import useThemeStore from '../../store/themeStore';
import { useNavigate } from 'react-router-dom';
import StatusPrivacy from './StatusPrivacy';
import { toast } from 'react-toastify';

const Setting = ({ onBack }) => {
    const { user, clearuser } = useuserStore();
    const { theme, setTheme } = useThemeStore();
    const navigate = useNavigate();

    const [view, setView] = useState('main'); // 'main' | 'status-privacy'
    const [showLogoutModal, setShowLogoutModal] = useState(false);
    const [showThemeModal, setShowThemeModal] = useState(false);

    const isDark = theme === 'dark';

    // Synchronize HTML data-theme attribute
    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
    }, [theme]);

    if (!user) return null;

    if (view === 'status-privacy') {
        return <StatusPrivacy onBack={() => setView('main')} />;
    }

    const handleConfirmLogout = () => {
        clearuser();
        navigate('/login');
    };

    return (
        <div
            className={`w-full h-full flex flex-col select-none transition-colors duration-150 ${
                isDark ? 'bg-[#111b21] text-[#e9edef]' : 'bg-[#f0f2f5] text-[#111b21]'
            }`}
        >
            {/* 1. HEADER (108px green accent header on WhatsApp Web) */}
            <div
                className={`h-24 px-6 pb-4 flex items-end shrink-0 ${
                    isDark ? 'bg-[#202c33]' : 'bg-[#008069]'
                } text-white`}
            >
                <div className="flex items-center gap-6">
                    {onBack && (
                        <button
                            onClick={onBack}
                            aria-label="Back"
                            className="p-1 rounded-full hover:bg-black/10 transition-colors"
                        >
                            <ArrowLeft size={20} />
                        </button>
                    )}
                    <h1 className="text-lg font-medium tracking-tight">Settings</h1>
                </div>
            </div>

            {/* 2. SETTINGS LIST CONTENT */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-4 max-w-xl mx-auto w-full">
                {/* Profile Card Summary */}
                <div
                    onClick={() => navigate('/userDetail')}
                    className={`p-3.5 rounded-lg border shadow-xs flex items-center gap-4 cursor-pointer transition-colors ${
                        isDark ? 'bg-[#202c33] border-[#222d34] hover:bg-[#2a3942]' : 'bg-white border-[#e9edef] hover:bg-[#f5f6f6]'
                    }`}
                >
                    <img
                        src={user.profilePicture || 'https://via.placeholder.com/60'}
                        alt={user.username}
                        className="w-16 h-16 rounded-full object-cover shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                        <h2 className="font-semibold text-base truncate">{user.username}</h2>
                        <p className="text-xs text-[#8696a0] truncate mt-0.5">
                            {user.about || 'Hey there! I am using WhatsApp.'}
                        </p>
                    </div>
                    <ChevronRight size={18} className="text-[#8696a0]" />
                </div>

                {/* Group 1: Account & Privacy */}
                <div
                    className={`rounded-lg border shadow-xs overflow-hidden ${
                        isDark ? 'bg-[#202c33] border-[#222d34]' : 'bg-white border-[#e9edef]'
                    }`}
                >
                    <div
                        onClick={() => navigate('/userDetail')}
                        className={`p-3.5 flex items-center justify-between cursor-pointer transition-colors border-b ${
                            isDark ? 'hover:bg-[#182229] border-[#2a3942]' : 'hover:bg-[#f5f6f6] border-[#e9edef]'
                        }`}
                    >
                        <div className="flex items-center gap-3.5">
                            <UserIcon size={18} className="text-[#8696a0]" />
                            <span className="text-sm font-medium">Account</span>
                        </div>
                        <ChevronRight size={16} className="text-[#8696a0]" />
                    </div>

                    <div
                        onClick={() => setView('status-privacy')}
                        className={`p-3.5 flex items-center justify-between cursor-pointer transition-colors ${
                            isDark ? 'hover:bg-[#182229]' : 'hover:bg-[#f5f6f6]'
                        }`}
                    >
                        <div className="flex items-center gap-3.5">
                            <Shield size={18} className="text-[#00a884]" />
                            <div>
                                <span className="text-sm font-medium block">Privacy</span>
                                <span className="text-xs text-[#8696a0]">
                                    Status:{' '}
                                    {user.statusPrivacy?.mode === 'contacts_except'
                                        ? 'My contacts except...'
                                        : user.statusPrivacy?.mode === 'only_share'
                                        ? 'Only share with...'
                                        : 'My contacts'}
                                </span>
                            </div>
                        </div>
                        <ChevronRight size={16} className="text-[#8696a0]" />
                    </div>
                </div>

                {/* Group 2: Chats, Theme & Notifications */}
                <div
                    className={`rounded-lg border shadow-xs overflow-hidden ${
                        isDark ? 'bg-[#202c33] border-[#222d34]' : 'bg-white border-[#e9edef]'
                    }`}
                >
                    {/* Theme Modal Trigger */}
                    <div
                        onClick={() => setShowThemeModal(true)}
                        className={`p-3.5 flex items-center justify-between cursor-pointer transition-colors border-b ${
                            isDark ? 'hover:bg-[#182229] border-[#2a3942]' : 'hover:bg-[#f5f6f6] border-[#e9edef]'
                        }`}
                    >
                        <div className="flex items-center gap-3.5">
                            {isDark ? (
                                <Moon size={18} className="text-[#8696a0]" />
                            ) : (
                                <Sun size={18} className="text-[#8696a0]" />
                            )}
                            <div>
                                <span className="text-sm font-medium block">Theme</span>
                                <span className="text-xs text-[#8696a0] capitalize">{theme}</span>
                            </div>
                        </div>
                        <ChevronRight size={16} className="text-[#8696a0]" />
                    </div>

                    <div
                        onClick={() => toast.info('Chats wallpaper & font size settings')}
                        className={`p-3.5 flex items-center justify-between cursor-pointer transition-colors border-b ${
                            isDark ? 'hover:bg-[#182229] border-[#2a3942]' : 'hover:bg-[#f5f6f6] border-[#e9edef]'
                        }`}
                    >
                        <div className="flex items-center gap-3.5">
                            <MessageSquare size={18} className="text-[#8696a0]" />
                            <span className="text-sm font-medium">Chats</span>
                        </div>
                        <ChevronRight size={16} className="text-[#8696a0]" />
                    </div>

                    <div
                        onClick={() => toast.info('Notifications preferences')}
                        className={`p-3.5 flex items-center justify-between cursor-pointer transition-colors ${
                            isDark ? 'hover:bg-[#182229]' : 'hover:bg-[#f5f6f6]'
                        }`}
                    >
                        <div className="flex items-center gap-3.5">
                            <Bell size={18} className="text-[#8696a0]" />
                            <span className="text-sm font-medium">Notifications</span>
                        </div>
                        <ChevronRight size={16} className="text-[#8696a0]" />
                    </div>
                </div>

                {/* Group 3: Storage & Help */}
                <div
                    className={`rounded-lg border shadow-xs overflow-hidden ${
                        isDark ? 'bg-[#202c33] border-[#222d34]' : 'bg-white border-[#e9edef]'
                    }`}
                >
                    <div
                        onClick={() => toast.info('Storage & network usage')}
                        className={`p-3.5 flex items-center justify-between cursor-pointer transition-colors border-b ${
                            isDark ? 'hover:bg-[#182229] border-[#2a3942]' : 'hover:bg-[#f5f6f6] border-[#e9edef]'
                        }`}
                    >
                        <div className="flex items-center gap-3.5">
                            <HardDrive size={18} className="text-[#8696a0]" />
                            <span className="text-sm font-medium">Storage and data</span>
                        </div>
                        <ChevronRight size={16} className="text-[#8696a0]" />
                    </div>

                    <div
                        onClick={() => toast.info('WhatsApp Help Center & Terms')}
                        className={`p-3.5 flex items-center justify-between cursor-pointer transition-colors ${
                            isDark ? 'hover:bg-[#182229]' : 'hover:bg-[#f5f6f6]'
                        }`}
                    >
                        <div className="flex items-center gap-3.5">
                            <HelpCircle size={18} className="text-[#8696a0]" />
                            <span className="text-sm font-medium">Help</span>
                        </div>
                        <ChevronRight size={16} className="text-[#8696a0]" />
                    </div>
                </div>

                {/* Group 4: Log Out */}
                <div
                    className={`rounded-lg border shadow-xs overflow-hidden ${
                        isDark ? 'bg-[#202c33] border-[#222d34]' : 'bg-white border-[#e9edef]'
                    }`}
                >
                    <button
                        onClick={() => setShowLogoutModal(true)}
                        className={`w-full p-3.5 flex items-center gap-3.5 text-rose-500 font-medium text-sm transition-colors ${
                            isDark ? 'hover:bg-rose-500/10' : 'hover:bg-rose-50'
                        }`}
                    >
                        <LogOut size={18} />
                        <span>Log out</span>
                    </button>
                </div>

                <div className="py-4 text-center text-xs text-[#8696a0] opacity-75">
                    WhatsApp Web • Version 2.24.12
                </div>
            </div>

            {/* Theme Dialog Modal */}
            {showThemeModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
                    <div
                        className={`w-full max-w-sm rounded-lg p-5 shadow-2xl border ${
                            isDark ? 'bg-[#2a3942] border-[#374248] text-[#e9edef]' : 'bg-white border-[#e9edef] text-[#111b21]'
                        }`}
                    >
                        <h3 className="text-base font-bold mb-4">Choose Theme</h3>
                        <div className="space-y-3">
                            <label className="flex items-center justify-between cursor-pointer p-2 rounded hover:bg-black/5 dark:hover:bg-white/5">
                                <span className="text-sm font-medium">Light</span>
                                <input
                                    type="radio"
                                    name="themeSelect"
                                    checked={theme === 'light'}
                                    onChange={() => {
                                        setTheme('light');
                                        document.documentElement.setAttribute('data-theme', 'light');
                                        setShowThemeModal(false);
                                    }}
                                    className="radio radio-primary"
                                />
                            </label>

                            <label className="flex items-center justify-between cursor-pointer p-2 rounded hover:bg-black/5 dark:hover:bg-white/5">
                                <span className="text-sm font-medium">Dark</span>
                                <input
                                    type="radio"
                                    name="themeSelect"
                                    checked={theme === 'dark'}
                                    onChange={() => {
                                        setTheme('dark');
                                        document.documentElement.setAttribute('data-theme', 'dark');
                                        setShowThemeModal(false);
                                    }}
                                    className="radio radio-primary"
                                />
                            </label>
                        </div>

                        <div className="mt-5 flex justify-end">
                            <button
                                onClick={() => setShowThemeModal(false)}
                                className="px-4 py-1.5 rounded text-sm font-semibold text-[#00a884] hover:bg-[#00a884]/10 transition-colors"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Logout Confirmation Dialog Modal */}
            {showLogoutModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
                    <div
                        className={`w-full max-w-sm rounded-lg p-5 shadow-2xl border ${
                            isDark ? 'bg-[#2a3942] border-[#374248] text-[#e9edef]' : 'bg-white border-[#e9edef] text-[#111b21]'
                        }`}
                    >
                        <h3 className="text-base font-bold mb-2">Log out?</h3>
                        <p className="text-xs text-[#8696a0] leading-relaxed mb-6">
                            Are you sure you want to log out of WhatsApp Web?
                        </p>

                        <div className="flex items-center justify-end gap-3">
                            <button
                                onClick={() => setShowLogoutModal(false)}
                                className="px-4 py-1.5 rounded text-xs font-semibold text-[#8696a0] hover:text-inherit transition-colors"
                            >
                                Cancel
                            </button>

                            <button
                                onClick={handleConfirmLogout}
                                className="px-4 py-1.5 rounded bg-rose-500 hover:bg-rose-600 text-white text-xs font-semibold shadow transition-colors"
                            >
                                Log out
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Setting;
