import React from 'react';
import { motion } from 'framer-motion';
import { FaEnvelope, FaPhoneAlt, FaUser, FaCamera, FaArrowLeft, FaShieldAlt } from 'react-icons/fa';
import useuserStore from '../store/useruserStore';
import useThemeStore from '../store/themeStore';

const UserDetail = ({ onBack }) => {
    const { user } = useuserStore();
    const { theme } = useThemeStore();
    const isDark = theme === 'dark';

    if (!user) return null;

    return (
        <div className={`w-full h-full flex flex-col relative overflow-hidden transition-colors duration-500 ${
            isDark ? 'bg-[#0a0f16] text-slate-100' : 'bg-[#f4f7f6] text-slate-800'
        }`}>
            {/* Dynamic Glorious Background Gradients */}
            <div className={`absolute top-[-10%] left-[-10%] w-[120%] h-[50%] blur-[120px] rounded-full pointer-events-none opacity-40 ${
                isDark ? 'bg-gradient-to-br from-teal-900 via-emerald-800 to-[#0a0f16]' : 'bg-gradient-to-br from-teal-200 via-emerald-100 to-transparent'
            }`} />

            {/* Header */}
            <div className={`px-6 py-5 flex items-center z-20 relative ${
                isDark ? 'bg-transparent' : 'bg-transparent'
            }`}>
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
                <h1 className="text-xl font-bold tracking-tight">Profile</h1>
            </div>

            <div className="flex-1 overflow-y-auto pb-10 z-10 custom-scrollbar">
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                    className="max-w-md mx-auto px-4"
                >
                    {/* Hero Section with Cover */}
                    <div className="relative mb-14 mt-4">
                        {/* Abstract Cover Image/Banner */}
                        <div className={`h-32 w-full rounded-3xl overflow-hidden shadow-2xl relative ${
                            isDark ? 'shadow-teal-900/20' : 'shadow-teal-500/10'
                        }`}>
                            <div className={`absolute inset-0 opacity-80 ${
                                isDark 
                                    ? 'bg-gradient-to-r from-teal-600 to-emerald-500' 
                                    : 'bg-gradient-to-r from-teal-400 to-emerald-300'
                            }`} />
                            {/* Decorative patterns inside cover */}
                            <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(circle at 20% 50%, rgba(255,255,255,0.1) 0%, transparent 50%), radial-gradient(circle at 80% 80%, rgba(255,255,255,0.15) 0%, transparent 50%)' }} />
                        </div>

                        {/* Avatar */}
                        <div className="absolute -bottom-12 left-1/2 -translate-x-1/2 flex flex-col items-center">
                            <div className="relative group cursor-pointer">
                                <motion.div 
                                    whileHover={{ scale: 1.05 }}
                                    transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                                    className={`w-28 h-28 rounded-full overflow-hidden p-1 shadow-2xl ${
                                        isDark ? 'bg-[#0a0f16] shadow-black/50' : 'bg-[#f4f7f6] shadow-teal-500/20'
                                    }`}
                                >
                                    <div className="w-full h-full rounded-full overflow-hidden relative">
                                        <img
                                            src={user.profilePicture || "https://via.placeholder.com/150"}
                                            alt={user.username}
                                            className="w-full h-full object-cover"
                                        />
                                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 backdrop-blur-sm">
                                            <FaCamera className="text-white text-2xl drop-shadow-md" />
                                        </div>
                                    </div>
                                </motion.div>
                                {user.isOnline && (
                                    <div className={`absolute bottom-1 right-2 w-5 h-5 rounded-full border-[3px] bg-emerald-500 shadow-lg shadow-emerald-500/40 ${
                                        isDark ? 'border-[#0a0f16]' : 'border-[#f4f7f6]'
                                    }`} />
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Name & Status */}
                    <div className="text-center mb-10">
                        <h2 className={`text-3xl font-extrabold tracking-tight mb-2 ${
                            isDark ? 'text-white' : 'text-slate-900'
                        }`}>
                            {user.username}
                        </h2>
                        <div className="flex items-center justify-center gap-2">
                            <span className="relative flex h-2.5 w-2.5">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                            </span>
                            <span className={`text-sm font-semibold tracking-wide ${
                                isDark ? 'text-emerald-400' : 'text-emerald-600'
                            }`}>
                                Online & Secure
                            </span>
                        </div>
                    </div>

                    {/* Details Cards */}
                    <div className="space-y-3 relative">
                        {/* Subtle glow behind cards in dark mode */}
                        {isDark && (
                            <div className="absolute inset-0 bg-teal-500/5 blur-[80px] rounded-full pointer-events-none" />
                        )}

                        <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.2, duration: 0.4 }}
                            className={`relative p-5 rounded-3xl flex items-center gap-5 transition-all duration-300 group overflow-hidden ${
                                isDark 
                                    ? 'bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 shadow-xl backdrop-blur-xl' 
                                    : 'bg-white border border-white hover:border-teal-100 shadow-xl shadow-slate-200/50 hover:shadow-teal-100/50'
                            }`}
                        >
                            <div className={`absolute top-0 left-0 w-1 h-full transition-all duration-300 ${
                                isDark ? 'bg-teal-500/50 group-hover:bg-teal-400' : 'bg-teal-400 group-hover:bg-teal-500'
                            }`} />
                            <div className={`p-3.5 rounded-2xl transition-colors duration-300 ${
                                isDark ? 'bg-teal-500/10 text-teal-400 group-hover:bg-teal-500/20 group-hover:text-teal-300' : 'bg-teal-50 text-teal-500 group-hover:bg-teal-100'
                            }`}>
                                <FaUser size={20} />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className={`text-[10px] font-extrabold uppercase tracking-widest mb-1 ${
                                    isDark ? 'text-slate-500' : 'text-slate-400'
                                }`}>Display Name</p>
                                <p className={`font-bold truncate text-[16px] ${
                                    isDark ? 'text-slate-200' : 'text-slate-700'
                                }`}>{user.username}</p>
                            </div>
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.3, duration: 0.4 }}
                            className={`relative p-5 rounded-3xl flex items-center gap-5 transition-all duration-300 group overflow-hidden ${
                                isDark 
                                    ? 'bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 shadow-xl backdrop-blur-xl' 
                                    : 'bg-white border border-white hover:border-blue-100 shadow-xl shadow-slate-200/50 hover:shadow-blue-100/50'
                            }`}
                        >
                            <div className={`absolute top-0 left-0 w-1 h-full transition-all duration-300 ${
                                isDark ? 'bg-blue-500/50 group-hover:bg-blue-400' : 'bg-blue-400 group-hover:bg-blue-500'
                            }`} />
                            <div className={`p-3.5 rounded-2xl transition-colors duration-300 ${
                                isDark ? 'bg-blue-500/10 text-blue-400 group-hover:bg-blue-500/20 group-hover:text-blue-300' : 'bg-blue-50 text-blue-500 group-hover:bg-blue-100'
                            }`}>
                                <FaEnvelope size={20} />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className={`text-[10px] font-extrabold uppercase tracking-widest mb-1 ${
                                    isDark ? 'text-slate-500' : 'text-slate-400'
                                }`}>Email Address</p>
                                <p className={`font-bold truncate text-[16px] ${
                                    isDark ? 'text-slate-200' : 'text-slate-700'
                                }`}>{user.email || 'Private'}</p>
                            </div>
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.4, duration: 0.4 }}
                            className={`relative p-5 rounded-3xl flex items-center gap-5 transition-all duration-300 group overflow-hidden ${
                                isDark 
                                    ? 'bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 shadow-xl backdrop-blur-xl' 
                                    : 'bg-white border border-white hover:border-emerald-100 shadow-xl shadow-slate-200/50 hover:shadow-emerald-100/50'
                            }`}
                        >
                            <div className={`absolute top-0 left-0 w-1 h-full transition-all duration-300 ${
                                isDark ? 'bg-emerald-500/50 group-hover:bg-emerald-400' : 'bg-emerald-400 group-hover:bg-emerald-500'
                            }`} />
                            <div className={`p-3.5 rounded-2xl transition-colors duration-300 ${
                                isDark ? 'bg-emerald-500/10 text-emerald-400 group-hover:bg-emerald-500/20 group-hover:text-emerald-300' : 'bg-emerald-50 text-emerald-500 group-hover:bg-emerald-100'
                            }`}>
                                <FaPhoneAlt size={20} />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className={`text-[10px] font-extrabold uppercase tracking-widest mb-1 ${
                                    isDark ? 'text-slate-500' : 'text-slate-400'
                                }`}>Phone Number</p>
                                <p className={`font-bold truncate text-[16px] ${
                                    isDark ? 'text-slate-200' : 'text-slate-700'
                                }`}>{user.phoneNumber || 'Not linked'}</p>
                            </div>
                        </motion.div>

                        {/* Security Badge */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.6, duration: 0.4 }}
                            className="mt-8 flex items-center justify-center gap-2 opacity-60"
                        >
                            <FaShieldAlt className={isDark ? "text-slate-400" : "text-slate-400"} size={14} />
                            <span className={`text-xs font-semibold ${isDark ? "text-slate-400" : "text-slate-500"}`}>Your data is securely encrypted</span>
                        </motion.div>
                    </div>
                </motion.div>
            </div>
        </div>
    );
};

export default UserDetail;