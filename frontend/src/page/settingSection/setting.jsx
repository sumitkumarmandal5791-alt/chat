import React from 'react';
import { motion } from 'framer-motion';
import { FaMoon, FaSun, FaBell, FaLock, FaUserCircle, FaSignOutAlt, FaChevronRight, FaArrowLeft } from 'react-icons/fa';
import useuserStore from '../../store/useruserStore';
import useThemeStore from '../../store/themeStore';
import { useNavigate } from 'react-router-dom';

const Setting = ({ onBack }) => {
    const { user, clearuser } = useuserStore();
    const { theme, setTheme } = useThemeStore();
    const navigate = useNavigate();
    
    const isDark = theme === 'dark';

    const toggleTheme = () => {
        setTheme(isDark ? 'light' : 'dark');
    };

    const handleLogout = () => {
        clearuser();
        navigate('/login');
    };

    if (!user) return null;

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: { staggerChildren: 0.1 }
        }
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } }
    };

    return (
        <div className={`w-full h-full flex flex-col relative overflow-hidden transition-colors duration-500 ${
            isDark ? 'bg-[#0a0f16] text-slate-100' : 'bg-[#f4f7f6] text-slate-800'
        }`}>
            {/* Dynamic Background Gradients */}
            <div className={`absolute top-[-10%] right-[-10%] w-[100%] h-[50%] blur-[120px] rounded-full pointer-events-none opacity-30 ${
                isDark ? 'bg-gradient-to-bl from-blue-900 via-indigo-800 to-transparent' : 'bg-gradient-to-bl from-blue-200 via-indigo-100 to-transparent'
            }`} />

            {/* Header */}
            <div className="px-6 py-5 flex items-center z-20 relative bg-transparent">
                {onBack && (
                    <button
                        onClick={onBack}
                        className={`p-3 mr-4 rounded-full backdrop-blur-md shadow-sm transition-all duration-300 ${
                            isDark 
                                ? 'bg-white/10 text-slate-300 hover:bg-white/20 hover:text-white border border-white/5' 
                                : 'bg-white/60 text-slate-600 hover:bg-white hover:text-slate-900 border border-black/5'
                        }`}
                    >
                        <FaArrowLeft size={16} />
                    </button>
                )}
                <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
            </div>

            <div className="flex-1 overflow-y-auto px-4 pb-10 z-10 custom-scrollbar">
                <motion.div
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                    className="max-w-md mx-auto space-y-6 mt-4"
                >
                    {/* User Mini Profile */}
                    <motion.div 
                        variants={itemVariants}
                        className={`p-4 rounded-3xl flex items-center gap-4 transition-all duration-300 ${
                            isDark 
                                ? 'bg-white/5 border border-white/10 backdrop-blur-xl' 
                                : 'bg-white border border-white shadow-xl shadow-slate-200/50'
                        }`}
                    >
                        <div className="w-16 h-16 rounded-full overflow-hidden ring-2 ring-indigo-500/30">
                            <img src={user.profilePicture || "https://via.placeholder.com/150"} alt="Profile" className="w-full h-full object-cover" />
                        </div>
                        <div className="flex-1">
                            <h3 className="font-bold text-lg">{user.username}</h3>
                            <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{user.email || 'Free Account'}</p>
                        </div>
                    </motion.div>

                    {/* Preferences Section */}
                    <motion.div variants={itemVariants}>
                        <h4 className={`text-xs font-bold uppercase tracking-widest mb-3 px-2 ${
                            isDark ? 'text-slate-500' : 'text-slate-400'
                        }`}>Preferences</h4>
                        <div className={`rounded-3xl overflow-hidden transition-all duration-300 ${
                            isDark ? 'bg-white/5 border border-white/10 backdrop-blur-xl' : 'bg-white border border-white shadow-lg shadow-slate-200/30'
                        }`}>
                            {/* Theme Toggle */}
                            <div className={`p-4 flex items-center justify-between border-b ${isDark ? 'border-white/5' : 'border-slate-100'}`}>
                                <div className="flex items-center gap-4">
                                    <div className={`p-2.5 rounded-xl ${isDark ? 'bg-indigo-500/10 text-indigo-400' : 'bg-indigo-50 text-indigo-500'}`}>
                                        {isDark ? <FaMoon size={18} /> : <FaSun size={18} />}
                                    </div>
                                    <span className="font-semibold">Dark Mode</span>
                                </div>
                                <button
                                    onClick={toggleTheme}
                                    className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors duration-300 ${
                                        isDark ? 'bg-indigo-500' : 'bg-slate-300'
                                    }`}
                                >
                                    <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform duration-300 ${
                                        isDark ? 'translate-x-6' : 'translate-x-1'
                                    }`} />
                                </button>
                            </div>

                            {/* Notifications */}
                            <div className="p-4 flex items-center justify-between cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                                <div className="flex items-center gap-4">
                                    <div className={`p-2.5 rounded-xl ${isDark ? 'bg-amber-500/10 text-amber-400' : 'bg-amber-50 text-amber-500'}`}>
                                        <FaBell size={18} />
                                    </div>
                                    <span className="font-semibold">Notifications</span>
                                </div>
                                <FaChevronRight className={isDark ? 'text-slate-600' : 'text-slate-400'} size={14} />
                            </div>
                        </div>
                    </motion.div>

                    {/* Account Section */}
                    <motion.div variants={itemVariants}>
                        <h4 className={`text-xs font-bold uppercase tracking-widest mb-3 px-2 ${
                            isDark ? 'text-slate-500' : 'text-slate-400'
                        }`}>Account</h4>
                        <div className={`rounded-3xl overflow-hidden transition-all duration-300 ${
                            isDark ? 'bg-white/5 border border-white/10 backdrop-blur-xl' : 'bg-white border border-white shadow-lg shadow-slate-200/30'
                        }`}>
                            <div className={`p-4 flex items-center justify-between border-b cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 transition-colors ${isDark ? 'border-white/5' : 'border-slate-100'}`}>
                                <div className="flex items-center gap-4">
                                    <div className={`p-2.5 rounded-xl ${isDark ? 'bg-teal-500/10 text-teal-400' : 'bg-teal-50 text-teal-500'}`}>
                                        <FaUserCircle size={18} />
                                    </div>
                                    <span className="font-semibold">Account Details</span>
                                </div>
                                <FaChevronRight className={isDark ? 'text-slate-600' : 'text-slate-400'} size={14} />
                            </div>
                            
                            <div className="p-4 flex items-center justify-between cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                                <div className="flex items-center gap-4">
                                    <div className={`p-2.5 rounded-xl ${isDark ? 'bg-emerald-500/10 text-emerald-400' : 'bg-emerald-50 text-emerald-500'}`}>
                                        <FaLock size={18} />
                                    </div>
                                    <span className="font-semibold">Privacy & Security</span>
                                </div>
                                <FaChevronRight className={isDark ? 'text-slate-600' : 'text-slate-400'} size={14} />
                            </div>
                        </div>
                    </motion.div>

                    {/* Logout Button */}
                    <motion.div variants={itemVariants} className="pt-4">
                        <button
                            onClick={handleLogout}
                            className={`w-full p-4 rounded-2xl flex items-center justify-center gap-3 font-bold transition-all duration-300 shadow-lg ${
                                isDark 
                                    ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20 hover:bg-rose-500/20' 
                                    : 'bg-rose-50 text-rose-500 border border-rose-100 hover:bg-rose-100'
                            }`}
                        >
                            <FaSignOutAlt size={18} />
                            Log Out
                        </button>
                    </motion.div>

                    <motion.div variants={itemVariants} className="text-center pt-8 opacity-50">
                        <p className="text-xs font-semibold tracking-wider">APP VERSION 1.0.0</p>
                    </motion.div>

                </motion.div>
            </div>
        </div>
    );
};

export default Setting;